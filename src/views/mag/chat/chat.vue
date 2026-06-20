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
          <span class="session-label">{{ s.name || formatSessionTime(s.create_time || s.created_at) }}</span>
          <button class="session-delete" @click.stop="handleDeleteSession(s)">
            <el-icon><close /></el-icon>
          </button>
        </div>
        <div v-if="sessions.length === 0" class="session-empty">暂无会话</div>
      </div>
    </aside>

    <!-- Right: Chat Area -->
    <main class="chat-area">
      <div class="message-list" ref="messageListRef">
        <div v-if="messages.length === 0 && !streaming" class="welcome-message">
          <p>开始对话吧</p>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message-row"
          :class="msg.role === 'user' ? 'user-row' : 'ai-row'"
        >
          <img v-if="msg.role === 'assistant'" class="msg-avatar" :src="aiAvatar" alt="AI" />
          <div class="message-bubble" :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'">
            <div v-if="msg.role === 'assistant' && msg.thinkContent" class="think-block">
              <div class="think-header" @click="msg.thinkCollapsed = !msg.thinkCollapsed">
                <span>思考过程</span>
                <span class="think-toggle">{{ msg.thinkCollapsed ? '展开' : '折叠' }}</span>
              </div>
              <div v-if="!msg.thinkCollapsed" class="think-body">{{ msg.thinkContent }}</div>
            </div>
            <div class="message-text" v-html="renderMessage(msg)"></div>
            <!-- Related files -->
            <div v-if="msg.role === 'assistant' && msg.references && fileList(msg.references).length > 0" class="related-files">
              <div class="files-header">相关文件</div>
              <div
                v-for="(file, fi) in fileList(msg.references)"
                :key="fi"
                class="file-item"
                @click="handleFileClick(file, msg.references)"
              >
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file.doc_name || '未知文档' }}</span>
                <span class="file-count">{{ file.count }} 个片段</span>
                <button
                  class="file-download-btn"
                  @click.stop="handleDownload(msg.references.chunks?.find(c => c.document_id === file.doc_id)?.dataset_id || '', file.doc_id, file.doc_name)"
                >
                  下载
                </button>
              </div>
            </div>
          </div>
          <img v-if="msg.role === 'user'" class="msg-avatar user-avatar" :src="userAvatar" alt="我" />
        </div>

        <!-- Waiting animation -->
        <div v-if="waiting && !streamingText && !streamingThink" class="message-row ai-row">
          <img class="msg-avatar" :src="aiAvatar" alt="AI" />
          <div class="message-bubble ai-bubble waiting-bubble">
            <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>

        <!-- Streaming bubble -->
        <div v-if="streaming && (streamingText || streamingThink)" class="message-row ai-row">
          <img class="msg-avatar" :src="aiAvatar" alt="AI" />
          <div class="message-bubble ai-bubble">
            <div v-if="!streamingThinkDone || streamingThink" class="think-block streaming">
              <div class="think-header">
                <span v-if="!streamingThinkDone" class="thinking-dot">思考中<span class="dot-anim">...</span></span>
                <span v-else>思考过程</span>
              </div>
              <div v-if="streamingThink" class="think-body">{{ streamingThink }}</div>
            </div>
            <div v-if="streamingText" class="message-text">{{ streamingText }}<span class="cursor-blink">|</span></div>
          </div>
        </div>
      </div>

      <!-- Citation popover -->
      <Teleport to="body">
        <div
          v-if="popover.show"
          class="citation-popover"
          :style="popoverStyle"
          @mouseenter="onPopoverEnter"
          @mouseleave="onPopoverLeave"
        >
          <div class="popover-body">{{ popover.content }}</div>
          <div class="popover-footer">
            <span class="popover-doc-name">{{ popover.docName }}</span>
            <button
              v-if="popover.docId && popover.datasetId"
              class="popover-download-btn"
              @click="handleDownload(popover.datasetId, popover.docId, popover.docName)"
            >
              下载
            </button>
          </div>
        </div>
      </Teleport>

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
          class="send-btn"
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
import { ref, reactive, getCurrentInstance, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listSessions, createSession, delSessions, getSession, sendMessageStream } from '@/api/mag/chat'
import { marked } from 'marked'
import { buildCitationHtml, buildFileList, hasCitationMarkers } from '@/utils/citations'
import { getToken } from '@/utils/auth'
import useUserStore from '@/store/modules/user'
import aiLogo from '@/assets/logo/carecube.jpg'

const { proxy } = getCurrentInstance()
const router = useRouter()
const userStore = useUserStore()

