# Chat Assistant — Apple Design Language

**Date:** 2026-06-17
**Scope:** Full chat assistant feature: CRUD management + session-based chat + SSE streaming
**Reference:** `/Users/zhaoai/carecubeAi/DESIGN.md`, `/Users/zhaoai/carecubeAi/http_api_reference.md`

## Overview

A standalone AI Chat Assistant module (independent top-level menu, not under knowledge base). Users can create/manage chat assistants, start sessions, and converse via SSE streaming. Each user's sessions are isolated via RAGFlow's `user_id` parameter.

---

## Architecture

```
Frontend (Vue 3)                  Backend (Spring Boot)             RAGFlow API
─────────────                     ──────────────────               ────────────
ChatAssistantList.vue     →      RagFlowChatController        →    /api/v1/chats
ChatView.vue              →      IChatService                      /api/v1/chats/{id}/sessions
  (chat + session list)          ChatServiceImpl                   /api/v1/chat/completions
```

### Files to Create

| Layer | File | Purpose |
|-------|------|---------|
| Backend Service | `ruoyi-system/src/main/java/com/ruoyi/system/service/IChatService.java` | Interface for chat API calls |
| Backend Service | `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/ChatServiceImpl.java` | Implementation, reuses `RagFlowConfig` + `RestTemplate` |
| Backend Controller | `ruoyi-admin/src/main/java/com/ruoyi/web/controller/mag/RagFlowChatController.java` | REST API `/mag/chat/*` |
| Frontend API | `src/api/mag/chat.js` | API request definitions |
| Frontend Page | `src/views/mag/chat/index.vue` | Chat assistant list + management |
| Frontend Page | `src/views/mag/chat/chat.vue` | Chat conversation view |
| SQL | Append to `ragflow_knowledge_base_menu.sql` | Menu entries |

---

## Backend Design

### Service Interface

```java
public interface IChatService {
    Map<String, Object> listChats(int page, int pageSize, String keywords);
    Map<String, Object> getChat(String chatId);
    Map<String, Object> createChat(Map<String, Object> params);
    Map<String, Object> updateChat(String chatId, Map<String, Object> params);
    void deleteChats(List<String> ids);

    Map<String, Object> listSessions(String chatId, int page, int pageSize, String userId);
    Map<String, Object> createSession(String chatId, String name, String userId);
    Map<String, Object> getSession(String chatId, String sessionId);
    void deleteSessions(String chatId, List<String> sessionIds);

    SseEmitter sendMessage(String chatId, String sessionId, String question);
}
```

### Controller Endpoints

| HTTP | URL | Method | Permission |
|------|-----|--------|------------|
| `GET` | `/mag/chat/list` | List assistants | `mag:chat:list` |
| `GET` | `/mag/chat/{chatId}` | Get assistant detail | `mag:chat:query` |
| `POST` | `/mag/chat` | Create assistant | `mag:chat:add` |
| `PUT` | `/mag/chat/{chatId}` | Update assistant | `mag:chat:edit` |
| `DELETE` | `/mag/chat/{ids}` | Delete assistants | `mag:chat:remove` |
| `GET` | `/mag/chat/{chatId}/sessions` | List sessions (with `?userId=`) | `mag:chat:query` |
| `POST` | `/mag/chat/{chatId}/sessions` | Create session (body: `name, userId`) | `mag:chat:add` |
| `GET` | `/mag/chat/{chatId}/sessions/{sessionId}` | Get session messages | `mag:chat:query` |
| `DELETE` | `/mag/chat/{chatId}/sessions/{ids}` | Delete sessions | `mag:chat:remove` |
| `POST` | `/mag/chat/{chatId}/send` | Send message (SSE streaming) | `mag:chat:query` |

### SSE Streaming

`POST /mag/chat/{chatId}/send` returns `text/event-stream`. Backend:

1. Calls `POST /api/v1/chat/completions` on RAGFlow with `stream: true`
2. Opens a `RestTemplate.execute` with `ResponseExtractor`
3. Reads the response line-by-line and writes each `data: {...}` to `SseEmitter`
4. Frontend consumes via `EventSource` or `fetch` + `ReadableStream`

