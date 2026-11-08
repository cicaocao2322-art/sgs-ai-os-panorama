#!/usr/bin/env node
/**
 * AIOS 全景 MCP server（stdio，零依赖）
 *
 * 工具：
 *   panorama_overview  —— 全景概览（数据截至、KPI、六层、同步率、参谋计数、期报数）
 *   panorama_search    —— 在全景 JSON 里按关键词检索（层/六层目标/参谋/期报）
 *   report_latest      —— 最近期报列表（日期 + 标题 + 公开页地址）
 *
 * 数据源优先级：AIOS_PANORAMA_JSON 环境变量 → 本机最近一期 data/aios_panorama_*.json → 公开 aios.json
 * 只读；不含凭据；不写任何文件。
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const readline = require('node:readline')

const VERSION = '0.1.0'
const DEFAULT_ROOT = '/Users/william/Nutstore Files/0.0 Project总控'
const AIOS_REL = 'WORKCENTER/P0/03_iteration/AI-NATIVE-ARCH-001_公司AI原生运行架构/AIOS全景_20261102'
const PUBLIC_BASE = 'https://cicaocao2322-art.github.io/sgs-ai-os-panorama'
const PUBLIC_JSON = PUBLIC_BASE + '/aios.json'

function latestLocalJson() {
  const root = process.env.AIOS_PROJECT_ROOT || DEFAULT_ROOT
  const dir = path.join(root, AIOS_REL, 'data')
  try {
    const names = fs.readdirSync(dir).filter((n) => /^aios_panorama_\d{8}\.json$/.test(n)).sort()
    if (names.length) return path.join(dir, names[names.length - 1])
  } catch { /* ignore */ }
  return null
}

function httpsJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'aios-panorama-mcp/0.1' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return }
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (d) => { body += d })
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}

async function loadPanorama() {
  const explicit = process.env.AIOS_PANORAMA_JSON
  if (explicit && fs.existsSync(explicit)) return { source: explicit, data: JSON.parse(fs.readFileSync(explicit, 'utf8')) }
  const local = latestLocalJson()
  if (local) return { source: local, data: JSON.parse(fs.readFileSync(local, 'utf8')) }
  const data = await httpsJson(PUBLIC_JSON)
  return { source: PUBLIC_JSON, data }
}

function num(v, d = 0) { return typeof v === 'number' && Number.isFinite(v) ? v : d }

function overview(d, source) {
  const h = d.headline || {}
  const kpi = d.kpi || {}
  const layers = (d.layers || []).map((l) => ({
    id: l.id, name: l.name, inUse: num(l.inUse), registered: num(l.registered),
    tested: num(l.tested), kpiOk: num(l.kpiOk), kpiTotal: num(l.kpiTotal), lag: num(l.lag),
  }))
  return {
    title: 'SGS AI OS 全景',
    asOf: d.asOf, generatedAt: d.generatedAt, source, publicPage: PUBLIC_BASE + '/',
    headline: h, kpi, layers,
    sync: d.sync || [],
    advisor: d.advisor ? { pending: num(d.advisor.pending), overdue: num(d.advisor.overdue), suggestions: num(d.advisor.suggestions), doneA: num(d.advisor.doneA), top: d.advisor.top || [] } : {},
    reports: d.reports || { count: 0, items: [] },
  }
}

function search(rows, q) {
  const kw = String(q || '').toLowerCase()
  if (!kw) return []
  const out = []
  for (const row of rows) {
    const text = JSON.stringify(row).toLowerCase()
    if (text.includes(kw)) out.push(row)
    if (out.length >= 20) break
  }
  return out
}

async function callTool(name, args) {
  const { data, source } = await loadPanorama()
  if (name === 'panorama_overview') {
    return overview(data, source)
  }
  if (name === 'panorama_search') {
    const kw = String((args && args.query) || '').trim()
    const rows = []
    for (const l of data.layers || []) rows.push({ kind: 'layer', ...l })
    for (const [lid, g] of Object.entries(data.goals || {})) {
      for (const grp of g.groups || []) rows.push({ kind: 'goal', layer: lid, ...grp })
    }
    for (const p of (data.advisor && data.advisor.top) || []) rows.push({ kind: 'advisor', ...p })
    for (const it of (data.reports && data.reports.items) || []) rows.push({ kind: 'report', ...it })
    return { query: kw, matches: search(rows, kw) }
  }
  if (name === 'report_latest') {
    const items = (data.reports && data.reports.items) || []
    const limit = Math.max(1, Math.min(10, Number((args && args.limit) || 6)))
    return { asOf: data.asOf, publicReportsPage: PUBLIC_BASE + '/', items: items.slice(0, limit) }
  }
  throw new Error('unknown tool: ' + name)
}

const TOOLS = [
  {
    name: 'panorama_overview',
    description: 'SGS AI OS 全景概览：数据截至、KPI（模块/业务链/六层 KPI/守护/同步率）、六层、参谋计数与前 5 条待决、期报数。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'panorama_search',
    description: '在全景数据中按关键词检索：层、六层目标组、参谋待决、期报（返回最多 20 条）。',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: '关键词，如 D1 / Harness / C20 / 库存管理' } }, required: ['query'], additionalProperties: false },
  },
  {
    name: 'report_latest',
    description: '最近几期期报：日期、标题、公开页地址（默认 6 期）。',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: '返回条数 1–10，默认 6' } }, additionalProperties: false },
  },
]

function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n') }

function reply(id, result) { send({ jsonrpc: '2.0', id, result }) }
function fail(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }) }

async function handle(msg) {
  const { id, method, params } = msg || {}
  if (method === undefined) return
  if (id === undefined) return // notification
  try {
    if (method === 'initialize') {
      return reply(id, {
        protocolVersion: (params && params.protocolVersion) || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'aios-panorama', version: VERSION },
      })
    }
    if (method === 'ping') return reply(id, {})
    if (method === 'tools/list') return reply(id, { tools: TOOLS })
    if (method === 'tools/call') {
      const name = params && params.name
      const args = (params && params.arguments) || {}
      const result = await callTool(name, args)
      return reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 1) }], isError: false })
    }
    if (method === 'resources/list') return reply(id, { resources: [] })
    return fail(id, -32601, 'method not found: ' + method)
  } catch (e) {
    return fail(id, -32603, String((e && e.message) || e))
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })
rl.on('line', (line) => {
  if (!line.trim()) return
  let msg
  try { msg = JSON.parse(line) } catch { return }
  handle(msg).catch((e) => { try { fail(msg && msg.id, -32603, String((e && e.message) || e)) } catch { /* ignore */ } })
})
