<template>
  <section class="agent-conversation">
    <div ref="listRef" class="conversation-list">
      <div v-if="messages.length === 0 && !streamingMessage.content && !loading" class="empty-state">
        <h3>等待开始辅助分析</h3>
        <p>左侧提交患者资料后，右侧将实时生成辅助分析结果。</p>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="message-row"
        :class="message.role === 'user' ? 'message-row--user' : 'message-row--assistant'"
      >
        <img v-if="message.role === 'assistant'" class="avatar" :src="aiAvatar" alt="AI" />
        <div class="bubble" :class="message.role === 'user' ? 'bubble--user' : 'bubble--assistant'">
          <div v-if="message.role === 'assistant' && referenceFiles(message.references).length" class="reference-summary">
            引用 {{ referenceFiles(message.references).length }} 个来源
          </div>
          <div class="message-content" v-html="renderMessage(message)" />
        </div>
      </div>

      <div v-if="loading && !streamingMessage.content" class="message-row message-row--assistant">
        <img class="avatar" :src="aiAvatar" alt="AI" />
        <div class="bubble bubble--assistant waiting">
          <span class="waiting-spinner"></span>
          {{ statusText || '智能分析处理中' }}
        </div>
      </div>

      <div v-if="streamingMessage.content" class="message-row message-row--assistant">
        <img class="avatar" :src="aiAvatar" alt="AI" />
        <div class="bubble bubble--assistant">
          <div v-if="statusText" class="status-line">
            <span v-if="loading" class="status-spinner"></span>
            <span v-else class="status-dot completed"></span>
            {{ statusText }}
          </div>
          <div class="message-content" v-html="renderMessage(streamingMessage)" />
          <span v-if="loading" class="cursor">|</span>
        </div>
      </div>
    </div>

    <div class="followup-box">
      <el-input
        v-model="question"
        type="textarea"
        :rows="3"
        resize="none"
        :disabled="loading || !sessionId"
        placeholder="继续追问，助手将基于当前辅助分析会话回答（Shift + Enter 换行）"
        @keydown.enter.exact.prevent="submit"
      />
      <div class="followup-footer">
        <span>以上内容仅供临床辅助参考，需结合患者实际情况及医务人员专业判断。</span>
        <el-button type="primary" :disabled="!canSend" :loading="loading" @click="submit">发送</el-button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import aiLogo from '@/assets/logo/carecube.jpg'
import { useReferenceParser } from '@/composables/mag/useReferenceParser'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  streamingMessage: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  statusText: {
    type: String,
    default: ''
  },
  sessionId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['send'])
const { renderCitationHtml, referenceFiles } = useReferenceParser()
const aiAvatar = aiLogo
const question = ref('')
const listRef = ref(null)

const canSend = computed(() => Boolean(props.sessionId && question.value.trim() && !props.loading))

function submit() {
  if (!canSend.value) return
  emit('send', question.value.trim())
  question.value = ''
}

function renderMessage(message) {
  return marked.parse(renderCitationHtml(message.content || '', message.references))
}

function scrollToBottom() {
  nextTick(() => {
    requestAnimationFrame(() => {
      if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight
      }
    })
  })
}

watch(
  () => [props.messages.length, props.streamingMessage.content, props.loading],
  scrollToBottom,
  { flush: 'post' }
)
</script>

<style scoped lang="scss">
.agent-conversation {
  min-width: 0;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  overflow: hidden;
}

.conversation-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 22px;
  background: #f6f8fb;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #98a2b3;

  h3 {
    margin: 0 0 8px;
    color: #344054;
  }

  p {
    margin: 0;
  }
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--assistant {
  justify-content: flex-start;
}

.avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  object-fit: cover;
}

.bubble {
  max-width: min(760px, 88%);
  border-radius: 8px;
  padding: 14px 16px;
  line-height: 1.75;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}

.bubble--user {
  color: #fff;
  background: #0b73de;
}

.bubble--assistant {
  color: #1f2937;
  background: #fff;
  border: 1px solid #e5eaf2;
}

.reference-summary {
  display: inline-flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #0b73de;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 700;
}

.status-line {
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e3e8ef;
  border-top-color: #0b73de;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.status-dot.completed {
  width: 8px;
  height: 8px;
  background: #17b26a;
  border-radius: 50%;
  flex-shrink: 0;
}

.waiting-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #d0d5dd;
  border-top-color: #0b73de;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.waiting {
  color: #667085;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cursor {
  color: #0b73de;
  animation: blink 1s step-end infinite;
}

.followup-box {
  padding: 16px;
  border-top: 1px solid #eef2f6;
  background: #fff;
}

.followup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;

  span {
    color: #98a2b3;
    font-size: 13px;
  }
}

.message-content {
  :deep(p) {
    margin: 0 0 10px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(.citation-badge) {
    display: inline-flex;
    margin: 0 2px;
    padding: 1px 5px;
    border-radius: 999px;
    color: #0b73de;
    background: #e7f1ff;
    font-size: 12px;
    font-weight: 700;
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (max-width: 900px) {
  .agent-conversation {
    height: auto;
    min-height: 620px;
  }

  .bubble {
    max-width: 92%;
  }

  .followup-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