**SSE payload format:**
```
data:{"code":0,"data":{"answer":"chunk text...","reference":{},"id":"...","session_id":"..."}}

data:{"code":0,"data":true}
```
Final chunk has `"data":true` — signals end of stream.

---

## Frontend Design

### Menu Structure

```
M  AI 助手              (path: mag, icon: chat, order: 6)
  C  助手列表            (path: index, component: mag/chat/index, perm: mag:chat:list)
```

Note: The chat view page (`mag/chat/chat`) is a hidden menu entry (visible="1") — rendered when user clicks "进入" on a chat card via `router.push`. This follows RuoYi's existing pattern (same as `mag/knowledge/files`).

### Page 1: Chat Assistant List (`mag/chat/index.vue`)

Apple Design layout following DESIGN.md tokens.

```
┌──────────────────────────────────────────────────────────┐
│  AI 助手                                    [+ 新建助手] │  sub-nav 52px Parchment
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  💬  医疗感控助手                                   │ │  utility card
│  │      基于医院感染控制知识库，回答感控相关问题         │ │  rounded.lg (18px)
│  │      关联知识库: 感控知识库, 手术室规范               │ │  Hairline border
│  │      模型: deepseek-chat                            │ │
│  │      上次更新: 2026-06-15          [编辑] [删除] [进入]│ │  buttons on hover
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  💬  通用问答助手                                   │ │
│  │      不关联知识库，基于通用模型回答                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Design tokens applied:**
- Page background: `#f5f5f7` (Parchment)
- Cards: `#ffffff` (Canvas), 1px `#e0e0e0` (Hairline) border, `18px` radius (rounded.lg)
- Card padding: `24px` (spacing.lg)
- Title: 21px/600 (tagline), color `#1d1d1f` (Ink)
- Description: 14px/400 (caption), color `#7a7a7a`
- "新建助手" button: Action Blue pill (`button-primary`), 9999px radius, padding 11px 22px
- "进入" button: `button-secondary-pill` — transparent bg, Action Blue text, 1px Action Blue border
- "编辑"/"删除": `button-pearl-capsule` — `#fafafc` bg, `#333333` text, 11px radius
- Hover: card border changes to `#0066cc`, transforms scale not used (cards =/= product imagery)

**Create/Edit dialog:**
- `el-dialog` with Apple-style form
- Fields: name, description, dataset_ids (multi-select from knowledge bases), model (text input or select), prompt_config (system prompt textarea, prologue textarea)
- Using `PATCH /api/v1/chats/{id}` for partial update

### Page 2: Chat Conversation (`mag/chat/chat.vue`)

Accessed via router push with query params: `router.push({ name: 'ChatConversation', query: { chatId: 'xxx', chatName: 'xxx' } })`

```
┌──────────────┬──────────────────────────────────────────────────┐
│  📋 会话      │  ← 返回助手列表    医疗感控助手                  │
│              │                                                   │
│  [+ 新建]    │  ┌─────────────────────────────────────────────┐ │
│              │  │  你好，我是医疗感控助手，可以帮你解答         │ │ AI: Canvas
│  ┌─────────┐ │  │  医院感染控制相关问题。                       │ │ white card
│  │ 手术室  │ │  │                              17px/400        │ │ 18px radius
│  │ 隔离制  │ │  └─────────────────────────────────────────────┘ │
│  │ 口罩规  │ │                                                   │
│  └─────────┘ │  ┌──────────────────────────────────┐            │ │ User: right-aligned
│              │  │  手术室消毒流程是什么？           │            │ │ Action Blue outline
│              │  └──────────────────────────────────┘            │ │ 18px radius
│              │                                                   │
│              │  ┌─────────────────────────────────────────────┐ │
│              │  │  根据《手术室消毒规范》，手术室消毒流程...    │ │
│              │  │                                              │ │
│              │  │  ┌────────────────────────────────────┐      │ │
│              │  │  │ 📄 引用自: 手术室消毒规范.docx    │      │ │
│              │  │  │ "术前应使用含氯消毒剂..."         │      │ │
│              │  │  └────────────────────────────────────┘      │ │
│              │  └─────────────────────────────────────────────┘ │
│              │                                                   │
│              │  ┌───────────────────────────────────────┐       │
│              │  │  [添加附件]  [输入消息...]    [发送] │       │ pill input
│              │  └───────────────────────────────────────┘       │
└──────────────┴──────────────────────────────────────────────────┘
```

