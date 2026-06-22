<template>
  <div v-loading="pageLoading" class="agent-workbench">
    <div class="workbench-layout">
      <aside class="input-sidebar" :class="{ collapsed: inputCollapsed }">
        <button class="toggle-btn" :title="inputCollapsed ? '展开输入面板' : '收起输入面板'" @click="inputCollapsed = !inputCollapsed">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline v-if="inputCollapsed" points="15,18 9,12 15,6" />
            <polyline v-else points="9,18 15,12 9,6" />
          </svg>
        </button>
        <AgentInputPanel
          v-show="!inputCollapsed"
          ref="inputPanelRef"
          v-model:active-panels="activePanels"
          :form-model="formModel"
          :grouped-fields="groupedFields"
          :rules="rules"
          :loading="streaming"
          @submit="handleStartAnalysis"
          @reset="handleResetForm"
          @fill-template="handleFillTemplate"
        />
      </aside>

      <section class="analysis-workspace">
        <AgentConversation
          :messages="messages"
          :streaming-message="streamingMessage"
          :loading="streaming"
          :status-text="statusText"
          :session-id="sessionId"
          @send="handleFollowUp"
        />
        <aside class="result-sidebar" :class="{ collapsed: resultCollapsed }">
          <button class="toggle-btn" :title="resultCollapsed ? '展开结果面板' : '收起结果面板'" @click="resultCollapsed = !resultCollapsed">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline v-if="resultCollapsed" points="15,18 9,12 15,6" />
              <polyline v-else points="9,18 15,12 9,6" />
            </svg>
          </button>
          <AgentResultPanel
            v-if="!resultCollapsed"
            :structured-results="structuredResults"
            :references="activeReferences"
            :attachments="activeAttachments"
          />
        </aside>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAgents, getAgentSchema } from '@/api/mag/agent'
import { listAgentSessions, getAgentSession } from '@/api/mag/agentSession'
import { useAgentInputForm } from '@/composables/mag/useAgentInputForm'
import { useAgentStream } from '@/composables/mag/useAgentStream'
import AgentInputPanel from './components/AgentInputPanel.vue'
import AgentConversation from './components/AgentConversation.vue'
import AgentResultPanel from './components/AgentResultPanel.vue'
defineOptions({ name: 'MagAgent' })

const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()

const inputCollapsed = ref(false)
const resultCollapsed = ref(true)

const agents = ref([])
const activeAgentCode = ref('')
const schema = ref(null)
const pageLoading = ref(false)
const sessionId = ref('')
const messages = ref([])
const structuredResults = ref([])
const activeReferences = ref([])
const activeAttachments = ref([])
const inputPanelRef = ref(null)
const streamingMessage = reactive({
  id: '',
  role: 'assistant',
  content: '',
  references: [],
  attachments: []
})

const {
  formModel,
  groupedFields,
  activePanels,
  rules,
  setSchema,
  getAllValues,
  getDirtyValues,
  markClean,
  resetForm
} = useAgentInputForm()

const { streaming, statusText, startStream, abortStream } = useAgentStream()

const activeAgentName = computed(() => {
  return agents.value.find(item => item.agentCode === activeAgentCode.value)?.agentName
    || schema.value?.agentName
    || '智能分析服务'
})

async function initPage() {
  pageLoading.value = true
  try {
    const res = await listAgents()
    agents.value = res.data || []
    activeAgentCode.value = route.query.agentCode || agents.value[0]?.agentCode || ''
    if (activeAgentCode.value) {
      await loadSchema(activeAgentCode.value)
      await restoreSession()
    }
  } catch (error) {
    proxy.$modal.msgError('智能分析服务加载失败')
  } finally {
    pageLoading.value = false
  }
}

async function loadSchema(agentCode) {
  const res = await getAgentSchema(agentCode)
  schema.value = res.data
  setSchema(schema.value)
}

async function restoreSession() {
  const targetSessionId = route.query.sessionId || await getLatestSessionId()
  if (!targetSessionId) return
  await loadSession(targetSessionId)
}

