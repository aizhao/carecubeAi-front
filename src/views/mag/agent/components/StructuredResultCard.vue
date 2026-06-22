<template>
  <section class="structured-card">
    <div class="structured-card__head">
      <span>{{ title }}</span>
      <small>辅助分析结果</small>
    </div>

    <div v-if="items.length" class="structured-card__grid">
      <div v-for="item in items" :key="item.key" class="structured-item">
        <label>{{ item.label }}</label>
        <p>{{ item.value }}</p>
      </div>
    </div>

    <div v-else class="structured-card__empty">
      暂无可展示的结构化结果
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  result: {
    type: Object,
    default: () => ({})
  }
})

const title = computed(() => props.result?.title || '辅助分析结果')

const items = computed(() => {
  const payload = props.result?.result ?? props.result?.data ?? props.result
  return flattenResult(payload)
    .filter(item => item.value !== '' && item.value !== null && item.value !== undefined)
    .slice(0, 12)
})

function flattenResult(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: `${prefix || 'item'}-${index}`,
      label: prefix || `结果 ${index + 1}`,
      value: stringifyValue(item)
    }))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, val]) => {
      const label = formatLabel(key)
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return flattenResult(val, label)
      }
      return [{
        key: prefix ? `${prefix}-${key}` : key,
        label,
        value: stringifyValue(val)
      }]
    })
  }
  return [{ key: 'result', label: '辅助分析结果', value: stringifyValue(value) }]
}

function stringifyValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => stringifyValue(item)).join('；')
  }
  if (value && typeof value === 'object') {
    return Object.values(value).map(item => stringifyValue(item)).join('；')
  }
  return value == null ? '' : String(value)
}

function formatLabel(key) {
  const labels = {
    patient_info: '患者信息',
    timeline: '时间线',
    gender: '性别',
    age: '年龄',
    department: '科室',
    infection_symptom_onset_time: '症状出现时间',
    admission_date: '入院日期',
    admission_time: '入院时间',
    possible_infection_sites: '疑似感染部位',
    overall_judgement: '综合判断',
    suspected_infection: '是否疑似感染',
    infection_site: '感染部位',
    infection_diagnosis: '感染风险提示',
    confidence_level: '可信度',
    assessment_summary: '辅助分析摘要',
    supporting_points: '支持依据',
    opposing_points: '不确定因素',
    missing_information: '待补充信息',
    final_reminder: '风险提示',
    risk: '感染风险提示',
    riskLevel: '感染风险提示',
    risk_level: '感染风险提示',
    summary: '辅助分析摘要',
    suggestion: '辅助建议',
    suggestions: '辅助建议',
    evidence: '参考依据',
    reason: '分析依据',
    warning: '风险提示',
    warnings: '风险提示'
  }
  return labels[key] || key.replace(/_/g, ' ')
}
</script>

<style scoped lang="scss">
.structured-card {
  border: 1px solid #d8e6fb;
  background: #f8fbff;
  border-radius: 8px;
  padding: 16px;
}

.structured-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  span {
    font-size: 16px;
    font-weight: 700;
    color: #1f2d3d;
  }

  small {
    color: #0b73de;
    font-weight: 600;
  }
}

.structured-card__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.structured-item {
  min-width: 0;
  background: #fff;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  padding: 10px 12px;

  label {
    display: block;
    margin-bottom: 6px;
    color: #667085;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: #1f2937;
    font-size: 13px;
    line-height: 1.6;
    word-break: normal;
    overflow-wrap: anywhere;
  }
}

.structured-card__empty {
  color: #98a2b3;
  text-align: center;
  padding: 20px 0;
}

</style>