const chatId = import.meta.env.VITE_APP_CHAT_ASSISTANT_ID
const chatName = ref('AI 助手')
const userAvatar = computed(() => userStore.avatar)
const aiAvatar = aiLogo

const sessions = ref([])
const activeSessionId = ref(null)
const messages = ref([])
const inputText = ref('')
const streaming = ref(false)
const waiting = ref(false)
const streamingText = ref('')
const streamingThink = ref('')
const streamingThinkDone = ref(false)
const messageListRef = ref(null)

// Citation popover state
const popover = reactive({
  show: false,
  content: '',
  docName: '',
  docId: '',
  datasetId: '',
  x: 0,
  y: 0,
  placement: 'above'
})
let popoverTimer = null
let popoverHovering = false

function goBack() {
  router.push('/index')
}

function loadSessions() {
  if (!chatId) return
  listSessions(chatId, { page: 1, pageSize: 50 }).then(res => {
    sessions.value = res.rows || []
    // Auto-enter the most recent session
    if (!activeSessionId.value && sessions.value.length > 0) {
      switchSession(sessions.value[0])
    }
  }).catch(() => {
    // silently handle load error
  })
}

function handleNewSession() {
  const name = '新对话 ' + (sessions.value.length + 1)
  createSession(chatId, { name }).then(res => {
    proxy.$modal.msgSuccess('新会话创建成功')
    const newSession = res.data
    if (newSession) {
      loadSessions()
      switchSession(newSession)
    }
  })
}

function switchSession(session) {
  activeSessionId.value = session.id
  loadMessages(session.id)
}

function parseThinkContent(content) {
  if (!content) return { think: '', answer: content || '' }
  const lastThinkClose = content.lastIndexOf('</think>')
  if (lastThinkClose === -1) return { think: '', answer: content }
  const answer = content.substring(lastThinkClose + 8).trim()
  const think = content.substring(0, lastThinkClose).replace(/<\/?think>/g, '').trim()
  return { think, answer }
}

function loadMessages(sessionId) {
  getSession(chatId, sessionId).then(res => {
    const data = res.data
    if (data && data.messages) {
      const sessionRefs = Array.isArray(data.reference) ? data.reference : []
      // Collect assistant message indices
      const assistantIndices = []
      data.messages.forEach((m, i) => {
        if (m.role === 'assistant') assistantIndices.push(i)
      })
      // Populated refs (those with actual chunk data)
      const populatedRefs = sessionRefs.filter(r => r && r.chunks && r.chunks.length > 0)

      // RAGFlow stores references newest-first; match from the end:
      // last assistant message gets last populated ref, etc.
      const refByAssistIdx = new Map()
      let refCursor = populatedRefs.length - 1
      for (let i = assistantIndices.length - 1; i >= 0; i--) {
        const ref = refCursor >= 0 ? populatedRefs[refCursor] : {}
        refByAssistIdx.set(i, ref)
        if (refCursor >= 0) refCursor--
      }

      messages.value = data.messages.map((m, rawIdx) => {
        if (m.role === 'assistant') {
          const assistIdx = assistantIndices.indexOf(rawIdx)
          const ref = refByAssistIdx.get(assistIdx) || {}
          if (m.content && m.content.includes('<think>')) {
            const { think, answer } = parseThinkContent(m.content)
            return {
              role: m.role,
              content: answer,
              thinkContent: think,
              references: ref
            }
          }
          return {
            role: m.role,
            content: m.content,
            thinkContent: m.think || m.reasoning_content || '',
            references: ref
          }
        }
        return {
          role: m.role,
          content: m.content,
          thinkContent: '',
          references: {}
        }
      })
    } else {
      messages.value = []
    }
    scrollToBottom()
  }).catch(err => {
    console.error('[loadMessages] error:', err)
  })
}

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

function handleSend() {
  if (!inputText.value.trim() || streaming.value) return

  const question = inputText.value.trim()
  inputText.value = ''

  if (!activeSessionId.value) {
    const sessionName = question.length > 20 ? question.slice(0, 20) + '...' : question
    createSession(chatId, { name: sessionName }).then(res => {
      const newSession = res.data
      if (newSession) {
        loadSessions()
        activeSessionId.value = newSession.id
      }
      messages.value.push({ role: 'user', content: question })
      startStreaming(question)
    })
  } else {
    messages.value.push({ role: 'user', content: question })
    startStreaming(question)
  }
}

