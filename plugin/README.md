# AIOS 全景 DSH 插件（@sgs/dsh-bundle-panorama v0.1）

> 来源：SGS 内部 DSH profile 的侧栏插件，公开用于**其他 LLM 读取源码、提改进**。
> 安装/升级仍需在运行 DSH 的本机执行（本目录不能远程加载）。

## 结构

| 文件 | 说明 |
|---|---|
| `index.js` | Host half：`GET /panorama/snapshot`（只读聚合，过 `connection.requestRejection`） |
| `client.js` | Browser half：`sidebar.panellist` 图标入口 + `main` 面板 |
| `cordis.patch.yml` | bundle patch（`projectRoot` 已改为占位 `__PROJECT_ROOT__`） |
| `package.json` | `dsh.bundle` / `dsh.client` 清单 |
| `locale/*.json` | 中英文标题与描述 |
| `icon.png` | 128×128 图标 |

## 让其他 LLM 迭代的方式

1. 读取本目录源码与 `../llms.txt` / `../index.html` 了解产品与数据；
2. 改源码 → 在 DSH profile 里 `plugin_manager remove_bundle` + `install_bundle` 本地目录重装验证；
3. 变更建议可直接提 issue/PR 到本公开仓库；本机由 DSH 合入。

## 安装（本机）

```bash
# 复制到工作区后，在 DSH 会话里用 plugin_manager install_bundle（target=该目录绝对路径）
# projectRoot 指向项目根；无该路径时面板会提示找不到全景数据目录
```
