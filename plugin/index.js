/**
 * AIOS 全景 · Host half（@sgs/dsh-bundle-panorama v0.1）
 *
 * 只读：扫描 Project总控 的最新全景数据，产出 `GET /panorama/snapshot` JSON。
 * 每条请求先过 connection.requestRejection（与官方 open-in-app 同一信任围栏）；
 * 不写项目文件、不联网、不调业务系统。
 */
import { promises as fsp } from 'node:fs'
import path from 'node:path'

const VERSION = '0.1.0'
const ROUTE = '/panorama/snapshot'
const DEFAULT_ROOT = '/Users/william/Nutstore Files/0.0 Project总控'
const AIOS_REL = 'WORKCENTER/P0/03_iteration/AI-NATIVE-ARCH-001_公司AI原生运行架构/AIOS全景_20261102'
const ARTIFACT_URL = 'https://claude.ai/artifact/NukpSov3EcChAJ8iWv7EU5'
const CACHE_TTL_MS = 30_000

const settings = { projectRoot: process.env.SGS_PROJECT_ROOT || DEFAULT_ROOT }
let cache = { at: 0, value: null }

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

async function readJson(file) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'))
  } catch {
    return null
  }
}

function num(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function pickValue(headline, key) {
  const hit = headline && headline[key]
  return hit && hit.value !== undefined ? hit.value : null
}

function latestPanorama(files) {
  const hits = (files || []).filter((name) => /^aios_panorama_\d{8}\.json$/.test(name)).sort()
  return hits.length ? hits[hits.length - 1] : null
}

function layerName(layers, id) {
  const hit = (layers || []).find((layer) => layer && layer.id === id)
  return hit && hit.name ? hit.name : id
}

/** 纯函数：把全景 JSON + 期报索引压成面板需要的只读摘要（便于单测）。 */
export function buildSnapshot(D, reportIndex, meta) {
  const headline = (D && D.headline) || {}
  const modules = pickValue(headline, 'modules') || {}
  const goals = (D && D.goals) || {}
  const layersIn = {}
  for (const layer of (D && D.layers) || []) {
    if (layer && layer.id) layersIn[layer.id] = layer
  }
  const layers = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((lid) => {
    const G = goals[lid] || {}
    const kpis = Array.isArray(G.kpis) ? G.kpis : []
    const groups = Array.isArray(G.groups) ? G.groups : []
    const counts = (layersIn[lid] && layersIn[lid].counts && layersIn[lid].counts.value) || {}
    return {
      id: lid,
      name: layerName(D && D.layers, lid),
      inUse: num(counts.in_use),
      registered: num(counts.registered),
      tested: num(counts.tested),
      kpiOk: kpis.filter((k) => k && k.status === '达标').length,
      kpiTotal: kpis.length,
      lag: groups.filter((g) => g && g.status === '落后').length,
    }
  })
  const kpi = layers.reduce((acc, row) => ({ ok: acc.ok + row.kpiOk, total: acc.total + row.kpiTotal }), { ok: 0, total: 0 })
  const sync = ((D && D.sync && D.sync.clients) || []).map((c) => ({ name: c.name, composite: num(c.composite) }))
  const advisor = (D && D.advisor) || {}
  const counts = advisor.counts || {}
  const top = Array.isArray(advisor.pending) ? advisor.pending.slice(0, 5).map((p) => ({
    key: p.key || '', dim: p.dim || '', item: p.item || '', due: p.due || '', overdueDays: num(p.overdue_days),
  })) : []
  const items = (reportIndex && Array.isArray(reportIndex.items)) ? reportIndex.items.slice(0, 6).map((it) => ({
    date: it.date || '', title: it.title || '', path: it.path || '',
  })) : []
  return {
    ready: true,
    version: VERSION,
    artifactUrl: ARTIFACT_URL,
    schema: (D && D.schema) || '',
    asOf: (D && D.as_of) || '',
    generatedAt: (D && D.generated_at) || '',
    source: (meta && meta.source) || '',
    sourcePath: (meta && meta.sourcePath) || '',
    pageBytes: num(meta && meta.pageBytes),
    headline: {
      modules: { inUse: num(modules.in_use), tested: num(modules.tested), registered: num(modules.registered) },
      gate: num(pickValue(headline, 'gate')),
      chains: num(pickValue(headline, 'chains')),
      guardsFail: num(pickValue(headline, 'guards_fail')),
      guardsUntested: num(pickValue(headline, 'guards_untested')),
      overdue: num(pickValue(headline, 'overdue')),
    },
    kpi,
    layers,
    sync,
    advisor: {
      pending: num(counts.pending), overdue: num(counts.overdue), suggestions: num(counts.suggestions),
      doneA: num(counts.done_a), others: num(counts.others), top,
    },
    reports: { count: (reportIndex && Array.isArray(reportIndex.items)) ? reportIndex.items.length : 0, items },
    scannedAt: new Date().toISOString(),
  }
}

/** 只读扫描：找最新一期全景 JSON、期报索引、页面体积。 */
export async function scan(root) {
  const aios = path.join(root, AIOS_REL)
  const dataDir = path.join(aios, 'data')
  let names = []
  try {
    names = await fsp.readdir(dataDir)
  } catch {
    return { ok: false, error: '找不到全景数据目录', root, aiosRel: AIOS_REL }
  }
  const file = latestPanorama(names)
  if (!file) return { ok: false, error: '还没有 aios_panorama_*.json', root, aiosRel: AIOS_REL }
  const D = await readJson(path.join(dataDir, file))
  if (!D) return { ok: false, error: `全景 JSON 解析失败：${file}`, root, aiosRel: AIOS_REL }
  const reportIndex = await readJson(path.join(dataDir, 'reports_index.json'))
  let pageBytes = 0
  try {
    pageBytes = (await fsp.stat(path.join(aios, 'page', 'aios_panorama.html'))).size
  } catch {
    pageBytes = 0
  }
  return Object.assign(
    { ok: true },
    buildSnapshot(D, reportIndex, { source: file, sourcePath: `${AIOS_REL}/data/${file}`, pageBytes }),
  )
}

export function makeHandlers(deps) {
  const snapshot = async (req, res) => {
    const rejection = deps.rejection(req)
    if (rejection !== undefined) {
      res.statusCode = rejection
      res.end()
      return
    }
    try {
      if (cache.value && Date.now() - cache.at < CACHE_TTL_MS) {
        sendJson(res, 200, Object.assign({}, cache.value, { cached: true }))
        return
      }
      const value = await scan(deps.root)
      if (value.ok) cache = { at: Date.now(), value }
      sendJson(res, value.ok ? 200 : 503, value)
    } catch (error) {
      sendJson(res, 200, { ok: false, error: String((error && error.message) || error) })
    }
  }
  return { snapshot }
}

export function apply(ctx, config) {
  if (config && typeof config === 'object' && typeof config.projectRoot === 'string' && config.projectRoot.trim() !== '') {
    settings.projectRoot = config.projectRoot.trim()
  }
  ctx.inject(['webServer', 'connection'], (scope) => {
    const handlers = makeHandlers({
      root: settings.projectRoot,
      rejection: (req) => scope.connection.requestRejection(req),
    })
    let dispose
    try {
      dispose = scope.webServer.register({ kind: 'exact', path: ROUTE, handler: handlers.snapshot })
    } catch (error) {
      console.warn(`[panorama] route registration failed: ${String((error && error.message) || error)}`)
      return undefined
    }
    return () => {
      try {
        dispose()
      } catch {
        /* already gone */
      }
    }
  }, 'panorama: route')
}

export { ROUTE, VERSION }