function startStreaming(question) {
  streaming.value = true
  waiting.value = true
  streamingText.value = ''
  streamingThink.value = ''
  streamingThinkDone.value = true  // RAGFlow native API has no reasoning_content
  let references = {}
  let answerBuffer = ''
  let thinking = false
  let thinkBuffer = ''
  let streamFinalReceived = false

  sendMessageStream(
    chatId,
    activeSessionId.value,
    question,
    (chunk) => {
      // RAGFlow native API format:
      // {code: 0, data: {answer: "...", reference: {...}, start_to_think: bool, end_to_think: bool, final: bool}}
      if (chunk.code !== 0) return
      if (typeof chunk.data !== 'object' || chunk.data === null) return
      // After final=true, a duplicate complete response arrives — ignore it
      if (streamFinalReceived) return

      const answer = chunk.data.answer || ''
      const ref = chunk.data.reference
      const startToThink = chunk.data.start_to_think
      const endToThink = chunk.data.end_to_think
      const isFinal = chunk.data.final

      if (startToThink) {
        thinking = true
        waiting.value = false
        streamingThink.value = ''
        streamingThinkDone.value = false
        nextTick(() => scrollToBottom())
        return
      }

      if (endToThink) {
        thinking = false
        streamingThinkDone.value = true
        return
      }

      if (!answer) return

      if (thinking) {
        // During thinking phase: accumulate as think content
        thinkBuffer += answer
        streamingThink.value = thinkBuffer
      }

      if (isFinal) {
        // Final chunk has <think> tags + complete answer (duplicate) — ignore its answer
        streamFinalReceived = true
      } else if (!thinking) {
        // Real answer after end_to_think (or plain model with no think phase)
        waiting.value = false
        answerBuffer += answer
        streamingText.value = answerBuffer
      }

      nextTick(() => scrollToBottom())

      if (ref && typeof ref === 'object' && Object.keys(ref).length > 0) {
        references = ref
      }
    },
    () => {
      // Keep locally accumulated message with proper think/answer separation
      messages.value.push({
        role: 'assistant',
        content: answerBuffer.trim(),
        thinkContent: thinkBuffer.trim(),
        references: references
      })
      streamingText.value = ''
      streamingThink.value = ''
      streamingThinkDone.value = false
      answerBuffer = ''
      thinkBuffer = ''
      references = {}
      streaming.value = false
      waiting.value = false
      nextTick(() => scrollToBottom())
    },
    (err) => {
      proxy.$modal.msgError('消息发送失败: ' + err.message)
      streaming.value = false
      waiting.value = false
    }
  )
}

function renderMessage(msg) {
  if (!msg.content) return ''
  let text = msg.content
  // Apply citation badges if references with chunks exist, or if content has markers
  const chunks = msg.references?.chunks
  if (chunks && chunks.length > 0) {
    text = buildCitationHtml(text, chunks)
  } else if (hasCitationMarkers(text)) {
    // Fallback: render badges with empty chunks (badges show, tooltip has no content)
    text = buildCitationHtml(text, [])
  }
  return marked.parse(text)
}

function fileList(references) {
  if (!references) return []
  return buildFileList(references.chunks, references.doc_aggs)
}

function handleFileClick(file, references) {
  if (!references || !references.chunks) return
  const chunks = references.chunks.filter(c => c.document_id === file.doc_id)
  if (chunks.length === 0) return
  const preview = chunks
    .map((c, i) => `[片段 ${i + 1}] ${c.content || '(无内容)'}`)
    .join('\n\n---\n\n')
  proxy.$modal.alert(
    preview,
    file.doc_name || '文档预览',
    {
      confirmButtonText: '关闭',
      customClass: 'file-preview-dialog',
      dangerouslyUseHTMLString: false
    }
  )
}

// ========== Citation Popover ==========

const popoverStyle = computed(() => {
  // Center horizontally over badge center; anchor top or bottom edge
  const transform = popover.placement === 'above'
    ? 'translate(-50%, -100%)'
    : 'translateX(-50%)'
  return {
    left: popover.x + 'px',
    top: popover.y + 'px',
    transform
  }
})