async function getLatestSessionId() {
  const res = await listAgentSessions({ agentCode: activeAgentCode.value })
  const sessions = res.data || []
  return sessions[0]?.sessionId || ''
}

async function loadSession(targetSessionId) {
  const res = await getAgentSession(targetSessionId)
  const session = res.data
  if (!session) return

  sessionId.value = session.sessionId || ''
  if (session.agentCode && session.agentCode !== activeAgentCode.value) {
    activeAgentCode.value = session.agentCode
    await loadSchema(activeAgentCode.value)
  }
  applySessionMessages(session.messages || [])
  syncRouteSession()
  markClean()
}

function applySessionMessages(savedMessages) {
  messages.value = []
  structuredResults.value = []
  activeReferences.value = []
  activeAttachments.value = []

  savedMessages.forEach(item => {
    if (item.eventType === 'structured_result') {
      const structured = parseJson(item.structuredJson)
      if (structured) structuredResults.value.push(structured)
      return
    }

    if (item.eventType !== 'message' || !item.content) return
    const references = parseJson(item.referenceJson) || []
    const attachments = parseJson(item.attachmentJson) || []
    messages.value.push({
      id: item.messageId,
      role: item.role,
      content: item.content,
      references,
      attachments,
      createTime: item.createTime
    })
    if (item.role === 'assistant') {
      activeReferences.value = references
      activeAttachments.value = attachments
    }
  })
}

function parseJson(value) {
  if (!value) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

async function handleAgentChange(agentCode) {
  if (streaming.value) return
  activeAgentCode.value = agentCode
  handleNewSession()
  pageLoading.value = true
  try {
    await loadSchema(agentCode)
  } finally {
    pageLoading.value = false
  }
}

function handleNewSession() {
  abortStream()
  sessionId.value = ''
  messages.value = []
  structuredResults.value = []
  activeReferences.value = []
  activeAttachments.value = []
  clearStreamingMessage()
  syncRouteSession()
}

function handleResetForm() {
  if (streaming.value) return
  resetForm()
}

const infectionTemplate = {
  patient_basic_info: '男性，68岁，呼吸内科住院，住院号20260615。有吸烟史30年，每天1包。',
  vital_signs: '体温 39.2°C，脉搏 110次/分，呼吸 24次/分，血压 138/86mmHg，血氧饱和度 92%。',
  routine_labs: '血常规：WBC 13.8×10^9/L，NEU% 88.5%，CRP 156mg/L，PCT 2.3ng/mL。\n血气分析：pH 7.38，PaO2 68mmHg，PaCO2 32mmHg。',
  microbiology_tests: '痰培养：待回报。\n血培养：已送检，48小时无细菌生长。\n降钙素原（PCT）：2.3ng/mL。',
  imaging_report: '胸部CT：双下肺可见斑片状、结节状实变影，以右下肺为主。右侧少量胸腔积液。纵隔未见肿大淋巴结。',
  course_records: '入院第3天。患者仍有发热（最高38.8°C），咳嗽、咳黄色黏痰，量约30ml/天。呼吸困难较前稍好转。查体：双肺仍可闻及湿啰音。已使用头孢曲松2g qd抗感染治疗3天，效果欠佳。留置导尿管第2天，尿色清亮。',
  query: '请分析该患者是否存在疑似医院感染'
}

function handleFillTemplate() {
  if (streaming.value) return
  Object.assign(formModel, infectionTemplate)
}

async function handleStartAnalysis() {
  if (!activeAgentCode.value || streaming.value) return
  const valid = await inputPanelRef.value?.validate?.().catch(() => false)
  if (!valid) return

  const initialMessage = formModel.query || '请基于结构化患者资料进行辅助分析和风险提示。'
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: initialMessage
  })

  await runStream({
    sessionId: sessionId.value || null,
    message: initialMessage,
    inputValues: sessionId.value ? getDirtyValues() : getAllValues()
  }, true)
}

