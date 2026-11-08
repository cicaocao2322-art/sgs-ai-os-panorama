/**
 * AIOS 全景 · Browser half（@sgs/dsh-bundle-panorama v0.1）
 *
 * 侧栏一级入口 + 主面板。数据来自 Host half 注册的 `GET /panorama/snapshot`（只读）。
 * 写操作（批注 / 委派 / 采纳）不在插件内做：按钮统一跳 Artifact 原页。
 */
window.__ModuleLoader__.load({
  id: '@sgs/dsh-bundle-panorama',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback } = React

    const NS = 'panorama'
    const PANEL_ID = 'panorama'
    const ROUTE = '/panorama/snapshot'
    const POLL_MS = 60_000
    const VERSION = '0.1.0'

    const CSS = `
.pn-root{box-sizing:border-box;height:100%;overflow:auto;padding:calc(var(--dsh-frame-top-clearance,0px) + 18px) 22px 28px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.pn-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.pn-title{font-size:18px;font-weight:700;margin:0;letter-spacing:.2px}
.pn-sub{font-size:12px;color:var(--dsw-alias-label-secondary)}
.pn-actions{display:flex;gap:8px;align-items:center;margin-left:auto}
.pn-btn{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer}
.pn-btn:disabled{opacity:.6;cursor:default}
.pn-btn-primary{border-color:var(--dsw-alias-state-info-primary);color:var(--dsw-alias-state-info-primary)}
.pn-meta{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:11px;color:var(--dsw-alias-label-secondary);margin:6px 0 14px;line-height:1.6}
.pn-meta code{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.pn-warn{padding:9px 12px;border:1px solid var(--dsw-alias-state-warn-primary);border-radius:8px;font-size:12px;color:var(--dsw-alias-state-warn-primary);margin-bottom:12px;line-height:1.6}
.pn-empty{font-size:12px;color:var(--dsw-alias-label-secondary);padding:14px 2px}
.pn-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.pn-kpi{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px}
.pn-kpi-label{font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:6px}
.pn-kpi-value{font-size:20px;font-weight:700;line-height:1.1}
.pn-kpi-note{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-top:4px}
.pn-card{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:12px 14px;margin-bottom:12px}
.pn-card h3{font-size:13px;font-weight:700;margin:0 0 8px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pn-card h3 .pn-dim{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.pn-row{display:flex;align-items:center;gap:10px;padding:5px 0;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px}
.pn-row:first-of-type{border-top:0}
.pn-layer{width:34px;flex:0 0 34px;font-weight:700;color:var(--dsw-alias-state-info-primary)}
.pn-grow{flex:1;min-width:0}
.pn-sub2{font-size:11px;color:var(--dsw-alias-label-secondary)}
.pn-badge{font-size:10.5px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.pn-badge-warn{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary)}
.pn-badge-bad{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.pn-item{padding:6px 0;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px;line-height:1.55}
.pn-item:first-of-type{border-top:0}
.pn-item-key{font-weight:600;margin-right:6px}
.pn-foot{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-top:16px;line-height:1.7}
`

    const zh = {
      'panel.title': 'AI OS 全景',
      'panel.subtitle': '六层目标 · 参谋待决 · 期报',
      'actions.refresh': '刷新',
      'actions.open': '打开原页',
      'state.loading': '正在读取全景数据…',
      'state.error': '读取失败：',
      'meta.asOf': '数据截至',
      'meta.generated': '生成',
      'meta.source': '来源',
      'kpi.modules': '模块 在用 / 登记',
      'kpi.modulesNote': '已实测 {tested}',
      'kpi.gate': '业务链过门',
      'kpi.kpi': '六层 KPI 达标',
      'kpi.guards': '守护 未达标 / 未测',
      'kpi.sync': '同步率',
      'layers.title': '六层',
      'layers.row': '在用 {inUse} / 登记 {registered}',
      'layers.kpi': 'KPI {ok}/{total}',
      'layers.lag': '落后 {n} 组',
      'layers.ok': '无落后',
      'advisor.title': '参谋：待你决定',
      'advisor.summary': '待决 {pending} 条（逾期 {overdue}）· 建议 {suggestions} 条 · A 级已做 {doneA}',
      'advisor.none': '当前没有待决事项。',
      'advisor.empty': '本期无此数据。',
      'advisor.due': '截止 {due}',
      'advisor.overdue': '逾期 {days} 天',
      'advisor.note': '决定请在 Artifact 原页或任务中心处理；面板只读。',
      'reports.title': '期报',
      'reports.summary': '共 {count} 期',
      'reports.none': '还没有期报。',
      'footer.note': '只读视图：不修改项目文件；数字以全景 JSON 为准，写操作请打开原页。',
      'footer.version': '插件 v{version}',
      'error.network': '无法连接宿主数据服务（面板需在 Web UI 内打开）',
    }

    const en = {
      'panel.title': 'AI OS panorama',
      'panel.subtitle': 'Six layers · advisor decisions · reports',
      'actions.refresh': 'Refresh',
      'actions.open': 'Open page',
      'state.loading': 'Reading panorama data…',
      'state.error': 'Failed to read: ',
      'meta.asOf': 'Data as of',
      'meta.generated': 'Generated',
      'meta.source': 'Source',
      'kpi.modules': 'Modules in use / registered',
      'kpi.modulesNote': '{tested} tested',
      'kpi.gate': 'Chains passed',
      'kpi.kpi': 'Six-layer KPIs met',
      'kpi.guards': 'Guards failed / untested',
      'kpi.sync': 'Sync rate',
      'layers.title': 'Six layers',
      'layers.row': '{inUse} in use / {registered} registered',
      'layers.kpi': 'KPI {ok}/{total}',
      'layers.lag': '{n} groups behind',
      'layers.ok': 'none behind',
      'advisor.title': 'Advisor: awaiting your decision',
      'advisor.summary': '{pending} pending ({overdue} overdue) · {suggestions} suggestions · {doneA} A-level done',
      'advisor.none': 'No pending decisions.',
      'advisor.empty': 'No data for this period.',
      'advisor.due': 'due {due}',
      'advisor.overdue': '{days}d overdue',
      'advisor.note': 'Decide on the original Artifact page or in the task center; this panel is read-only.',
      'reports.title': 'Period reports',
      'reports.summary': '{count} issues',
      'reports.none': 'No reports yet.',
      'footer.note': 'Read-only view: no project files are modified; numbers follow the panorama JSON, write actions open the original page.',
      'footer.version': 'plugin v{version}',
      'error.network': 'Cannot reach the host data service (open this panel inside the Web UI)',
    }

    function makeTranslator(ctx) {
      let translate
      try {
        translate = ctx.locale.bind(NS)
      } catch {
        translate = (key) => key
      }
      return (key, vars) => {
        let text
        try {
          text = translate(key)
        } catch {
          text = key
        }
        if (typeof text !== 'string') text = key
        if (vars === undefined) return text
        return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])))
      }
    }

    function useSnapshot() {
      const [state, setState] = useState({ status: 'loading', value: null, error: '' })
      const load = useCallback(async (manual) => {
        setState((prev) => ({ ...prev, status: prev.value ? 'refreshing' : 'loading' }))
        try {
          const res = await fetch(ROUTE, { cache: 'no-store' })
          const data = await res.json()
          if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || `HTTP ${res.status}`)
          setState({ status: 'ready', value: data, error: '' })
        } catch (error) {
          setState((prev) => ({ ...prev, status: 'error', error: String((error && error.message) || error) }))
        }
      }, [])
      useEffect(() => {
        let alive = true
        const run = () => {
          if (alive) load(false)
        }
        run()
        const timer = setInterval(run, POLL_MS)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [load])
      return [state, load]
    }

    function makeIcon() {
      return function PanoramaIcon() {
        return h(
          'svg',
          { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': 'true', style: { display: 'block' } },
          h('rect', { x: 2.5, y: 3.5, width: 19, height: 17, rx: 4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
          h('path', { d: 'M6 8.2h12M6 11.6h12M6 15h9', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('circle', { cx: 18, cy: 15, r: 1.5, fill: 'currentColor' }),
        )
      }
    }

    function KpiCard(props) {
      return h(
        'div',
        { className: 'pn-kpi' },
        h('div', { className: 'pn-kpi-label' }, props.label),
        h('div', { className: 'pn-kpi-value' }, props.value),
        props.note ? h('div', { className: 'pn-kpi-note' }, props.note) : null,
      )
    }

    function makePage(ctx) {
      const t = makeTranslator(ctx)

      return function PanoramaPage() {
        const [state, load] = useSnapshot()
        const value = state.value
        const ready = value !== null && typeof value === 'object'
        const generated = ready && value.generatedAt ? new Date(value.generatedAt).toLocaleString('zh-CN') : '—'
        const scanTime = ready && value.scannedAt ? new Date(value.scannedAt).toLocaleTimeString('zh-CN') : '—'

        const openPage = () => {
          const url = (ready && value.artifactUrl) || 'https://claude.ai/artifact/NukpSov3EcChAJ8iWv7EU5'
          window.open(url, '_blank', 'noopener,noreferrer')
        }

        const head = h(
          'header',
          { className: 'pn-head' },
          h('h2', { className: 'pn-title' }, t('panel.title')),
          h('span', { className: 'pn-sub' }, t('panel.subtitle')),
          h(
            'div',
            { className: 'pn-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'pn-btn',
                disabled: state.status === 'loading' || state.status === 'refreshing',
                onClick: () => load(true),
              },
              state.status === 'refreshing' ? '…' : t('actions.refresh'),
            ),
            h(
              'button',
              { type: 'button', className: 'pn-btn pn-btn-primary', onClick: openPage },
              t('actions.open'),
            ),
          ),
        )

        const meta = ready
          ? h(
              'div',
              { className: 'pn-meta' },
              h('span', null, `${t('meta.asOf')}：${value.asOf || '—'}`),
              h('span', null, `${t('meta.generated')}：${generated}`),
              h('span', null, `${t('meta.source')}：`, h('code', null, value.source || '—')),
              h('span', null, `扫描：${scanTime}`),
              h('span', null, t('footer.version', { version: value.version || VERSION })),
            )
          : null

        const body = []
        if (state.status === 'loading' && !ready) {
          body.push(h('div', { key: 'loading', className: 'pn-empty' }, t('state.loading')))
        }
        if (state.status === 'error' && !ready) {
          body.push(h('div', { key: 'error', className: 'pn-warn' }, `${t('state.error')}${state.error || t('error.network')}`))
        }
        if (ready) {
          if (state.status === 'error' && state.error) {
            body.push(h('div', { key: 'stale', className: 'pn-warn' }, `${t('state.error')}${state.error}（显示上次成功结果）`))
          }
          const headline = value.headline || {}
          const modules = headline.modules || {}
          const kpi = value.kpi || {}
          const sync = (value.sync || []).map((s) => `${s.name} ${s.composite}%`).join(' · ')
          body.push(
            h(
              'div',
              { key: 'kpis', className: 'pn-kpis' },
              h(KpiCard, {
                label: t('kpi.modules'),
                value: `${modules.inUse || 0} / ${modules.registered || 0}`,
                note: t('kpi.modulesNote', { tested: modules.tested || 0 }),
              }),
              h(KpiCard, { label: t('kpi.gate'), value: `${headline.gate || 0} / ${headline.chains || 0}` }),
              h(KpiCard, { label: t('kpi.kpi'), value: `${kpi.ok || 0} / ${kpi.total || 0}` }),
              h(KpiCard, {
                label: t('kpi.guards'),
                value: `${headline.guardsFail || 0} / ${headline.guardsUntested || 0}`,
              }),
              h(KpiCard, { label: t('kpi.sync'), value: sync || '—' }),
            ),
          )
          body.push(
            h(
              'section',
              { key: 'layers', className: 'pn-card' },
              h('h3', null, t('layers.title')),
              (value.layers || []).map((row) =>
                h(
                  'div',
                  { key: row.id, className: 'pn-row' },
                  h('span', { className: 'pn-layer' }, row.id),
                  h('span', { className: 'pn-sub2' }, row.name || ''),
                  h('span', { className: 'pn-grow' }),
                  h('span', { className: 'pn-sub2' }, t('layers.row', { inUse: row.inUse, registered: row.registered })),
                  h('span', { className: 'pn-badge' }, t('layers.kpi', { ok: row.kpiOk, total: row.kpiTotal })),
                  row.lag > 0
                    ? h('span', { className: 'pn-badge pn-badge-bad' }, t('layers.lag', { n: row.lag }))
                    : h('span', { className: 'pn-badge' }, t('layers.ok')),
                ),
              ),
            ),
          )
          const advisor = value.advisor || {}
          body.push(
            h(
              'section',
              { key: 'advisor', className: 'pn-card' },
              h(
                'h3',
                null,
                t('advisor.title'),
                h('span', { className: 'pn-dim' }, t('advisor.summary', {
                  pending: advisor.pending || 0,
                  overdue: advisor.overdue || 0,
                  suggestions: advisor.suggestions || 0,
                  doneA: advisor.doneA || 0,
                })),
              ),
              advisor.pending
                ? (advisor.top || []).length
                  ? (advisor.top || []).map((item, index) =>
                      h(
                        'div',
                        { key: `${item.key}-${index}`, className: 'pn-item' },
                        h('span', { className: 'pn-item-key' }, item.key || '—'),
                        h('span', { className: 'pn-sub2' }, `[${item.dim || '—'}] `),
                        item.item || '',
                        h(
                          'div',
                          { className: 'pn-sub2' },
                          item.due ? t('advisor.due', { due: item.due }) : '—',
                          item.overdueDays > 0 ? ` · ${t('advisor.overdue', { days: item.overdueDays })}` : '',
                        ),
                      ),
                    )
                  : h('div', { className: 'pn-sub2' }, t('advisor.none'))
                : h('div', { className: 'pn-sub2' }, t('advisor.empty')),
              h('div', { className: 'pn-sub2', style: { marginTop: 8 } }, t('advisor.note')),
            ),
          )
          const reports = value.reports || {}
          body.push(
            h(
              'section',
              { key: 'reports', className: 'pn-card' },
              h('h3', null, t('reports.title'), h('span', { className: 'pn-dim' }, t('reports.summary', { count: reports.count || 0 }))),
              (reports.items || []).length
                ? (reports.items || []).map((it) =>
                    h(
                      'div',
                      { key: it.date, className: 'pn-row' },
                      h('span', { className: 'pn-grow' }, it.date || ''),
                      h('span', { className: 'pn-sub2' }, it.title || ''),
                    ),
                  )
                : h('div', { className: 'pn-sub2' }, t('reports.none')),
            ),
          )
        }

        return h('div', { className: 'pn-root' }, head, meta, body, h('footer', { className: 'pn-foot' }, t('footer.note')))
      }
    }

    function apply(ctx) {
      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = '@sgs/dsh-bundle-panorama'
        tag.dataset.pluginCss = `${NS}/panel.css`
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => {
          tag.remove()
        }
      }, 'panorama: styles')

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'panorama: dictionaries')

      const translate = makeTranslator(ctx)
      const iconComponent = makeIcon()
      const pageComponent = makePage(ctx)

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 17,
            label: () => translate('panel.title'),
            locale: NS,
          },
          iconComponent,
        ),
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
          },
          pageComponent,
        ),
      )
    }

    return {
      name: '@sgs/dsh-bundle-panorama',
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
