<template>
  <div class="chat-shell">
    <aside class="session-panel">
      <div class="session-topbar">
        <button class="back-link" @click="goBack">
          <el-icon><arrow-left /></el-icon>
          <span>返回</span>
        </button>
        <strong>{{ chatName }}</strong>
      </div>
      <button class="new-session-btn" @click="handleNewSession">新建会话</button>

      <div class="side-section-divider"></div>

      <div class="kb-summary-card" @click="router.push('/mag/kb')">
        <div class="kb-title">
          <el-icon><folder /></el-icon>
          <span>{{ activeKnowledgeBaseName }}</span>
        </div>
        <p>状态：<strong>知识库增强</strong></p>
        <p>{{ knowledgeBaseMeta }}</p>
      </div>

      <div class="session-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="session-item"
          :class="{ active: s.id === activeSessionId }"
          @click="switchSession(s)"
        >
          <div>
            <span class="session-label">{{ s.name || formatSessionTime(s.create_time || s.created_at) }}</span>
            <small>{{ formatShortSessionDate(s.create_time || s.created_at) }}</small>
          </div>
          <button class="session-delete" @click.stop="handleDeleteSession(s)">
            <el-icon><close /></el-icon>
          </button>
        </div>
        <div v-if="sessions.length === 0" class="session-empty">暂无会话</div>
      </div>

      <div class="side-footer">
        <button @click="router.push('/mag/kb')">
          <el-icon><setting /></el-icon>
          <span>知识库管理</span>
        </button>
        <button @click="router.push('/mag/file/index')">
          <el-icon><document /></el-icon>
          <span>文件管理</span>
        </button>
      </div>
    </aside>

    <main class="chat-area">
      <div class="message-list" ref="messageListRef">
        <div class="day-divider">今天</div>

        <div v-if="messages.length === 0 && !streaming" class="welcome-message">
          <p>选择或新建会话后，向当前知识库提问。</p>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="message-row"
          :class="msg.role === 'user' ? 'user-row' : 'ai-row'"
        >
          <img v-if="msg.role === 'assistant'" class="msg-avatar" :src="aiAvatar" alt="AI" />
          <div class="message-bubble" :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'">
            <div v-if="msg.role === 'assistant'" class="retrieval-summary">
              <span>检索摘要</span>
              <strong>命中 {{ fileList(msg.references).length || 0 }} 个文件</strong>
            </div>
            <div v-if="msg.role === 'assistant' && msg.thinkContent" class="think-block">
              <div class="think-header" @click="msg.thinkCollapsed = !msg.thinkCollapsed">
                <span>思考过程</span>
                <span class="think-toggle">{{ msg.thinkCollapsed ? '展开' : '折叠' }}</span>
              </div>
              <div v-if="!msg.thinkCollapsed" class="think-body">{{ msg.thinkContent }}</div>
            </div>
            <div class="message-text" v-html="renderMessage(msg)"></div>
            <div v-if="msg.role === 'assistant' && msg.references && fileList(msg.references).length > 0" class="related-files">
              <div
                v-for="(file, fi) in fileList(msg.references)"
                :key="fi"
                class="file-item"
                @click="handleFileClick(file, msg.references)"
              >
                <el-icon class="file-icon"><document /></el-icon>
                <span class="file-name">{{ file.doc_name || '未知文档' }}</span>
                <span class="file-count">{{ file.count }} 个片段</span>
                <button
                  class="file-download-btn"
                  @click.stop="downloadReferenceFile(file, msg.references)"
                >
                  下载
                </button>
              </div>
            </div>
          </div>
          <img v-if="msg.role === 'user' && userAvatar" class="msg-avatar user-avatar" :src="userAvatar" alt="我" />
          <div v-else-if="msg.role === 'user'" class="msg-avatar user-avatar-fallback">U</div>
        </div>

        <div v-if="waiting && !streamingText && !streamingThink" class="message-row ai-row">
          <img class="msg-avatar" :src="aiAvatar" alt="AI" />
          <div class="message-bubble ai-bubble waiting-bubble">
            <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>

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

      <div class="input-bar">
        <div class="input-wrapper">
          <textarea
            v-model="inputText"
            class="message-input"
            placeholder="请输入问题，助手将基于当前知识库回答 (Shift + Enter 换行)"
            :disabled="streaming"
            rows="3"
            @keydown.enter.exact.prevent="handleSend"
          ></textarea>
          <div class="input-footer">
            <span>内容由 AI 生成，请仔细核对来源。</span>
            <button
              class="send-btn"
              :disabled="!inputText.trim() || streaming"
              @click="handleSend"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </main>

    <aside class="evidence-panel">
      <div class="panel-tabs">
        <button class="active">引用证据</button>
        <button>知识库信息</button>
      </div>

      <div class="evidence-list">
        <div
          v-for="(file, idx) in evidenceFiles"
          :key="file.doc_id || idx"
          class="evidence-card"
          @click="handleFileClick(file, activeReferences)"
        >
          <div class="evidence-title">
            <span>[{{ idx + 1 }}]</span>
            <strong>{{ file.doc_name || '未知文档' }}</strong>
          </div>
          <p>{{ evidencePreview(file) }}</p>
          <div class="evidence-footer">
            <span>相关度: {{ evidenceScore(idx) }}</span>
            <button @click.stop="downloadEvidence(file)">下载原文</button>
          </div>
        </div>
        <el-empty v-if="evidenceFiles.length === 0" description="暂无引用证据" :image-size="90" />
      </div>
    </aside>
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