async function handleFollowUp(message) {
  if (!sessionId.value || streaming.value) return

  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: message
  })

  await runStream({
    sessionId: sessionId.value,
    message,
    inputValues: getDirtyValues()
  }, true)
}

async function runStream(payload, cleanAfterDone) {
  clearStreamingMessage()
  let shouldMarkClean = false

  await startStream(activeAgentCode.value, payload, {
    onEvent(event) {
      if (event.sessionId) {
        sessionId.value = event.sessionId
        syncRouteSession()
      }
      handleStreamEvent(event)
      if (event.type === 'done') {
        shouldMarkClean = cleanAfterDone
      }
    },
    onError(error) {
      proxy.$modal.msgError(error.message || '辅助分析请求失败')
    }
  })

  if (shouldMarkClean) {
    markClean()
  }
}

const stepLabels = {
  Begin: '解析输入数据',
  Categorize: '识别问题类型',
  Agent: '智能分析处理',
  Message: '生成分析报告',
  Retrieval: '检索知识库',
  Generate: '生成内容',
  Answer: '组织回答'
}

// After each component finishes, what's the next expected step?
const nextStepAfter = {
  Begin: '识别问题类型',
  Categorize: '提取关键信息',
  Agent: '生成分析报告',
  Message: null,
  Retrieval: '智能分析处理',
  Generate: '生成分析报告',
  Answer: '生成分析报告'
}

function getFriendlyName(componentType, componentName) {
  if (stepLabels[componentType]) return stepLabels[componentType]
  if (!componentName) return ''
  if (componentName.startsWith('Agent_')) return '提取关键信息'
  if (componentName.includes('分类')) return '问题分类'
  if (componentName.includes('智能体')) return '智能分析处理'
  if (componentName.includes('回复消息')) return '生成分析报告'
  return componentName
}

function getNextStep(componentType, componentName) {
  if (nextStepAfter[componentType]) return nextStepAfter[componentType]
  if (!componentName) return ''
  if (componentName.startsWith('Agent_') || componentName.includes('智能体')) return '生成分析报告'
  if (componentName.includes('分类')) return '提取关键信息'
  return ''
}

function handleStreamEvent(event) {
  switch (event.type) {
    case 'message': {
      const rawData = event.data || {}
      const messageData = rawData.data || {}
      const content = event.content || rawData.content || rawData.answer || messageData.content || ''
      if (content) {
        if (!streamingMessage.id) {
          streamingMessage.id = event.messageId || rawData.message_id || messageData.message_id || `assistant-${Date.now()}`
          startRenderLoop()
        }
        contentBuffer += content
        statusText.value = '正在输出分析结果…'
      }
      break
    }
    case 'message_end': {
      const rawData = event.data || {}
      const messageData = rawData.data || {}
      const references = rawData.references || rawData.reference || messageData.references || messageData.reference || []
      const attachments = rawData.attachments || rawData.attachment || messageData.attachments || messageData.attachment || []
      streamingMessage.references = references
      streamingMessage.attachments = attachments
      activeReferences.value = references
      activeAttachments.value = attachments
      break
    }
    case 'status':
      if (event.content) {
        statusText.value = event.content
      }
      break
    case 'structured_result':
      if (event.data) {
        structuredResults.value.push(event.data)
      }
      break
    case 'node_finished': {
      const rawData = event.data || {}
      const componentType = rawData._component_type || ''
      const componentName = rawData._component_name || ''
      const completed = getFriendlyName(componentType, componentName)
      const next = getNextStep(componentType, componentName)
      if (completed && next) {
        statusText.value = `${completed}完成，正在${next}中…`
      } else if (completed) {
        statusText.value = `${completed}完成`
      }
      if (rawData._structured_output) {
        structuredResults.value.push(rawData._structured_output)
      }
      break
    }
    case 'done':
      finishRenderLoopAfterDrain()
      break
    case 'error':
      stopRenderLoop()
      proxy.$modal.msgError(event.content || '辅助分析服务异常')
      break
    default:
      break
  }
}

