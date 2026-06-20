# Chat Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Chat Assistant module with CRUD management, session-based chat, and SSE streaming — following Apple Design language.

**Architecture:** Backend proxy (Spring Boot controller + service) wraps RAGFlow's `/api/v1/chats`, `/api/v1/chats/{id}/sessions`, and `/api/v1/chat/completions` endpoints. Frontend (Vue 3 Composition API) renders an Apple Design card-based list page and a two-panel chat conversation page with SSE streaming.

**Tech Stack:** Spring Boot 4.0.6, Spring MVC (Servlet), RestTemplate, Vue 3 + Vite + Element Plus + Pinia, fetch ReadableStream for SSE

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `ruoyi-system/src/main/java/com/ruoyi/system/service/IChatService.java` | Create | Service interface (10 methods) |
| `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/ChatServiceImpl.java` | Create | Implementation with RestTemplate |
| `ruoyi-admin/src/main/java/com/ruoyi/web/controller/mag/RagFlowChatController.java` | Create | REST controller `/mag/chat/*` |
| `ruoyi-framework/src/main/java/com/ruoyi/framework/config/RestTemplateConfig.java` | Modify | Enable non-buffering for SSE |
| `RuoYi-Vue3/src/api/mag/chat.js` | Create | Frontend API definitions |
| `RuoYi-Vue3/src/views/mag/chat/index.vue` | Create | Assistant list page |
| `RuoYi-Vue3/src/views/mag/chat/chat.vue` | Create | Chat conversation page |
| `RuoYi-Vue/sql/ragflow_knowledge_base_menu.sql` | Modify | Append menu entries |

---

### Task 1: Backend Service Interface

**Files:**
- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/IChatService.java`

- [ ] **Step 1: Write the interface**

```java
package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

/**
 * Chat Assistant Service — proxies RAGFlow Chat API
 *
 * @author ruoyi
 */
public interface IChatService
{
    Map<String, Object> listChats(int page, int pageSize, String keywords);

    Map<String, Object> getChat(String chatId);

    Map<String, Object> createChat(Map<String, Object> params);

    Map<String, Object> updateChat(String chatId, Map<String, Object> params);

    void deleteChats(List<String> ids);

    Map<String, Object> listSessions(String chatId, int page, int pageSize, String userId);

    Map<String, Object> createSession(String chatId, String name, String userId);

    Map<String, Object> getSession(String chatId, String sessionId);

    void deleteSessions(String chatId, List<String> sessionIds);