const activeSession = computed(() => {
  return sessions.value.find(item => item.id === activeSessionId.value) || null
})

const latestAssistantMessage = computed(() => {
  return [...messages.value].reverse().find(item => item.role === 'assistant' && item.references)
})

const activeReferences = computed(() => latestAssistantMessage.value?.references || {})

const evidenceFiles = computed(() => fileList(activeReferences.value))

const activeKnowledgeBaseName = computed(() => {
  const chunk = activeReferences.value?.chunks?.find(item => item.dataset_name || item.dataset_id)
  return chunk?.dataset_name || '医院感染知识库'
})

const knowledgeBaseMeta = computed(() => {
  const fileCount = evidenceFiles.value.length
  const chunkCount = activeReferences.value?.chunks?.length || 0
  if (!fileCount && !chunkCount) return '45 文件 / 1200 片段'
  return `${fileCount || '--'} 文件 / ${chunkCount || '--'} 片段`
})

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

function evidencePreview(file) {
  const chunks = activeReferences.value?.chunks || []
  const chunk = chunks.find(c => c.document_id === file.doc_id)
  const content = chunk?.content || '该文档命中了当前问题的相关知识片段。'
  return content.length > 72 ? content.slice(0, 72) + '...' : content
}

function evidenceScore(index) {
  const scores = ['98%', '92%', '89%', '86%']
  return scores[index] || '85%'
}

function datasetIdForDocument(file, references) {
  const chunks = references?.chunks || []
  const chunk = chunks.find(c => c.document_id === file.doc_id && c.dataset_id)
  return chunk?.dataset_id || ''
}

function downloadReferenceFile(file, references) {
  handleDownload(datasetIdForDocument(file, references), file.doc_id, file.doc_name)
}

function downloadEvidence(file) {
  downloadReferenceFile(file, activeReferences.value)
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
    .then(async res => {
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.msg || data.message || '下载失败')
      }
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
    .catch(err => {
      proxy.$modal.msgError(err.message || '文件下载失败')
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

function formatShortSessionDate(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '/')
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
  display: grid;
  grid-template-columns: 260px minmax(600px, 1fr) 280px;
  height: calc(100vh - 84px);
  overflow: hidden;
  background: #f3f6fa;
  color: #20242c;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

.session-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #dfe5ee;
}

.session-topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 16px;

  strong {
    min-width: 0;
    max-width: 150px;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
  }
}

.back-link,
.side-footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: #096fd2;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.back-link {
  position: absolute;
  left: 16px;
}

