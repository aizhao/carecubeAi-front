import { ref } from 'vue'
import { getToken } from '@/utils/auth'

export function useAgentStream() {
  const streaming = ref(false)
  const statusText = ref('')
  let controller = null

  async function startStream(agentCode, payload, handlers = {}) {
    abortStream()
    controller = new AbortController()
    streaming.value = true
    statusText.value = '正在启动分析…'

    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}/mag/agent/${encodeURIComponent(agentCode)}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + getToken()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      await readSse(response, (event) => {
        if (event.type === 'status') {
          statusText.value = event.content || '智能分析处理中'
        }
        if (event.type === 'done') {
          streaming.value = false
          statusText.value = ''
        }
        if (event.type === 'error') {
          streaming.value = false
          statusText.value = ''
        }
        handlers.onEvent?.(event)
      })

      streaming.value = false
      statusText.value = ''
      handlers.onDone?.()
    } catch (error) {
      if (error.name !== 'AbortError') {
        streaming.value = false
        statusText.value = ''
        handlers.onError?.(error)
      }
    } finally {
      controller = null
    }
  }

  function abortStream() {
    if (controller) {
      controller.abort()
      controller = null
    }
    streaming.value = false
    statusText.value = ''
  }

  return {
    streaming,
    statusText,
    startStream,
    abortStream
  }
}

async function readSse(response, onEvent) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const dataLine = part.split('\n').find(line => line.startsWith('data:'))
      if (!dataLine) continue
      const payload = dataLine.substring(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        onEvent(JSON.parse(payload))
      } catch (error) {
        // Ignore malformed SSE fragments; backend errors arrive as normalized error events.
      }
    }
  }
}
