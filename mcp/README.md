# AIOS 全景 MCP server（stdio，零依赖）

让 Claude Desktop / 其他 MCP 客户端直接查询 SGS AI OS 全景（只读）。

## 工具

| 工具 | 用途 |
|---|---|
| `panorama_overview` | 数据截至、KPI（模块/业务链/六层 KPI/守护/同步率）、六层、参谋计数与前 5 条待决、期报数 |
| `panorama_search` | 按关键词检索层/六层目标组/参谋/期报（≤20 条） |
| `report_latest` | 最近期报（日期/标题/公开页地址） |

## 数据源

`AIOS_PANORAMA_JSON` 环境变量 → 本机最新 `data/aios_panorama_*.json` → 公开 `https://cicaocao2322-art.github.io/sgs-ai-os-panorama/aios.json`。

## Claude Desktop 配置（本机）

```json
{
  "mcpServers": {
    "aios-panorama": {
      "command": "<node 绝对路径>",
      "args": ["<本文件目录>/panorama-mcp.js"],
      "env": { "AIOS_PROJECT_ROOT": "<项目根>" }
    }
  }
}
```

保存后退出并重开 Claude Desktop；在对话里让它「用 panorama_overview 看全景」。

## 运行/自测

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node panorama-mcp.js
```