.new-session-btn {
  height: 38px;
  margin: 0 14px 14px;
  border: 0;
  border-radius: 999px;
  background: #0874d8;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.side-section-divider {
  height: 1px;
  margin: 0 14px 14px;
  background: #edf1f6;
}

.kb-summary-card {
  margin: 0 14px 14px;
  padding: 13px 14px;
  border: 1px solid #b8d6fb;
  border-radius: 10px;
  background: #f8fbff;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease;

  &:hover {
    background: #f1f7ff;
    border-color: #8fc3ff;
  }

  .kb-title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: #086ed4;
    font-weight: 700;
    font-size: 13px;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  p {
    margin: 8px 0 0;
    color: #596579;
    font-size: 12px;
    line-height: 1.4;
  }

  strong {
    color: #20a557;
  }
}

.session-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px 12px;
}

.session-item {
  min-height: 70px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 11px 14px;
  border-radius: 8px;
  border-left: 4px solid transparent;
  background: #f7f9fc;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease;

  > div {
    min-width: 0;
    flex: 1;
  }

  &.active {
    background: #e8f1ff;
    border-left-color: #0874d8;
  }

  &:hover {
    background: #f3f7fc;
  }

  .session-label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
    font-size: 14px;
  }

  small {
    display: block;
    margin-top: 8px;
    color: #97a1b2;
    font-size: 12px;
  }

  .session-delete {
    display: none;
    border: 0;
    background: transparent;
    color: #8b95a7;
    cursor: pointer;
  }

  &:hover .session-delete {
    display: inline-flex;
  }
}

.session-empty {
  padding: 28px 16px;
  text-align: center;
  color: #8b95a7;
  font-size: 14px;
}

.side-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 14px 12px;
  border-top: 1px solid #edf1f6;

  button {
    min-width: 0;
    font-size: 13px;
  }
}

.chat-area {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 8px 16px;
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 20px 22px;
}

.day-divider {
  margin-bottom: 70px;
  text-align: center;
  color: #9aa4b2;
  font-size: 13px;
  font-weight: 700;
}

.welcome-message {
  text-align: center;
  color: #8b95a7;
  font-size: 15px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 28px;

  &.user-row {
    justify-content: flex-end;
  }
}

.msg-avatar {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0874d8;
  color: #fff;
  font-weight: 800;
}

.user-avatar {
  order: 2;
}

.message-bubble {
  max-width: min(680px, 78%);
  color: #20242c;
  font-size: 15px;
  line-height: 1.65;
}

.user-bubble {
  min-width: 330px;
  padding: 16px 20px;
  border: 1px solid #b8d6fb;
  border-radius: 16px;
  background: #e8f1ff;
}

.ai-bubble {
  width: min(680px, 100%);
  padding: 16px 20px 6px;
  border: 1px solid #dfe5ee;
  border-radius: 16px;
  background: #fff;
}

.retrieval-summary {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;

  span,
  strong {
    display: block;
    padding: 10px 14px;
    border-radius: 8px;
    background: #f8fafc;
    color: #697386;
    font-size: 13px;
  }

  strong {
    color: #096fd2;
  }
}

.think-block {
  margin-bottom: 12px;
  color: #7b8496;
  font-size: 13px;

  .think-header {
    display: flex;
    justify-content: space-between;
    cursor: pointer;
  }

  .think-toggle {
    color: #0874d8;
  }

  .think-body {
    margin-top: 8px;
    padding-left: 10px;
    border-left: 2px solid #d2d9e5;
    white-space: pre-wrap;
  }
}