    java.io.InputStream sendMessage(String chatId, String sessionId, String question);
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/zhaoai/carecubeAi/RuoYi-Vue && mvn compile -pl ruoyi-system -DskipTests`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue
git add ruoyi-system/src/main/java/com/ruoyi/system/service/IChatService.java
git commit -m "feat: add IChatService interface for chat assistant"
```

---

### Task 2: Backend Service Implementation

**Files:**
- Create: `ruoyi-system/src/main/java/com/ruoyi/system/service/impl/ChatServiceImpl.java`

- [ ] **Step 1: Write the implementation class**

```java
package com.ruoyi.system.service.impl;

import com.ruoyi.common.config.RagFlowConfig;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.service.IChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
public class ChatServiceImpl implements IChatService
{
    private static final Logger log = LoggerFactory.getLogger(ChatServiceImpl.class);

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private RagFlowConfig ragFlowConfig;

    private String apiUrl() {
        return ragFlowConfig.getUrl() + "/api/v1";
    }

    // ========== Chat CRUD ==========

    @Override
    public Map<String, Object> listChats(int page, int pageSize, String keywords)
    {
        StringBuilder url = new StringBuilder(apiUrl() + "/chats?page=" + page + "&page_size=" + pageSize);
        if (keywords != null && !keywords.isEmpty()) {
            url.append("&keywords=").append(keywords);
        }
        return executeGet(url.toString());
    }

    @Override
    public Map<String, Object> getChat(String chatId)
    {
        return executeGet(apiUrl() + "/chats/" + chatId);
    }

    @Override
    public Map<String, Object> createChat(Map<String, Object> params)
    {
        return executePost(apiUrl() + "/chats", params);
    }

    @Override
    public Map<String, Object> updateChat(String chatId, Map<String, Object> params)
    {
        return executePatch(apiUrl() + "/chats/" + chatId, params);
    }

    @Override
    public void deleteChats(List<String> ids)
    {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("ids", ids);
        executeDelete(apiUrl() + "/chats", body);
    }

    // ========== Session Management ==========

    @Override
    public Map<String, Object> listSessions(String chatId, int page, int pageSize, String userId)
    {
        StringBuilder url = new StringBuilder(apiUrl() + "/chats/" + chatId + "/sessions?page=" + page + "&page_size=" + pageSize);
        if (userId != null && !userId.isEmpty()) {
            url.append("&user_id=").append(userId);
        }
        return executeGet(url.toString());
    }

    @Override
    public Map<String, Object> createSession(String chatId, String name, String userId)
    {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("name", name);
        body.put("user_id", userId);
        return executePost(apiUrl() + "/chats/" + chatId + "/sessions", body);
    }

    @Override
    public Map<String, Object> getSession(String chatId, String sessionId)
    {
        return executeGet(apiUrl() + "/chats/" + chatId + "/sessions/" + sessionId);
    }

    @Override
    public void deleteSessions(String chatId, List<String> sessionIds)
    {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("ids", sessionIds);
        executeDelete(apiUrl() + "/chats/" + chatId + "/sessions", body);
    }

    // ========== SSE Streaming ==========

    @Override
    public InputStream sendMessage(String chatId, String sessionId, String question)
    {
        String url = apiUrl() + "/chat/completions";

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("question", question);
        body.put("stream", true);
        body.put("chat_id", chatId);
        body.put("session_id", sessionId);

        try
        {
            // Use execute() with ResponseExtractor to get raw InputStream — no buffering
            return restTemplate.execute(
                    url,
                    HttpMethod.POST,
                    request -> {
                        request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                        request.getHeaders().setBearerAuth(ragFlowConfig.getApiKey());
                        request.getHeaders().set("Connection", "keep-alive");
                        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter converter =
                                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter();
                        converter.write(body, MediaType.APPLICATION_JSON, request);
                    },
                    clientHttpResponse -> clientHttpResponse.getBody()
            );
        }
        catch (RestClientException e)
        {
            log.error("调用 RAGFlow Chat Completions 失败", e);
            throw new ServiceException("聊天服务调用失败: " + e.getMessage());
        }
    }

    // ========== HTTP Helpers ==========

    private HttpHeaders buildHeaders()
    {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(ragFlowConfig.getApiKey());
        return headers;
    }

    private void checkRagFlowResponse(Map<String, Object> response)
    {
        if (response == null)
        {
            throw new ServiceException("聊天助手服务返回空响应");
        }
        Object code = response.get("code");
        if (code instanceof Number && ((Number) code).intValue() != 0)
        {
            Object message = response.get("message");
            throw new ServiceException("聊天助手服务错误: " + (message != null ? message.toString() : "未知错误"));
        }
    }

    private Map<String, Object> executeGet(String url)
    {
        try
        {
            HttpEntity<Void> entity = new HttpEntity<>(buildHeaders());
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            checkRagFlowResponse(body);
            return body;
        }
        catch (RestClientException e)
        {
            log.error("RAGFlow GET 请求失败: {}", url, e);
            throw new ServiceException("调用聊天助手服务失败: " + e.getMessage());
        }
    }

    private Map<String, Object> executePost(String url, Map<String, Object> requestBody)
    {
        try
        {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, buildHeaders());
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            checkRagFlowResponse(body);
            return body;
        }
        catch (RestClientException e)
        {
            log.error("RAGFlow POST 请求失败: {}", url, e);
            throw new ServiceException("调用聊天助手服务失败: " + e.getMessage());
        }
    }

    private Map<String, Object> executePatch(String url, Map<String, Object> requestBody)
    {
        try
        {
            HttpHeaders headers = buildHeaders();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            // RestTemplate does not have PATCH by default — use execute with PATCH
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.PATCH, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            checkRagFlowResponse(body);
            return body;
        }
        catch (RestClientException e)
        {
            log.error("RAGFlow PATCH 请求失败: {}", url, e);
            throw new ServiceException("调用聊天助手服务失败: " + e.getMessage());
        }
    }

    private void executeDelete(String url, Map<String, Object> body)
    {
        try
        {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, buildHeaders());
            restTemplate.exchange(url, HttpMethod.DELETE, entity, Map.class);
        }
        catch (RestClientException e)
        {
            log.error("RAGFlow DELETE 请求失败: {}", url, e);
            throw new ServiceException("调用聊天助手服务失败: " + e.getMessage());
        }
    }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/zhaoai/carecubeAi/RuoYi-Vue && mvn compile -pl ruoyi-system -DskipTests`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue
git add ruoyi-system/src/main/java/com/ruoyi/system/service/impl/ChatServiceImpl.java
git commit -m "feat: add ChatServiceImpl with CRUD, session management, and SSE streaming"
```

---

### Task 3: Backend Controller

**Files:**
- Create: `ruoyi-admin/src/main/java/com/ruoyi/web/controller/mag/RagFlowChatController.java`

- [ ] **Step 1: Write the controller**

```java
package com.ruoyi.web.controller.mag;

import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.IChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/mag/chat")
public class RagFlowChatController extends BaseController
{
    private static final Logger log = LoggerFactory.getLogger(RagFlowChatController.class);

    @Autowired
    private IChatService chatService;

    // ========== Chat CRUD ==========