function showPopover(badgeEl, index) {
  // Find which message this badge belongs to
  const bubble = badgeEl.closest('.message-bubble')
  if (!bubble) return
  const row = bubble.closest('.message-row')
  if (!row) return
  const allRows = [...messageListRef.value.querySelectorAll('.message-row')]
  const msgIdx = allRows.indexOf(row)
  if (msgIdx < 0) return
  const msg = messages.value[msgIdx]
  if (!msg || !msg.references || !msg.references.chunks) return
  const chunk = msg.references.chunks[index]
  if (!chunk) return

  const rect = badgeEl.getBoundingClientRect()

  popover.content = chunk.content || ''
  popover.docName = chunk.document_name || chunk.doc_name || ''
  popover.docId = chunk.document_id || ''
  popover.datasetId = chunk.dataset_id || ''

  // Position above the badge, centered horizontally
  const popoverWidth = 320
  // x = badge center, clamped so popover stays in viewport
  const centerX = rect.left + rect.width / 2
  popover.x = Math.max(popoverWidth / 2 + 8, Math.min(window.innerWidth - popoverWidth / 2 - 8, centerX))

  // y = anchor point. "above" → popover bottom edge here; "below" → popover top edge here
  if (rect.top < 220) {
    // Not enough room above, show below the badge
    popover.y = rect.bottom + 8
    popover.placement = 'below'
  } else {
    popover.y = rect.top - 8
    popover.placement = 'above'
  }
  popover.show = true
}

function hidePopover() {
  popoverTimer = setTimeout(() => {
    if (!popoverHovering) {
      popover.show = false
    }
  }, 150)
}

function onBadgeMouseEnter(event) {
  const target = event.target instanceof Element ? event.target : event.target.parentElement
  const badge = target?.closest('.citation-badge')
  if (!badge) return
  clearTimeout(popoverTimer)
  const index = parseInt(badge.getAttribute('data-citation-index'), 10)
  if (!isNaN(index)) {
    showPopover(badge, index)
  }
}

function onBadgeMouseLeave(event) {
  const target = event.target instanceof Element ? event.target : event.target.parentElement
  const badge = target?.closest('.citation-badge')
  // Only hide if we're actually leaving the badge (not moving into a child)
  if (!badge) return
  const related = event.relatedTarget instanceof Element ? event.relatedTarget : event.relatedTarget?.parentElement
  if (related && badge.contains(related)) return
  hidePopover()
}

function onPopoverEnter() {
  popoverHovering = true
  clearTimeout(popoverTimer)
}

function onPopoverLeave() {
  popoverHovering = false
  popover.show = false
}

function handleDownload(datasetId, documentId, fileName) {
  const url = import.meta.env.VITE_APP_BASE_API + '/mag/chat/document/download/' + datasetId + '/' + documentId
  const token = getToken()
  fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
    .then(res => {
      if (!res.ok) throw new Error('下载失败')
      return res.blob()
    })
    .then(blob => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName || documentId
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    })
    .catch(() => {
      proxy.$modal.msgError('文件下载失败')
    })
}

