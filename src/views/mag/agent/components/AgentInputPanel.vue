<template>
  <aside class="agent-input-panel">
    <div class="panel-head">
      <div>
        <h2>患者资料</h2>
        <p>请填写用于辅助分析的结构化资料</p>
      </div>
      <el-tag type="success" effect="light">临床辅助</el-tag>
    </div>

    <el-form
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-position="top"
      class="agent-form"
    >
      <el-collapse v-model="panelsModel">
        <el-collapse-item
          v-for="group in groupedFields"
          :key="group.key"
          :title="group.name"
          :name="group.key"
        >
          <el-form-item
            v-for="field in group.fields"
            :key="field.fieldKey"
            :label="field.fieldLabel"
            :prop="field.fieldKey"
          >
            <el-input
              v-if="isInput(field)"
              v-model="formModel[field.fieldKey]"
              :placeholder="field.placeholder || `请输入${field.fieldLabel}`"
              clearable
            />
            <el-input
              v-else-if="field.fieldType === 'textarea'"
              v-model="formModel[field.fieldKey]"
              :placeholder="field.placeholder || `请输入${field.fieldLabel}`"
              :rows="4"
              type="textarea"
            />
            <el-select
              v-else-if="field.fieldType === 'select'"
              v-model="formModel[field.fieldKey]"
              :placeholder="field.placeholder || `请选择${field.fieldLabel}`"
              clearable
              filterable
            >
              <el-option
                v-for="option in parseOptions(field)"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-date-picker
              v-else-if="field.fieldType === 'date'"
              v-model="formModel[field.fieldKey]"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="field.placeholder || `请选择${field.fieldLabel}`"
              style="width: 100%"
            />
            <el-input
              v-else
              v-model="formModel[field.fieldKey]"
              :placeholder="field.placeholder || `请输入${field.fieldLabel}`"
              clearable
            />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <div class="input-actions">
      <el-button @click="$emit('fillTemplate')" :disabled="loading">填写示例</el-button>
      <el-button @click="$emit('reset')" :disabled="loading">重置</el-button>
      <el-button type="primary" :loading="loading" @click="$emit('submit')">
        开始辅助分析
      </el-button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  formModel: {
    type: Object,
    required: true
  },
  groupedFields: {
    type: Array,
    default: () => []
  },
  activePanels: {
    type: Array,
    default: () => []
  },
  rules: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'reset', 'fillTemplate', 'update:activePanels'])
const formRef = ref(null)

const panelsModel = computed({
  get: () => props.activePanels,
  set: value => emit('update:activePanels', value)
})

function validate() {
  return formRef.value?.validate()
}

function isInput(field) {
  return !field.fieldType || field.fieldType === 'input' || field.fieldType === 'text'
}

function parseOptions(field) {
  if (Array.isArray(field.options)) return field.options
  if (!field.optionsJson) return []
  try {
    const parsed = JSON.parse(field.optionsJson)
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (typeof item === 'string') return { label: item, value: item }
        return {
          label: item.label || item.name || item.value,
          value: item.value || item.label || item.name
        }
      })
    }
  } catch (error) {
    return []
  }
  return []
}

defineExpose({ validate })
</script>

<style scoped lang="scss">
.agent-input-panel {
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

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef2f6;

  h2 {
    margin: 0 0 6px;
    color: #1f2937;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #667085;
    font-size: 13px;
    line-height: 1.7;
  }
}

.agent-form {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px 16px 14px;

  :deep(.el-collapse) {
    border: 0;
  }

  :deep(.el-collapse-item__header) {
    font-weight: 700;
    color: #334155;
    height: 46px;
    line-height: 46px;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 4px;
  }

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    color: #475467;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 6px;
  }

  :deep(.el-select) {
    width: 100%;
  }
}

.input-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #eef2f6;
  background: #fff;

  :deep(.el-button) {
    width: 100%;
    min-width: 0;
    margin-left: 0;
    padding-left: 8px;
    padding-right: 8px;
  }

  :deep(.el-button > span) {
    min-width: 0;
    white-space: nowrap;
  }

  :deep(.el-button--primary) {
    grid-column: 1 / -1;
  }
}
</style>