    @PreAuthorize("@ss.hasPermi('mag:chat:list')")
    @GetMapping("/list")
    public TableDataInfo listChats(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String keywords)
    {
        try
        {
            Map<String, Object> result = chatService.listChats(page, pageSize, keywords);
            TableDataInfo rspData = new TableDataInfo();
            rspData.setCode(HttpStatus.SUCCESS);
            rspData.setMsg("查询成功");
            Object data = result.get("data");
            if (data instanceof Map)
            {
                @SuppressWarnings("unchecked")
                Map<String, Object> dataMap = (Map<String, Object>) data;
                rspData.setRows(dataMap.getOrDefault("chats", Collections.emptyList()));
                Object totalObj = dataMap.get("total");
                rspData.setTotal(totalObj instanceof Number ? ((Number) totalObj).longValue() : 0);
            }
            return rspData;
        }
        catch (ServiceException e)
        {
            log.warn("查询聊天助手列表失败: {}", e.getMessage());
            return emptyTableData();
        }
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:query')")
    @GetMapping("/{chatId}")
    public AjaxResult getChat(@PathVariable String chatId)
    {
        Map<String, Object> result = chatService.getChat(chatId);
        return success(result.get("data"));
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:add')")
    @Log(title = "聊天助手", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult createChat(@RequestBody Map<String, Object> params)
    {
        Map<String, Object> result = chatService.createChat(params);
        return success(result.get("data"));
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:edit')")
    @Log(title = "聊天助手", businessType = BusinessType.UPDATE)
    @PutMapping("/{chatId}")
    public AjaxResult updateChat(@PathVariable String chatId, @RequestBody Map<String, Object> params)
    {
        Map<String, Object> result = chatService.updateChat(chatId, params);
        return success(result.get("data"));
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:remove')")
    @Log(title = "聊天助手", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public AjaxResult deleteChats(@PathVariable String ids)
    {
        chatService.deleteChats(Arrays.asList(ids.split(",")));
        return success();
    }

    // ========== Session Management ==========

    @PreAuthorize("@ss.hasPermi('mag:chat:query')")
    @GetMapping("/{chatId}/sessions")
    public TableDataInfo listSessions(
            @PathVariable String chatId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize)
    {
        String userId = String.valueOf(SecurityUtils.getUserId());
        try
        {
            Map<String, Object> result = chatService.listSessions(chatId, page, pageSize, userId);
            TableDataInfo rspData = new TableDataInfo();
            rspData.setCode(HttpStatus.SUCCESS);
            rspData.setMsg("查询成功");
            Object data = result.get("data");
            if (data instanceof Map)
            {
                @SuppressWarnings("unchecked")
                Map<String, Object> dataMap = (Map<String, Object>) data;
                rspData.setRows(dataMap.getOrDefault("sessions", Collections.emptyList()));
                Object totalObj = dataMap.get("total");
                rspData.setTotal(totalObj instanceof Number ? ((Number) totalObj).longValue() : 0);
            }
            return rspData;
        }
        catch (ServiceException e)
        {
            log.warn("查询会话列表失败: {}", e.getMessage());
            return emptyTableData();
        }
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:add')")
    @Log(title = "聊天会话", businessType = BusinessType.INSERT)
    @PostMapping("/{chatId}/sessions")
    public AjaxResult createSession(@PathVariable String chatId, @RequestBody Map<String, Object> params)
    {
        String userId = String.valueOf(SecurityUtils.getUserId());
        String name = (String) params.getOrDefault("name", "新会话");
        Map<String, Object> result = chatService.createSession(chatId, name, userId);
        return success(result.get("data"));
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:query')")
    @GetMapping("/{chatId}/sessions/{sessionId}")
    public AjaxResult getSession(@PathVariable String chatId, @PathVariable String sessionId)
    {
        Map<String, Object> result = chatService.getSession(chatId, sessionId);
        return success(result.get("data"));
    }

    @PreAuthorize("@ss.hasPermi('mag:chat:remove')")
    @Log(title = "聊天会话", businessType = BusinessType.DELETE)
    @DeleteMapping("/{chatId}/sessions/{ids}")
    public AjaxResult deleteSessions(@PathVariable String chatId, @PathVariable String ids)
    {
        chatService.deleteSessions(chatId, Arrays.asList(ids.split(",")));
        return success();
    }

    // ========== SSE Streaming Chat ==========

    @PreAuthorize("@ss.hasPermi('mag:chat:query')")
    @PostMapping("/{chatId}/send")
    public void sendMessage(
            @PathVariable String chatId,
            @RequestBody Map<String, Object> params,
            HttpServletResponse response) throws IOException
    {
        String sessionId = (String) params.get("sessionId");
        String question = (String) params.get("question");
        boolean stream = params.get("stream") == null || Boolean.TRUE.equals(params.get("stream"));

        if (!stream)
        {
            // Non-streaming fallback — return as regular response
            // (But the spec assumes streaming; handle as needed)
        }

        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        response.setHeader("X-Accel-Buffering", "no");

        InputStream inputStream = chatService.sendMessage(chatId, sessionId, question);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        try
        {
            String line;
            while ((line = reader.readLine()) != null)
            {
                if (line.startsWith("data:"))
                {
                    response.getWriter().write(line + "\n\n");
                    response.getWriter().flush();
                }
                else if (!line.isEmpty())
                {
                    // Some SSE servers send non-prefixed JSON
                    response.getWriter().write("data:" + line + "\n\n");
                    response.getWriter().flush();
                }
            }
        }
        finally
        {
            reader.close();
            inputStream.close();
        }
    }

    private TableDataInfo emptyTableData()
    {
        TableDataInfo rspData = new TableDataInfo();
        rspData.setCode(HttpStatus.SUCCESS);
        rspData.setMsg("查询成功");
        rspData.setRows(Collections.emptyList());
        rspData.setTotal(0);
        return rspData;
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/zhaoai/carecubeAi/RuoYi-Vue && mvn compile -pl ruoyi-admin -DskipTests`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue
git add ruoyi-admin/src/main/java/com/ruoyi/web/controller/mag/RagFlowChatController.java
git commit -m "feat: add RagFlowChatController with 10 endpoints"
```

---

### Task 4: RestTemplate SSE Configuration

**Files:**
- Modify: `ruoyi-framework/src/main/java/com/ruoyi/framework/config/RestTemplateConfig.java`

- [ ] **Step 1: Update RestTemplateConfig for non-buffering streaming**

Replace the entire file content:

```java
package com.ruoyi.framework.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate 配置 — 禁用缓冲以支持 SSE 流式传输
 *
 * @author ruoyi
 */
@Configuration
public class RestTemplateConfig
{
    @Bean
    public RestTemplate restTemplate()
    {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setBufferRequestBody(false);
        return new RestTemplate(factory);
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/zhaoai/carecubeAi/RuoYi-Vue && mvn compile -pl ruoyi-framework -DskipTests`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue
git add ruoyi-framework/src/main/java/com/ruoyi/framework/config/RestTemplateConfig.java
git commit -m "fix: disable RestTemplate buffering to support SSE streaming"
```

---

### Task 5: Frontend API Module

**Files:**
- Create: `RuoYi-Vue3/src/api/mag/chat.js`

- [ ] **Step 1: Write the API module**

```javascript
import request from '@/utils/request'

// ========== Chat Assistant CRUD ==========

// 查询聊天助手列表
export function listChats(query) {
  return request({
    url: '/mag/chat/list',
    method: 'get',
    params: query
  })
}

// 获取聊天助手详情
export function getChat(chatId) {
  return request({
    url: '/mag/chat/' + chatId,
    method: 'get'
  })
}

// 创建聊天助手
export function addChat(data) {
  return request({
    url: '/mag/chat',
    method: 'post',
    data: data
  })
}

// 更新聊天助手
export function updateChat(chatId, data) {
  return request({
    url: '/mag/chat/' + chatId,
    method: 'put',
    data: data
  })
}

// 删除聊天助手
export function delChats(ids) {
  return request({
    url: '/mag/chat/' + ids,
    method: 'delete'
  })
}

// ========== Session Management ==========

// 查询会话列表
export function listSessions(chatId, query) {
  return request({
    url: '/mag/chat/' + chatId + '/sessions',
    method: 'get',
    params: query
  })
}

// 创建会话
export function createSession(chatId, data) {
  return request({
    url: '/mag/chat/' + chatId + '/sessions',
    method: 'post',
    data: data
  })
}

// 获取会话详情（消息历史）
export function getSession(chatId, sessionId) {
  return request({
    url: '/mag/chat/' + chatId + '/sessions/' + sessionId,
    method: 'get'
  })
}

// 删除会话
export function delSessions(chatId, ids) {
  return request({
    url: '/mag/chat/' + chatId + '/sessions/' + ids,
    method: 'delete'
  })
}

// ========== SSE Streaming ==========

// 发送消息（SSE 流式响应）— 不使用 Axios，直接 fetch
export function sendMessageStream(chatId, sessionId, question, onChunk, onDone, onError) {
  const url = import.meta.env.VITE_APP_BASE_API + '/mag/chat/' + chatId + '/send'
  const token = localStorage.getItem('token')

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ sessionId, question, stream: true })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('HTTP ' + response.status)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          onDone()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        // Split by SSE event boundaries (double newline)
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const lines = part.split('\n')
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const json = JSON.parse(line.substring(5).trim())
                onChunk(json)
                // Check for final chunk
                if (json.code === 0 && json.data === true) {
                  onDone()
                  return
                }
              } catch (e) {
                // Skip unparseable lines
              }
            }
          }
        }
        read()
      }).catch(err => {
        onError(err)
      })
    }
    read()
  })
  .catch(err => {
    onError(err)
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue3
git add src/api/mag/chat.js
git commit -m "feat: add chat API module with SSE streaming support"
```

---

### Task 6: Frontend Chat Assistant List Page

**Files:**
- Create: `RuoYi-Vue3/src/views/mag/chat/index.vue`

- [ ] **Step 1: Write the chat assistant list page**

```vue
<template>
  <div class="apple-container chat-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">AI 助手</h1>
      <p class="page-subtitle">创建和管理 AI 聊天助手，基于知识库提供智能问答</p>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="apple-btn apple-btn-primary" @click="handleAdd" v-hasPermi="['mag:chat:add']">
          <el-icon class="btn-icon"><plus /></el-icon>
          <span>新建助手</span>
        </button>
      </div>
    </div>

    <!-- Card Grid -->
    <div v-loading="loading" class="chat-card-grid">
      <div
        v-for="chat in chatList"
        :key="chat.id"
        class="chat-card"
      >
        <div class="card-body">
          <div class="card-title-row">
            <span class="card-icon">💬</span>
            <h3 class="card-title">{{ chat.name }}</h3>
          </div>
          <p class="card-desc" v-if="chat.description">{{ chat.description }}</p>
          <p class="card-desc" v-else>未设置描述</p>
          <div class="card-meta">
            <span v-if="chat.dataset_ids && chat.dataset_ids.length">
              关联知识库: {{ chat.dataset_ids.join(', ') }}
            </span>
            <span v-else>未关联知识库</span>
            <span v-if="chat.llm && chat.llm.model_name">模型: {{ chat.llm.model_name }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="apple-btn apple-btn-ghost" @click="handleUpdate(chat)" v-hasPermi="['mag:chat:edit']">
            编辑
          </button>
          <button class="apple-btn apple-btn-ghost" @click="handleDelete(chat)" v-hasPermi="['mag:chat:remove']">
            删除
          </button>
          <button class="apple-btn apple-btn-secondary-pill" @click="handleEnter(chat)">
            进入
          </button>
        </div>
      </div>

      <div v-if="chatList.length === 0 && !loading" class="empty-state">
        <el-icon class="empty-icon"><chat-dot-round /></el-icon>
        <p class="empty-text">还没有任何 AI 助手</p>
        <button class="apple-btn apple-btn-primary" @click="handleAdd" v-hasPermi="['mag:chat:add']">
          创建第一个助手
        </button>
      </div>
    </div>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- Create / Edit Dialog -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="560px"
      class="apple-dialog"
      :close-on-click-modal="false"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="助手名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入助手名称" class="pill-input" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述助手的用途" />
        </el-form-item>
        <el-form-item label="关联知识库">
          <el-select v-model="form.dataset_ids" multiple placeholder="选择知识库（可选）" style="width: 100%">
            <el-option
              v-for="ds in datasetOptions"
              :key="ds.id"
              :label="ds.name"
              :value="ds.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.model" placeholder="如: deepseek-chat（可选）" class="pill-input" />
        </el-form-item>
        <el-form-item label="系统提示词">
          <el-input v-model="form.system_prompt" type="textarea" :rows="4" placeholder="设置助手的角色和行为（可选）" />
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="form.prologue" type="textarea" :rows="2" placeholder="助手开场白（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="dialog.visible = false">取消</button>
          <button class="apple-btn apple-btn-primary" @click="submitForm">保存</button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listChats, addChat, updateChat, delChats } from '@/api/mag/chat'
import { listDataset } from '@/api/mag/knowledgeBase'

const { proxy } = getCurrentInstance()
const router = useRouter()

const loading = ref(false)
const total = ref(0)
const chatList = ref([])
const datasetOptions = ref([])
const formRef = ref(null)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
})

const dialog = reactive({
  visible: false,
  title: '',
  isEdit: false,
  editId: null
})

const form = reactive({
  name: '',
  description: '',
  dataset_ids: [],
  model: '',
  system_prompt: '',
  prologue: ''
})

const rules = {
  name: [{ required: true, message: '请输入助手名称', trigger: 'blur' }]
}

/** Fetch chat assistant list */
function getList() {
  loading.value = true
  listChats(queryParams)
    .then(res => {
      chatList.value = res.rows || []
      total.value = res.total || 0
    })
    .finally(() => { loading.value = false })
}

/** Fetch knowledge base options for dialog select */
function getDatasetOptions() {
  listDataset({ pageNum: 1, pageSize: 100 }).then(res => {
    datasetOptions.value = res.rows || []
  })
}

/** Open create dialog */
function handleAdd() {
  dialog.title = '新建助手'
  dialog.isEdit = false
  dialog.editId = null
  resetForm()
  dialog.visible = true
  getDatasetOptions()
}

/** Open edit dialog */
function handleUpdate(row) {
  dialog.title = '编辑助手'
  dialog.isEdit = true
  dialog.editId = row.id
  form.name = row.name || ''
  form.description = row.description || ''
  form.dataset_ids = row.dataset_ids || []
  form.model = row.llm?.model_name || ''
  form.system_prompt = row.prompt_config?.system || ''
  form.prologue = row.prompt_config?.prologue || ''
  dialog.visible = true
  getDatasetOptions()
}

/** Delete chat assistant */
function handleDelete(row) {
  proxy.$modal.confirm('确定删除助手 "' + row.name + '" 吗？').then(() => {
    return delChats(row.id)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  })
}

/** Enter chat conversation */
function handleEnter(row) {
  router.push({ path: '/mag/chat', query: { chatId: row.id, chatName: row.name } })
}

/** Submit create/edit form */
function submitForm() {
  formRef.value.validate(valid => {
    if (!valid) return
    const payload = {
      name: form.name,
      description: form.description,
      dataset_ids: form.dataset_ids,
      llm: form.model ? { model_name: form.model } : undefined,
      prompt_config: {
        system: form.system_prompt,
        prologue: form.prologue
      }
    }

    const action = dialog.isEdit
      ? updateChat(dialog.editId, payload)
      : addChat(payload)

    action.then(() => {
      proxy.$modal.msgSuccess(dialog.isEdit ? '修改成功' : '创建成功')
      dialog.visible = false
      getList()
    })
  })
}

/** Reset form */
function resetForm() {
  form.name = ''
  form.description = ''
  form.dataset_ids = []
  form.model = ''
  form.system_prompt = ''
  form.prologue = ''
}

onMounted(() => {
  getList()
})
</script>

<style lang="scss" scoped>
.chat-list-page {
  max-width: 800px;
  margin: 0 auto;
}

.chat-card-grid {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 18px;
  padding: 24px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #0066cc;
  }