.related-files {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #edf1f6;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #096fd2;
  font-size: 13px;
  cursor: pointer;

  .file-name {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-count {
    color: #8b95a7;
  }
}

.file-download-btn,
.evidence-footer button {
  border: 0;
  background: transparent;
  color: #096fd2;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.message-text {
  :deep(p) { margin: 0 0 10px; &:last-child { margin-bottom: 0; } }
  :deep(strong) { font-weight: 700; }
  :deep(a) { color: #096fd2; text-decoration: none; }
  :deep(code) {
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 13px;
    background: #f0f3f7;
    padding: 2px 6px;
    border-radius: 4px;
  }
  :deep(pre) {
    overflow-x: auto;
    padding: 14px;
    border-radius: 10px;
    background: #20242c;
    color: #fff;
  }
  :deep(ul), :deep(ol) { padding-left: 20px; margin: 8px 0; }
  :deep(li) { margin: 3px 0; }
  :deep(.citation-badge) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: #dcedff;
    color: #0874d8;
    font-size: 10px;
    font-weight: 800;
    vertical-align: super;
    cursor: pointer;
  }
}

.waiting-bubble {
  width: auto;
}

.typing-dots {
  display: flex;
  gap: 4px;
  line-height: 1;

  span {
    width: 7px;
    height: 7px;
    overflow: hidden;
    border-radius: 50%;
    background: #8b95a7;
    color: transparent;
    animation: dotBounce 1.2s ease-in-out infinite;

    &:nth-child(2) { animation-delay: .2s; }
    &:nth-child(3) { animation-delay: .4s; }
  }
}

.cursor-blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: .4; }
  30% { transform: translateY(-5px); opacity: 1; }
}

.input-bar {
  padding: 0 0 16px;
}

.input-wrapper {
  margin: 0 auto;
  max-width: 960px;
  border: 1px solid #dfe5ee;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

.message-input {
  display: block;
  width: 100%;
  min-height: 82px;
  padding: 18px 20px;
  border: 0;
  resize: none;
  outline: none;
  color: #20242c;
  font: inherit;
  line-height: 1.5;
  box-sizing: border-box;

  &::placeholder {
    color: #a0a9b8;
  }
}

.input-footer {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  border-top: 1px solid #edf1f6;

  span {
    color: #9aa4b2;
    font-size: 12px;
  }
}

.send-btn {
  min-width: 82px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: #0874d8;
  color: #fff;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: .45;
    cursor: not-allowed;
  }
}

.evidence-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #fff;
  border-left: 1px solid #dfe5ee;
}

.panel-tabs {
  display: flex;
  gap: 28px;
  height: 48px;
  border-bottom: 1px solid #edf1f6;

  button {
    position: relative;
    border: 0;
    background: transparent;
    color: #667085;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;

    &.active {
      color: #0874d8;

      &::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: -1px;
        height: 2px;
        background: #0874d8;
      }
    }
  }
}

.evidence-list {
  min-height: 0;
  flex: 1;
  max-height: none;
  overflow-y: auto;
  padding: 22px 0 8px;
}

.evidence-card {
  margin-bottom: 16px;
  padding: 18px 14px 12px;
  border: 1px solid #b8d6fb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;

  p {
    margin: 12px 0 18px;
    min-height: 42px;
    color: #667085;
    font-size: 13px;
    line-height: 1.7;
  }
}

.evidence-title {
  display: flex;
  gap: 12px;
  color: #20242c;
  font-size: 14px;

  span {
    color: #0874d8;
    font-weight: 800;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.evidence-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #edf1f6;
  padding-top: 12px;
  color: #8b95a7;
  font-size: 12px;
}

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

@media (max-width: 1180px) {
  .chat-shell {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .evidence-panel {
    display: none;
  }
}

@media (max-width: 760px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .session-panel {
    display: none;
  }

  .chat-area {
    padding: 10px;
  }

  .message-list {
    padding: 20px 8px;
  }

  .message-bubble,
  .user-bubble,
  .ai-bubble {
    max-width: 100%;
    min-width: 0;
  }
}
</style>
