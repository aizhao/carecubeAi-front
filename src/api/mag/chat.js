import request from '@/utils/request'
import { getToken } from '@/utils/auth'

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
// 返回 abort 函数用于取消请求（组件卸载时调用）
export function sendMessageStream(chatId, sessionId, question, onChunk, onDone, onError) {
  const url = import.meta.env.VITE_APP_BASE_API + '/mag/chat/' + chatId + '/send'
  const token = getToken()
  const controller = new AbortController()
  let stopped = false

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ sessionId, question, stream: true }),
    signal: controller.signal
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
        if (done || stopped) {
          if (!stopped) onDone()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const lines = part.split('\n')
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const content = line.substring(5).trim()
              if (content === '[DONE]') {
                stopped = true
                onDone()
                return
              }
              try {
                const json = JSON.parse(content)
                if (!stopped) onChunk(json)
              } catch (e) {
                // Skip unparseable lines
              }
            }
          }
        }
        if (!stopped) read()
      }).catch(err => {
        if (!stopped) onError(err)
      })
    }
    read()
  })
  .catch(err => {
    if (!stopped) onError(err)
  })

  return () => {
    stopped = true
    controller.abort()
  }
}