  .card-body {
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;

      .card-icon {
        font-size: 20px;
      }

      .card-title {
        font-size: 21px;
        font-weight: 600;
        color: #1d1d1f;
        margin: 0;
      }
    }

    .card-desc {
      font-size: 14px;
      color: #7a7a7a;
      margin: 0 0 12px;
      line-height: 1.5;
    }

    .card-meta {
      font-size: 13px;
      color: #86868b;
      display: flex;
      gap: 24px;
    }
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #86868b;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 17px;
    margin: 0 0 24px;
  }
}

/* Apple Design buttons */
.apple-btn-primary {
  background: #0066cc;
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 11px 22px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;

  &:hover {
    background: #0055aa;
  }
}

.apple-btn-ghost {
  background: transparent;
  color: #1d1d1f;
  border: 1px solid #d0d0d0;
  border-radius: 9999px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #0066cc;
    color: #0066cc;
  }
}

.apple-btn-secondary-pill {
  background: transparent;
  color: #0066cc;
  border: 1px solid #0066cc;
  border-radius: 9999px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #0066cc;
    color: #fff;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue3
git add src/views/mag/chat/index.vue
git commit -m "feat: add chat assistant list page with Apple Design cards"
```

---

### Task 7: Frontend Chat Conversation Page

**Files:**
- Create: `RuoYi-Vue3/src/views/mag/chat/chat.vue`

- [ ] **Step 1: Write the chat conversation page**

```vue
<template>
  <div class="chat-shell">
    <!-- Left: Session Panel -->
    <aside class="session-panel">
      <div class="session-header">
        <button class="apple-btn-icon" @click="goBack">
          <el-icon><arrow-left /></el-icon>
        </button>
        <span class="assistant-name">{{ chatName }}</span>
        <button class="apple-btn-icon" @click="handleNewSession">
          <el-icon><plus /></el-icon>
        </button>
      </div>
      <div class="session-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="session-item"
          :class="{ active: s.id === activeSessionId }"
          @click="switchSession(s)"
        >
          <span class="session-label">{{ s.name || formatSessionTime(s.created_at || s.create_time) }}</span>
          <button class="session-delete" @click.stop="handleDeleteSession(s)">
            <el-icon><close /></el-icon>
          </button>
        </div>
        <div v-if="sessions.length === 0" class="session-empty">
          暂无会话
        </div>
      </div>
    </aside>

    <!-- Right: Chat Area -->
    <main class="chat-area">
      <!-- Messages -->
      <div class="message-list" ref="messageListRef">
        <!-- Prologue -->
        <div v-if="prologue && messages.length === 0" class="message-bubble ai-bubble">
          {{ prologue }}
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message-row"
          :class="msg.role === 'user' ? 'user-row' : 'ai-row'"
        >
          <div class="message-bubble" :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'">
            <div class="message-text" v-html="renderMessage(msg)"></div>
            <!-- References -->
            <div v-if="msg.references && msg.references.length" class="reference-block">
              <div v-for="(ref, ri) in msg.references" :key="ri" class="reference-item">
                <span class="ref-icon">📄</span>
                <span class="ref-name">引用自: {{ ref.name || ref.doc_name || '未知文档' }}</span>
                <p class="ref-snippet" v-if="ref.snippet">"{{ ref.snippet }}"</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Streaming bubble -->
        <div v-if="streaming" class="message-row ai-row">
          <div class="message-bubble ai-bubble">
            <div class="message-text">{{ streamingText }}<span class="cursor-blink">|</span></div>
          </div>
        </div>
      </div>

      <!-- Input bar -->
      <div class="input-bar">
        <div class="input-wrapper">
          <input
            v-model="inputText"
            class="message-input"
            placeholder="输入消息..."
            :disabled="streaming"
            @keyup.enter="handleSend"
          />
        </div>
        <button
          class="apple-btn-primary send-btn"
          :disabled="!inputText.trim() || streaming"
          @click="handleSend"
        >
          发送
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { listSessions, createSession, delSessions, getSession, sendMessageStream } from '@/api/mag/chat'

const { proxy } = getCurrentInstance()
const router = useRouter()
const route = useRoute()

const chatId = route.query.chatId
const chatName = ref(route.query.chatName || 'AI 助手')
const prologue = ref('')

const sessions = ref([])
const activeSessionId = ref(null)
const messages = ref([])
const inputText = ref('')
const streaming = ref(false)
const streamingText = ref('')
const messageListRef = ref(null)

/** Go back to assistant list */
function goBack() {
  router.push('/mag/index')
}

/** Load sessions */
function loadSessions() {
  listSessions(chatId, { page: 1, pageSize: 50 }).then(res => {
    sessions.value = res.rows || []
  })
}

/** Create a new session */
function handleNewSession() {
  const name = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  createSession(chatId, { name }).then(res => {
    proxy.$modal.msgSuccess('新会话创建成功')
    loadSessions()
    const newSession = res.data
    activeSessionId.value = newSession.id
    messages.value = []
  })
}

/** Switch to a session */
function switchSession(session) {
  activeSessionId.value = session.id
  loadMessages(session.id)
}

/** Load message history for a session */
function loadMessages(sessionId) {
  getSession(chatId, sessionId).then(res => {
    const data = res.data
    if (data && data.messages) {
      messages.value = data.messages.map(m => ({
        role: m.role,
        content: m.content,
        references: m.reference || []
      }))
    }
    scrollToBottom()
  })
}

/** Delete a session */
function handleDeleteSession(session) {
  proxy.$modal.confirm('确定删除该会话吗？').then(() => {
    return delSessions(chatId, session.id)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    if (activeSessionId.value === session.id) {
      activeSessionId.value = null
      messages.value = []
    }
    loadSessions()
  })
}

/** Send message */
function handleSend() {
  if (!inputText.value.trim() || streaming.value) return

  const question = inputText.value.trim()
  inputText.value = ''

  // Ensure a session exists
  if (!activeSessionId.value) {
    createSession(chatId, { name: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-') }).then(res => {
      activeSessionId.value = res.data.id
      messages.value.push({ role: 'user', content: question })
      startStreaming(question)
      loadSessions()
    })
  } else {
    messages.value.push({ role: 'user', content: question })
    startStreaming(question)
  }
}

/** Start SSE streaming */
function startStreaming(question) {
  streaming.value = true
  streamingText.value = ''

  sendMessageStream(
    chatId,
    activeSessionId.value,
    question,
    (chunk) => {
      // On each chunk
      if (chunk.data && chunk.data.answer) {
        streamingText.value += chunk.data.answer
        scrollToBottom()
      }
      if (chunk.data && chunk.data.reference) {
        // Store reference for later use
      }
    },
    () => {
      // On done
      messages.value.push({
        role: 'assistant',
        content: streamingText.value,
        references: []
      })
      streamingText.value = ''
      streaming.value = false
      scrollToBottom()
    },
    (err) => {
      // On error
      proxy.$modal.msgError('消息发送失败: ' + err.message)
      streaming.value = false
      streamingText.value = ''
    }
  )
}

/** Render message content (support newlines) */
function renderMessage(msg) {
  return msg.content ? msg.content.replace(/\n/g, '<br>') : ''
}

/** Format session time */
function formatSessionTime(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Auto-scroll to bottom */
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

onMounted(() => {
  loadSessions()
})
</script>

<style lang="scss" scoped>
.chat-shell {
  display: flex;
  height: calc(100vh - 84px - 32px);
  background: #f5f5f7;

  .session-panel {
    width: 280px;
    min-width: 280px;
    background: #f5f5f7;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;

    .session-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;

      .assistant-name {
        flex: 1;
        font-size: 15px;
        font-weight: 600;
        color: #1d1d1f;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .apple-btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        color: #1d1d1f;
        font-size: 18px;
        display: flex;
        align-items: center;

        &:hover { background: rgba(0,0,0,0.04); }
      }
    }

    .session-list {
      flex: 1;
      overflow-y: auto;

      .session-item {
        display: flex;
        align-items: center;
        height: 44px;
        padding: 0 16px;
        cursor: pointer;
        font-size: 14px;
        color: #1d1d1f;
        transition: background 0.15s;

        &:hover { background: rgba(0,0,0,0.04); }

        &.active {
          background: #ffffff;
          border-left: 3px solid #0066cc;
        }

        .session-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .session-delete {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: #86868b;
          padding: 2px;

          &:hover { color: #ff3b30; }
        }

        &:hover .session-delete { display: flex; }
      }

      .session-empty {
        text-align: center;
        padding: 32px 16px;
        color: #86868b;
        font-size: 14px;
      }
    }
  }

  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #f5f5f7;

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      .message-row {
        display: flex;

        &.user-row { justify-content: flex-end; }
        &.ai-row { justify-content: flex-start; }
      }

      .message-bubble {
        max-width: 70%;
        padding: 16px 20px;
        border-radius: 18px;
        font-size: 17px;
        line-height: 1.47;
        color: #1d1d1f;

        &.ai-bubble {
          background: #ffffff;
        }

        &.user-bubble {
          background: #ffffff;
          border: 1px solid #0066cc;
        }
      }

      .reference-block {
        margin-top: 12px;
        padding: 12px;
        background: #f5f5f7;
        border-radius: 8px;
        font-size: 14px;
        color: #7a7a7a;

        .reference-item {
          .ref-icon { margin-right: 4px; }
          .ref-name { font-weight: 500; }
          .ref-snippet {
            margin: 4px 0 0;
            font-style: italic;
          }
        }
      }

      .cursor-blink {
        animation: blink 1s step-end infinite;
      }

      @keyframes blink {
        50% { opacity: 0; }
      }
    }

    .input-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: #f5f5f7;
      border-top: 1px solid #e0e0e0;

      .input-wrapper {
        flex: 1;

        .message-input {
          width: 100%;
          height: 44px;
          border-radius: 9999px;
          border: 1px solid #e0e0e0;
          background: #f5f5f7;
          padding: 0 20px;
          font-size: 17px;
          color: #1d1d1f;
          outline: none;
          box-sizing: border-box;

          &:focus {
            border-color: #0066cc;
            background: #ffffff;
          }

          &::placeholder {
            color: #86868b;
          }
        }
      }

      .send-btn {
        background: #0066cc;
        color: #fff;
        border: none;
        border-radius: 9999px;
        padding: 11px 22px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;

        &:hover:not(:disabled) {
          background: #0055aa;
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue3
git add src/views/mag/chat/chat.vue
git commit -m "feat: add chat conversation page with session panel and SSE streaming"
```

---

### Task 8: SQL Menu Entries

**Files:**
- Modify: `RuoYi-Vue/sql/ragflow_knowledge_base_menu.sql` (append at end)

- [ ] **Step 1: Append menu SQL**

Append to the end of the file:

```sql
-- ==============================
-- AI 聊天助手 — 菜单与权限
-- ==============================

-- 一级菜单：AI 助手
insert into sys_menu values('2014', 'AI助手', '0', '6', 'mag', null, '', '', 1, 0, 'M', '0', '0', '', 'chat', 'admin', sysdate(), '', null, 'AI助手管理目录');

-- 二级菜单：助手列表
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

- [ ] **Step 2: Commit**

```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue
git add sql/ragflow_knowledge_base_menu.sql
git commit -m "feat: add AI chat assistant menu and permission entries"
```

---

### Task 9: Execute SQL and Verify

**Files:**
- None (manual DB step)

- [ ] **Step 1: Execute the menu SQL against the MySQL database**

Run:
```bash
mysql -u root -p ry-vue < /Users/zhaoai/carecubeAi/RuoYi-Vue/sql/ragflow_knowledge_base_menu.sql
```
(Or use the specific insert statements for IDs 2014-2020)

- [ ] **Step 2: Restart the backend**

Run:
```bash
cd /Users/zhaoai/carecubeAi/RuoYi-Vue && mvn spring-boot:run -pl ruoyi-admin
```

- [ ] **Step 3: Test API endpoints**

```bash
# Test list chats
curl -s http://localhost:8081/mag/chat/list \
  -H "Authorization: Bearer <TOKEN>" | jq .

# Test create chat
curl -s -X POST http://localhost:8081/mag/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"测试助手","description":"测试"}' | jq .
```

Expected: JSON responses with `code: 200`

- [ ] **Step 4: Test frontend**

Run: `cd /Users/zhaoai/carecubeAi/RuoYi-Vue3 && yarn dev`
Open browser → login → "AI 助手" menu → verify the page renders

- [ ] **Step 5: Commit any final adjustments**

```bash
git add -A && git commit -m "chore: final adjustments for chat assistant feature"
```

---

## Verification Checklist

After all tasks complete, verify:

1. [ ] Backend starts without errors
2. [ ] Menu SQL inserts successfully (no duplicate keys)
3. [ ] Sidebar shows "AI 助手" menu with "助手列表" item
4. [ ] Chat assistant list page renders with Apple Design cards
5. [ ] "新建助手" dialog opens and saves to RAGFlow
6. [ ] "编辑" populates form with existing chat data
7. [ ] "删除" confirms and removes the chat
8. [ ] "进入" navigates to chat conversation page
9. [ ] Session panel shows sessions for current user
10. [ ] Creating new session works
11. [ ] Sending message triggers SSE streaming
12. [ ] AI response appears character-by-character
13. [ ] Streaming cursor blinks during response
14. [ ] Response finalizes when streaming completes
15. [ ] Deleting session works
16. [ ] User isolation: user A cannot see user B's sessions
