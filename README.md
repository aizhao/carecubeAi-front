# CareCubeAi Frontend

睿立方感控AI助手 — 前端应用，基于 [RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3) 定制开发。

## 技术栈

| 组件 | 版本 |
|------|------|
| Vue | 3.x |
| Vite | 5.x |
| Element Plus | 2.x |
| Pinia | 状态管理 |
| Vue Router | 4.x |

## 核心功能

- **AI 聊天助手** — SSE 流式对话，多会话管理，引用标注
- **智能分析工作台** — 结构化患者资料输入、流式辅助分析、结构化结果卡片和后续追问
- **知识库管理** — 知识库列表、文档管理、检索测试
- **文件管理** — 文件夹树 + 文件表格，上传/移动/关联知识库
- **首页仪表盘** — 功能入口卡片（AI 助手、知识库、文件管理）
- **系统管理** — 用户/角色/菜单/字典/参数/通知公告管理
- **监控运维** — Druid 连接池、服务监控、缓存、定时任务

## 快速开始

```bash
npm install

# 开发模式（代理到 localhost:8081）
npm run dev

# 生产构建
npm run build:prod

# 测试/预发布构建
npm run build:stage

# 前端访问 http://localhost:80
```

## 智能分析页面

智能分析页面位于 `src/views/mag/agent/index.vue`，采用“左侧患者资料输入 + 右侧流式分析对话”的工作台布局。页面只调用 CareCubeAi 后端接口，不直接请求 RAGFlow，也不在前端保存真实 `agent_id`、API Key 或患者资料。

主要文件：

| 文件 | 说明 |
|------|------|
| `src/views/mag/agent/index.vue` | 页面编排 |
| `src/views/mag/agent/components/AgentInputPanel.vue` | 动态患者资料输入 |
| `src/views/mag/agent/components/AgentConversation.vue` | 流式分析和追问对话 |
| `src/views/mag/agent/components/AgentResultPanel.vue` | 辅助分析结果区域 |
| `src/views/mag/agent/components/StructuredResultCard.vue` | 结构化结果展示 |
| `src/api/mag/agent.js` | 智能分析接口 |
| `src/api/mag/agentSession.js` | 智能分析会话接口 |
| `src/composables/mag/useAgentStream.js` | SSE 流式处理 |
| `src/composables/mag/useAgentInputForm.js` | 动态表单状态 |
| `src/composables/mag/useReferenceParser.js` | 引用解析 |

SSE 业务事件：

| 事件 | 前端处理 |
|------|------|
| `message` | 追加流式文字 |
| `message_end` | 补充引用和附件 |
| `status` | 展示当前执行状态 |
| `structured_result` | 展示结构化结果卡片 |
| `done` | 结束加载状态 |
| `error` | 显示错误提示 |

页面文案遵循医疗安全边界，使用“开始辅助分析”“辅助分析结果”“感染风险提示”，底部固定提示：“以上内容仅供临床辅助参考，需结合患者实际情况及医务人员专业判断。”

## Docker 部署

```bash
# 在项目根目录执行
docker compose up -d --build
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_APP_BASE_API` | API 请求前缀（开发：`/dev-api`，生产：`/prod-api`） |
| `VITE_APP_RAGFLOW_SEARCH_URL` | 可选，知识库检索测试 iframe 地址 |

注意：

- 前端不配置真实 RAGFlow Agent ID 和 API Key。
- `.env.*` 文件包含环境相关配置，默认不提交到仓库。
- 不在 `localStorage` 中保存患者资料。

## License

MIT
