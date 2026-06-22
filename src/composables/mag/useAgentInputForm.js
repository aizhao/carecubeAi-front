import { computed, reactive, ref } from 'vue'

export function useAgentInputForm() {
  const formModel = reactive({})
  const originalValues = reactive({})
  const fields = ref([])
  const activePanels = ref(['default'])

  const groupedFields = computed(() => {
    const groups = new Map()
    fields.value.forEach(field => {
      const groupName = field.groupName || field.group || field.category || '患者资料'
      if (!groups.has(groupName)) {
        groups.set(groupName, [])
      }
      groups.get(groupName).push(field)
    })
    return [...groups.entries()].map(([name, items], index) => ({
      name,
      key: name || `group-${index}`,
      fields: items
    }))
  })

  const rules = computed(() => {
    const result = {}
    fields.value.forEach(field => {
      if (field.required) {
        result[field.fieldKey] = [
          { required: true, message: `请输入${field.fieldLabel}`, trigger: ['blur', 'change'] }
        ]
      }
    })
    return result
  })

  function setSchema(schema) {
    fields.value = (schema?.fields || []).map(field => ({
      ...field,
      fieldType: field.fieldType || 'input'
    }))
    fields.value.forEach(field => {
      if (!(field.fieldKey in formModel)) {
        formModel[field.fieldKey] = field.defaultValue || ''
      }
      originalValues[field.fieldKey] = formModel[field.fieldKey]
    })
    activePanels.value = groupedFields.value.map(group => group.key)
  }

  function getAllValues() {
    return pickFieldValues(() => true)
  }

  function getDirtyValues() {
    return pickFieldValues(field => formModel[field.fieldKey] !== originalValues[field.fieldKey])
  }

  function markClean() {
    fields.value.forEach(field => {
      originalValues[field.fieldKey] = formModel[field.fieldKey]
    })
  }

  function resetForm() {
    fields.value.forEach(field => {
      formModel[field.fieldKey] = field.defaultValue || ''
      originalValues[field.fieldKey] = formModel[field.fieldKey]
    })
  }

  function pickFieldValues(predicate) {
    const result = {}
    fields.value.forEach(field => {
      if (predicate(field)) {
        result[field.fieldKey] = formModel[field.fieldKey] ?? ''
      }
    })
    return result
  }

  return {
    formModel,
    fields,
    groupedFields,
    activePanels,
    rules,
    setSchema,
    getAllValues,
    getDirtyValues,
    markClean,
    resetForm
  }
}