**Design tokens applied:**
- Shell background: `#f5f5f7` (Parchment)
- Session panel: 280px, Parchment bg, right hairline border
- Session items: 44px height, 14px caption, hover `rgba(0,0,0,0.04)`, active = white bg + left 3px `#0066cc` bar
- AI message bubble: `#ffffff` Canvas, `18px` radius, padding 16px 20px
- User message bubble: `#ffffff` Canvas, 1px `#0066cc` border, right-aligned, `18px` radius, padding 12px 18px
- Message text: `17px/400/1.47` (body)
- Input bar: `#f5f5f7` bg, pill `9999px` radius, 44px height, 1px `#e0e0e0` border
- Send button: Action Blue pill (`button-primary`), `9999px`, padding 11px 22px
- Reference block: Parchment bg, 14px caption, `#7a7a7a` text, `8px` radius inset
- No shadows on any chat elements

**Streaming behavior:**
- User sends message → immediately shows user bubble + empty AI bubble with blinking cursor
- SSE chunks arrive → AI bubble text grows character by character
- Final chunk (`data: true`) → remove cursor, show references if any
- Auto-scroll to bottom on each new chunk

**Session management:**
- Create session: `POST /mag/chat/{chatId}/sessions` with `{ name: currentUserName + 时间戳, userId: currentUserId }`
- List sessions: `GET /mag/chat/{chatId}/sessions?userId={currentUserId}` — only shows current user's sessions
- Delete session: swipe or right-click → delete
- Session naming: auto-generated as `YYYY-MM-DD HH:mm` timestamp, or user can rename

### User Session Isolation

```
创建会话:  POST /api/v1/chats/{id}/sessions  body: { "name": "...", "user_id": "当前登录用户ID" }
查询会话:  GET /api/v1/chats/{id}/sessions?user_id=当前登录用户ID
删除会话:  DELETE /api/v1/chats/{id}/sessions  body: { "ids": [...] }
```

The backend controller extracts the current user ID from `SecurityUtils.getUserId()` and passes it to RAGFlow. Frontend does NOT send userId — the backend enforces isolation server-side.

---

## Menu SQL

```sql
-- AI 助手一级菜单
insert into sys_menu values('2014', 'AI助手', '0', '6', 'mag', null, '', '', 1, 0, 'M', '0', '0', '', 'chat', 'admin', sysdate(), '', null, 'AI助手管理目录');

-- 助手列表
insert into sys_menu values('2015', '助手列表', '2014', '1', 'index', 'mag/chat/index', '', 'ChatAssistant', 1, 0, 'C', '0', '0', 'mag:chat:list', 'tree-table', 'admin', sysdate(), '', null, 'AI助手管理页面');

-- 按钮权限
insert into sys_menu values('2016', '助手查询', '2015', '1', '', null, '', '', 1, 0, 'F', '0', '0', 'mag:chat:query', '#', 'admin', sysdate(), '', null, '');
insert into sys_menu values('2017', '助手新增', '2015', '2', '', null, '', '', 1, 0, 'F', '0', '0', 'mag:chat:add', '#', 'admin', sysdate(), '', null, '');
insert into sys_menu values('2018', '助手修改', '2015', '3', '', null, '', '', 1, 0, 'F', '0', '0', 'mag:chat:edit', '#', 'admin', sysdate(), '', null, '');
insert into sys_menu values('2019', '助手删除', '2015', '4', '', null, '', '', 1, 0, 'F', '0', '0', 'mag:chat:remove', '#', 'admin', sysdate(), '', null, '');

-- 聊天对话页（隐藏菜单）
insert into sys_menu values('2020', '聊天对话', '2014', '2', 'chat', 'mag/chat/chat', '', 'ChatConversation', 1, 0, 'C', '1', '0', 'mag:chat:query', '#', 'admin', sysdate(), '', null, '聊天对话页面');

-- 角色权限
insert into sys_role_menu values ('1', '2014');
insert into sys_role_menu values ('1', '2015');
insert into sys_role_menu values ('1', '2016');
insert into sys_role_menu values ('1', '2017');
insert into sys_role_menu values ('1', '2018');
insert into sys_role_menu values ('1', '2019');
insert into sys_role_menu values ('1', '2020');
```

