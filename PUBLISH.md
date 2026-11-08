# 发布说明（手动确认后发布）

本公开站点**不做自动发布**：每次由 William 确认后，由 DSH 在本机执行一次「导出 + 提交 + 推送」。

## 发布前检查

1. 内部全景已刷新并确认要公开：`.../AIOS全景_20261102/page/aios_panorama.html` 与 `data/aios_panorama_<YYYYMMDD>.json`；
2. 确认公开范围（当前为完整内容；如需脱敏，改导出流程后再发）；
3. 确认线上 Artifact 与公开版数据日期一致（避免线上旧、公开新）。

## 发布步骤（DSH 执行）

```bash
ROOT="/Users/william/Nutstore Files/0.0 Project总控"
A="$ROOT/WORKCENTER/P0/03_iteration/AI-NATIVE-ARCH-001_公司AI原生运行架构/AIOS全景_20261102"
PUB="$HOME/.aios-public/sgs-ai-os-panorama"

cp "$A/page/aios_panorama.html" "$PUB/index.html"
# 重新生成 llms-full.txt / aios.json（同内部导出逻辑；见 05_prod 记录）
# 记录：在 PUBLISH_LOG.md 追加一行（日期、数据 as_of、页面 sha256、确认人=William）
cd "$PUB"
git add -A
git -c user.email="dsh@local" -c user.name="DSH" commit -m "publish: AIOS panorama as_of <YYYY-MM-DD>（William 确认）"
git push origin main
```

## 发布后校验

- <https://cicaocao2322-art.github.io/sgs-ai-os-panorama/> 返回 200，页头数据日期正确；
- `llms.txt` 首屏「当前数据」与页面一致；
- 本文件 `PUBLISH_LOG.md` 有对应记录。

## 回滚

`git revert` 最近一次发布提交并推送；或把 `index.html` 恢复至上一 tag。历史在 git 中可查。
