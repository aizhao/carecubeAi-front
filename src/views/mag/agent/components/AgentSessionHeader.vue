<template>
  <header class="agent-session-header">
    <div>
      <p class="eyebrow">智能分析</p>
      <h1>{{ title }}</h1>
      <span>结构化患者资料输入 · 流式辅助分析 · 后续追问</span>
    </div>
    <div class="header-actions">
      <el-select
        v-if="agents.length > 1"
        :model-value="agentCode"
        class="agent-select"
        @change="$emit('changeAgent', $event)"
      >
        <el-option
          v-for="agent in agents"
          :key="agent.agentCode"
          :label="agent.agentName"
          :value="agent.agentCode"
        />
      </el-select>
      <el-button @click="$emit('newSession')">新建分析</el-button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '智能分析服务'
  },
  agentCode: {
    type: String,
    default: ''
  },
  agents: {
    type: Array,
    default: () => []
  }
})

defineEmits(['newSession', 'changeAgent'])
</script>

<style scoped lang="scss">
.agent-session-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 24px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;

  h1 {
    margin: 2px 0 6px;
    color: #1f2937;
    font-size: 24px;
    line-height: 1.2;
  }

  span {
    color: #667085;
    font-size: 14px;
  }
}

.eyebrow {
  margin: 0;
  color: #0b73de;
  font-weight: 700;
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-select {
  width: 220px;
}

@media (max-width: 900px) {
  .agent-session-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