---

## API Summary

### Backend → Frontend

| Endpoint | Request | Response |
|----------|---------|----------|
| `GET /mag/chat/list?page=&pageSize=&keywords=` | — | `{ rows: [...], total: N }` |
| `GET /mag/chat/{chatId}` | — | `{ data: { ... } }` |
| `POST /mag/chat` | `{ name, description, dataset_ids, model, prompt_config }` | `{ data: { ... } }` |
| `PUT /mag/chat/{chatId}` | `{ name, description, ... }` | `{ data: { ... } }` |
| `DELETE /mag/chat/{ids}` | — | `{ msg: "..." }` |
| `GET /mag/chat/{chatId}/sessions?page=&pageSize=&userId=` | — | `{ rows: [...], total: N }` |
| `POST /mag/chat/{chatId}/sessions` | `{ name, userId }` | `{ data: { ... } }` |
| `GET /mag/chat/{chatId}/sessions/{sessionId}` | — | `{ data: { ... } }` |
| `DELETE /mag/chat/{chatId}/sessions/{ids}` | — | `{ msg: "..." }` |
| `POST /mag/chat/{chatId}/send` | `{ sessionId, question, stream }` | `text/event-stream` SSE |

### Backend → RAGFlow

| Method | RAGFlow Endpoint | Maps From |
|--------|-----------------|-----------|
| `listChats` | `GET /api/v1/chats?page=&page_size=&keywords=` | `GET /mag/chat/list` |
| `getChat` | `GET /api/v1/chats/{chatId}` | `GET /mag/chat/{id}` |
| `createChat` | `POST /api/v1/chats` | `POST /mag/chat` |
| `updateChat` | `PATCH /api/v1/chats/{chatId}` | `PUT /mag/chat/{id}` |
| `deleteChats` | `DELETE /api/v1/chats` | `DELETE /mag/chat/{ids}` |
| `listSessions` | `GET /api/v1/chats/{chatId}/sessions?user_id=` | `GET /mag/chat/{id}/sessions` |
| `createSession` | `POST /api/v1/chats/{chatId}/sessions` | `POST /mag/chat/{id}/sessions` |
| `getSession` | `GET /api/v1/chats/{chatId}/sessions/{sid}` | `GET /mag/chat/{id}/sessions/{sid}` |
| `deleteSessions` | `DELETE /api/v1/chats/{chatId}/sessions` | `DELETE /mag/chat/{id}/sessions/{ids}` |
| `sendMessage` | `POST /api/v1/chat/completions` | `POST /mag/chat/{id}/send` |

---

## File Change List

| File | Action | Purpose |
|------|--------|---------|
| `ruoyi-system/src/main/java/com/ruoyi/system/service/IChatService.java` | Create | Service interface |
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/ChatServiceImpl.java` | Create | Service implementation |
| `ruoyi-admin/src/main/java/com/ruoyi/web/controller/mag/RagFlowChatController.java` | Create | REST controller |
| `RuoYi-Vue3/src/api/mag/chat.js` | Create | Frontend API definitions |
| `RuoYi-Vue3/src/views/mag/chat/index.vue` | Create | Chat assistant list page |
| `RuoYi-Vue3/src/views/mag/chat/chat.vue` | Create | Chat conversation page |
| `RuoYi-Vue/sql/ragflow_knowledge_base_menu.sql` | Modify | Append menu entries |