function formatSessionTime(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (isToday) return time
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + time
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

onMounted(() => {
  loadSessions()
  // Citation badge hover delegation
  if (messageListRef.value) {
    messageListRef.value.addEventListener('mouseover', onBadgeMouseEnter)
    messageListRef.value.addEventListener('mouseout', onBadgeMouseLeave)
  }
})

onBeforeUnmount(() => {
  if (messageListRef.value) {
    messageListRef.value.removeEventListener('mouseover', onBadgeMouseEnter)
    messageListRef.value.removeEventListener('mouseout', onBadgeMouseLeave)
  }
  clearTimeout(popoverTimer)
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

        .session-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

      .welcome-message {
        text-align: center;
        color: #86868b;
        font-size: 17px;
        margin-top: 40px;
      }

      .message-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        &.user-row { justify-content: flex-end; }
        &.ai-row { justify-content: flex-start; }
      }

      .msg-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        &.user-avatar {
          order: 2;
        }
      }

      .message-bubble {
        max-width: 70%;
        padding: 16px 20px;
        border-radius: 18px;
        font-size: 17px;
        line-height: 1.47;
        color: #1d1d1f;

        &.ai-bubble { background: #ffffff; }
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
          .ref-snippet { margin: 4px 0 0; font-style: italic; }
        }
      }

      .related-files {
        margin-top: 14px;
        padding: 12px 14px;
        background: #fafafa;
        border-radius: 10px;
        border: 1px solid #ebebeb;

        .files-header {
          font-size: 13px;
          font-weight: 600;
          color: #86868b;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          font-size: 14px;
          color: #1d1d1f;

          &:hover {
            background: #f0f0f0;
          }

          .file-icon {
            font-size: 16px;
            flex-shrink: 0;
          }

          .file-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #0066cc;
          }

          .file-count {
            font-size: 12px;
            color: #86868b;
            flex-shrink: 0;
          }

          .file-download-btn {
            background: none;
            border: 1px solid #0066cc;
            color: #0066cc;
            font-size: 12px;
            padding: 3px 10px;
            border-radius: 9999px;
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.15s;

            &:hover {
              background: #0066cc;
              color: #fff;
            }
          }
        }
      }

      .think-block {
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;

        .think-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 13px;
          color: #86868b;
          cursor: default;

          .think-toggle {
            color: #0066cc;
            cursor: pointer;
            font-size: 12px;
            &:hover { opacity: 0.7; }
          }

          .thinking-dot {
            color: #a1a1a6;
          }
        }

        .dot-anim {
          animation: dotPulse 1.4s ease-in-out infinite;
        }

        .think-body {
          font-size: 14px;
          color: #a1a1a6;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          border-left: 2px solid #d0d0d0;
          padding-left: 10px;
        }
      }

      @keyframes dotPulse {
        0%, 20% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }

      .cursor-blink {
        animation: blink 1s step-end infinite;
      }

      @keyframes blink {
        50% { opacity: 0; }
      }

      .waiting-bubble {
        padding: 20px 28px;
      }

      .typing-dots {
        display: flex;
        gap: 4px;
        align-items: center;
        span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #86868b;
          animation: dotBounce 1.2s ease-in-out infinite;
          &:nth-child(2) { animation-delay: 0.2s; }
          &:nth-child(3) { animation-delay: 0.4s; }
        }
      }

      @keyframes dotBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    }

    // Markdown content styles
    .message-text {
      :deep(p) { margin: 0 0 8px; &:last-child { margin-bottom: 0; } }
      :deep(strong) { font-weight: 600; }
      :deep(em) { font-style: italic; }
      :deep(a) { color: #0066cc; text-decoration: none; &:hover { text-decoration: underline; } }
      :deep(code) {
        font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        background: rgba(0,0,0,0.05);
        padding: 2px 6px;
        border-radius: 4px;
      }
      :deep(pre) {
        background: #1d1d1f;
        color: #f5f5f7;
        padding: 16px;
        border-radius: 12px;
        overflow-x: auto;
        margin: 12px 0;
        code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: 14px;
          line-height: 1.6;
        }
      }
      :deep(ul), :deep(ol) { padding-left: 20px; margin: 8px 0; }
      :deep(li) { margin: 4px 0; }
      :deep(blockquote) {
        border-left: 3px solid #d0d0d0;
        padding-left: 12px;
        margin: 8px 0;
        color: #86868b;
      }
      :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
        font-weight: 600;
        margin: 16px 0 8px;
        line-height: 1.3;
      }
      :deep(h1) { font-size: 21px; }
      :deep(h2) { font-size: 19px; }
      :deep(h3) { font-size: 17px; }
      :deep(table) {
        border-collapse: collapse;
        margin: 12px 0;
        width: 100%;
        th, td {
          border: 1px solid #e0e0e0;
          padding: 8px 12px;
          text-align: left;
          font-size: 15px;
        }
        th { background: #f5f5f7; font-weight: 600; }
      }
      :deep(hr) { border: none; border-top: 1px solid #e0e0e0; margin: 16px 0; }

      // Citation badges
      :deep(.citation-badge) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        margin: 0 1px;
        border-radius: 4px;
        background: #e8f0fe;
        color: #0066cc;
        font-size: 11px;
        font-weight: 600;
        vertical-align: super;
        cursor: pointer;
        position: relative;
        transition: background 0.15s;

        &:hover {
          background: #0066cc;
          color: #fff;
        }
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

          &:focus { border-color: #0066cc; background: #ffffff; }
          &::placeholder { color: #86868b; }
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

        &:hover:not(:disabled) { background: #0055aa; }
        &:disabled { opacity: 0.4; cursor: not-allowed; }
      }
    }
  }
}
// Citation popover — teleported to <body>, must be at root level so scoped selector matches
.citation-popover {
  position: fixed;
  max-width: 320px;
  min-width: 200px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 9999;
  pointer-events: auto;

  .popover-body {
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.5;
    color: #7a7a7a;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 180px;
    overflow-y: auto;
  }

  .popover-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    border-top: 1px solid #f0f0f0;
    gap: 8px;

    .popover-doc-name {
      font-size: 12px;
      color: #1d1d1f;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .popover-download-btn {
      background: none;
      border: 1px solid #0066cc;
      color: #0066cc;
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 9999px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;

      &:hover {
        background: #0066cc;
        color: #fff;
      }
    }
  }
}
</style>
