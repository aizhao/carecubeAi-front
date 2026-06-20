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
- **知识库管理** — 知识库列表、文档管理、检索测试
- **文件管理** — 文件夹树 + 文件表格，上传/移动/关联知识库
- **首页仪表盘** — 功能入口卡片（AI 助手、知识库、文件管理）
- **系统管理** — 用户/角色/菜单/字典/参数/通知公告管理
- **监控运维** — Druid 连接池、服务监控、缓存、定时任务

## 快速开始

```bash
yarn install

# 开发模式（代理到 localhost:8081）
yarn dev

# 生产构建
yarn build:prod

# 前端访问 http://localhost:80
```

## Docker 部署

```bash
# 在项目根目录执行
docker compose up -d --build
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_APP_BASE_API` | API 请求前缀（开发：`/dev-api`，生产：`/prod-api`） |
| `VITE_APP_CHAT_ASSISTANT_ID` | RAGFlow 聊天助手 ID |

## License

MIT
