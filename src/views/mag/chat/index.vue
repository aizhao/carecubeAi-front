<template>
  <div class="apple-container chat-list-page">
    <div class="page-header">
      <h1 class="page-title">AI 助手</h1>
      <p class="page-subtitle">创建和管理 AI 聊天助手，基于知识库提供智能问答</p>
    </div>

    <div class="toolbar"></div>

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
          <button class="apple-btn-secondary-pill" @click="handleEnter(chat)">进入</button>
        </div>
      </div>

      <div v-if="chatList.length === 0 && !loading" class="empty-state">
        <el-icon class="empty-icon"><chat-dot-round /></el-icon>
        <p class="empty-text">还没有任何 AI 助手</p>
      </div>
    </div>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listChats } from '@/api/mag/chat'

const { proxy } = getCurrentInstance()
const router = useRouter()

const loading = ref(false)
const total = ref(0)
const chatList = ref([])

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
})

function getList() {
  loading.value = true
  listChats(queryParams)
    .then(res => {
      chatList.value = res.rows || []
      total.value = res.total || 0
    })
    .finally(() => { loading.value = false })
}

function handleEnter(row) {
  router.push({ path: '/ai-chat/chat', query: { chatId: row.id, chatName: row.name } })
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

      .card-icon { font-size: 20px; }

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

  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  .empty-text { font-size: 17px; margin: 0 0 24px; }
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

  &:hover { background: #0066cc; color: #fff; }
}

</style>