// --- render loop: flush buffered content to display at steady pace ---
let contentBuffer = ''
let renderTimer = null
let renderClosing = false
const RENDER_INTERVAL = 50

function startRenderLoop() {
  if (renderTimer) return
  renderClosing = false
  renderTimer = setInterval(() => {
    flushRenderChunk()
  }, RENDER_INTERVAL)
}

function flushRenderChunk() {
  if (contentBuffer) {
    const chunkSize = getRenderChunkSize(contentBuffer.length)
    streamingMessage.content += contentBuffer.slice(0, chunkSize)
    contentBuffer = contentBuffer.slice(chunkSize)
    return
  }

  if (renderClosing) {
    stopRenderLoop(false)
    finalizeStreamingMessage()
  }
}

function getRenderChunkSize(length) {
  if (length > 1200) return 24
  if (length > 400) return 16
  return 8
}

function finishRenderLoopAfterDrain() {
  renderClosing = true
  if (!renderTimer) {
    startRenderLoop()
  }
  flushRenderChunk()
}

function stopRenderLoop(flushRemaining = true) {
  if (flushRemaining && contentBuffer) {
    streamingMessage.content += contentBuffer
    contentBuffer = ''
  }
  renderClosing = false
  if (renderTimer) {
    clearInterval(renderTimer)
    renderTimer = null
  }
}

function finalizeStreamingMessage() {
  const content = streamingMessage.content.trim()
  if (content) {
    messages.value.push({
      id: streamingMessage.id || `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      references: streamingMessage.references || [],
      attachments: streamingMessage.attachments || []
    })
  }
  clearStreamingMessage()
}

function clearStreamingMessage() {
  streamingMessage.id = ''
  streamingMessage.content = ''
  streamingMessage.references = []
  streamingMessage.attachments = []
}

function syncRouteSession() {
  const query = { ...route.query }
  if (activeAgentCode.value) {
    query.agentCode = activeAgentCode.value
  }
  if (sessionId.value) {
    query.sessionId = sessionId.value
  } else {
    delete query.sessionId
  }
  if (query.agentCode === route.query.agentCode && query.sessionId === route.query.sessionId) {
    return
  }
  router.replace({ query })
}

onMounted(initPage)

onBeforeUnmount(() => {
  abortStream()
})
</script>

<style scoped lang="scss">
.agent-workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  background: #f2f5f9;
  overflow: hidden;
  box-sizing: border-box;
}

.workbench-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

// --- left input sidebar ---
.input-sidebar {
  width: 328px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;

  &.collapsed {
    width: 32px;
  }

  :deep(.agent-input-panel) {
    flex: 1;
    min-height: 0;
  }

  .toggle-btn {
    margin-bottom: 4px;
  }
}

// --- right result sidebar ---
.result-sidebar {
  width: 360px;
  max-width: 34%;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;

  &.collapsed {
    width: 32px;
    max-width: 32px;
  }

  :deep(.agent-result-panel) {
    flex: 1;
    min-height: 0;
    width: 100%;
  }
}

// --- toggle button ---
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: 8px;
  border: 1px solid #e3e8ef;
  border-radius: 6px;
  background: #fff;
  color: #667085;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: #eff6ff;
    color: #0b73de;
    border-color: #bdd7f8;
  }
}

.analysis-workspace {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  gap: 12px;
  overflow: hidden;

  :deep(.agent-conversation) {
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }
}

@media (max-width: 1280px) {
  .input-sidebar {
    width: 304px;
  }

  .result-sidebar {
    width: 320px;
    max-width: 36%;
  }
}

@media (max-width: 900px) {
  .agent-workbench {
    padding: 8px;
  }

  .workbench-layout {
    flex-direction: column;
  }

  .analysis-workspace {
    flex-direction: column;
    overflow: visible;
  }

  .input-sidebar,
  .result-sidebar,
  .result-sidebar.collapsed,
  .input-sidebar.collapsed {
    width: 100%;
    max-width: none;
  }
}
</style>
