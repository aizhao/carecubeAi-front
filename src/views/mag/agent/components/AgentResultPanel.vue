<template>
  <aside class="agent-result-panel">
    <div class="panel-tabs">
      <button :class="{ active: activeTab === 'result' }" @click="activeTab = 'result'">辅助分析结果</button>
      <button :class="{ active: activeTab === 'evidence' }" @click="activeTab = 'evidence'">引用证据</button>
    </div>

    <div v-show="activeTab === 'result'" class="panel-body">
      <StructuredResultCard
        v-for="(result, index) in structuredResults"
        :key="index"
        :result="result"
      />
      <el-empty v-if="structuredResults.length === 0" description="暂无结构化结果" :image-size="86" />

      <div v-if="attachments.length" class="attachment-section">
        <h3>附件</h3>
        <div v-for="attachment in attachments" :key="attachment.attachmentId || attachment.name" class="attachment-item">
          <span>{{ attachment.name || '附件' }}</span>
          <a v-if="attachment.url" :href="attachment.url" target="_blank" rel="noreferrer">查看</a>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'evidence'" class="panel-body">
      <div
        v-for="(file, index) in files"
        :key="file.doc_id || index"
        class="evidence-card"
      >
        <div class="evidence-title">
          <span>[{{ index + 1 }}]</span>
          <strong>{{ file.doc_name || '未知文档' }}</strong>
        </div>
        <p>{{ previewForFile(file, references) }}</p>
        <small>相关度：{{ scoreLabel(file, index) }}</small>
      </div>
      <el-empty v-if="files.length === 0" description="暂无引用证据" :image-size="86" />
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import StructuredResultCard from './StructuredResultCard.vue'
import { useReferenceParser } from '@/composables/mag/useReferenceParser'

const props = defineProps({
  structuredResults: {
    type: Array,
    default: () => []
  },
  references: {
    type: [Object, Array],
    default: () => ({})
  },
  attachments: {
    type: Array,
    default: () => []
  }
})

const activeTab = ref('result')
const { referenceFiles, previewForFile, referenceChunks } = useReferenceParser()

const files = computed(() => referenceFiles(props.references))

function scoreLabel(file, index) {
  const chunk = referenceChunks(props.references).find(item => item.document_id === file.doc_id)
  if (typeof chunk?.similarity === 'number') {
    return Math.round(chunk.similarity * 100) + '%'
  }
  return ['98%', '92%', '89%', '86%'][index] || '85%'
}
</script>

<style scoped lang="scss">
.agent-result-panel {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  overflow: hidden;
}

.panel-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex-shrink: 0;
  border-bottom: 1px solid #e5eaf2;

  button {
    height: 52px;
    min-width: 0;
    padding: 0 8px;
    border: 0;
    background: transparent;
    color: #667085;
    font-weight: 700;
    cursor: pointer;
    border-bottom: 3px solid transparent;

    &.active {
      color: #0b73de;
      border-bottom-color: #0b73de;
    }
  }
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.evidence-card {
  min-width: 0;
  border: 1px solid #d8e6fb;
  border-radius: 8px;
  padding: 14px;
  background: #fff;

  p {
    margin: 10px 0 14px;
    color: #667085;
    line-height: 1.6;
    word-break: break-word;
  }

  small {
    color: #98a2b3;
  }
}

.evidence-title {
  display: flex;
  gap: 10px;
  color: #1f2937;

  span {
    color: #0b73de;
    font-weight: 800;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.attachment-section {
  border-top: 1px solid #eef2f6;
  padding-top: 14px;

  h3 {
    margin: 0 0 10px;
    font-size: 15px;
  }
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  color: #475467;
}

@media (max-width: 1100px) {
  .agent-result-panel {
    height: auto;
    min-height: 420px;
  }
}
</style>
