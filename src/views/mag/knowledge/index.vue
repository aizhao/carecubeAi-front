<template>
  <div class="knowledge-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">知识库</h1>
        <p class="page-subtitle">管理感染防控资料、指南文档和院内制度，供 AI 辅助检索使用</p>
        <div class="notice-strip">
          <el-icon><info-filled /></el-icon>
          <span>知识库内容用于 AI 辅助分析，具体结论需结合临床判断。</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="cc-btn cc-btn-light" @click="getList">刷新</button>
        <button class="cc-btn cc-btn-primary" @click="handleAdd" v-hasPermi="['mag:kb:add']">新增知识库</button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span>知识库总数</span>
        <strong>{{ totalKnowledgeBases }}</strong>
      </div>
      <div class="summary-card">
        <span>文件总数</span>
        <strong>{{ totalDocuments }}</strong>
      </div>
      <div class="summary-card">
        <span>知识片段数</span>
        <strong>{{ totalChunks }}</strong>
      </div>
      <div class="summary-card">
        <span>最近更新</span>
        <strong>{{ latestUpdateText }}</strong>
      </div>
    </div>

    <div class="filter-bar" v-show="showSearch">
      <div class="filter-left">
        <el-input
          v-model="queryParams.name"
          placeholder="搜索知识库名称或描述"
          clearable
          class="search-input"
          @keyup.enter="handleQuery"
          @clear="handleQuery"
        >
          <template #prefix>
            <el-icon><search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="statusFilter" placeholder="状态" clearable class="filter-select">
          <el-option label="正常" value="normal" />
          <el-option label="解析中" value="running" />
          <el-option label="有失败" value="failed" />
          <el-option label="停用" value="disabled" />
        </el-select>

        <el-select v-model="chunkFilter" placeholder="切分方式" clearable class="filter-select">
          <el-option v-for="item in chunkOptions" :key="item.value" :label="item.shortLabel" :value="item.value" />
        </el-select>
      </div>

      <div class="filter-right">
        <el-checkbox v-model="isCurrentPageAllSelected" :indeterminate="isCurrentPageIndeterminate">
          全选本页
        </el-checkbox>
        <button class="danger-pill" :disabled="multiple" @click="handleDelete" v-hasPermi="['mag:kb:remove']">
          批量删除 ({{ ids.length }})
        </button>
        <span class="list-count">共 {{ total }} 个知识库</span>
        <button class="icon-refresh" @click="getList" aria-label="刷新">
          <el-icon><refresh /></el-icon>
        </button>
      </div>
    </div>

    <div v-loading="loading" class="card-grid">
      <div
        v-for="item in datasetList"
        :key="item.id"
        class="kb-card"
        :class="{ selected: ids.includes(item.id) }"
        @click="handleFiles(item)"
      >
        <div class="card-top" @click.stop>
          <el-checkbox :model-value="ids.includes(item.id)" @change="checked => toggleCardSelection(item, checked)" />
          <span class="status-badge" :class="'status-' + getDatasetStatus(item).type">
            <i></i>{{ getDatasetStatus(item).label }}
          </span>
        </div>

        <div class="kb-avatar">
          <img v-if="item.avatar" :src="item.avatar" class="avatar-img" />
          <el-icon v-else><folder /></el-icon>
        </div>

        <h2 class="card-title">{{ item.name || '未命名知识库' }}</h2>
        <p class="card-desc">{{ item.description || '暂无描述。' }}</p>

        <div class="metric-panel">
          <div>
            <strong>{{ item.document_count || 0 }}</strong>
            <span>文件</span>
          </div>
          <div class="metric-divider"></div>
          <div>
            <strong>{{ item.chunk_count || 0 }}</strong>
            <span>片段</span>
          </div>
        </div>

        <div class="card-footer" @click.stop>
          <div>
            <span class="chunk-chip">{{ chunkMethodLabel(item.chunk_method) }}</span>
            <p class="date-text">{{ displayDate(item) }}</p>
          </div>
          <div class="card-actions">
            <el-dropdown trigger="click" @command="command => handleCardCommand(command, item)">
              <button class="more-btn" aria-label="更多操作">
                <el-icon><more-filled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit" v-hasPermi="['mag:kb:edit']">修改</el-dropdown-item>
                  <el-dropdown-item command="delete" class="danger-command" v-hasPermi="['mag:kb:remove']">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && datasetList.length === 0" description="暂无知识库" class="empty-state" />
    </div>

    <div class="pagination-shell" v-show="total > 0">
      <pagination
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="applyFilter"
      />
    </div>

    <el-dialog :title="title" v-model="open" width="520px" append-to-body class="knowledge-dialog">
      <el-form ref="datasetRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="知识库名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入知识库名称" maxlength="128" class="pill-input" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" maxlength="256" />
        </el-form-item>
        <el-form-item label="切分方式" prop="chunk_method">
          <el-select v-model="form.chunk_method" placeholder="选择切分方式" class="pill-select">
            <el-option v-for="item in chunkOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限" prop="permission">
          <el-radio-group v-model="form.permission" class="apple-radio-group">
            <el-radio value="me">仅自己</el-radio>
            <el-radio value="team">团队</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <button class="cc-btn cc-btn-light" @click="cancel">取消</button>
          <button class="cc-btn cc-btn-primary" @click="submitForm">确定</button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Dataset">
import { listDataset, addDataset, updateDataset, delDataset } from "@/api/mag/knowledgeBase"

const { proxy } = getCurrentInstance()
const router = useRouter()

const allDatasets = ref([])
const datasetList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const statusFilter = ref("")
const chunkFilter = ref("")

const chunkOptions = [
  { label: "通用 (naive)", shortLabel: "通用切分", value: "naive" },
  { label: "书籍 (book)", shortLabel: "书籍切分", value: "book" },
  { label: "邮件 (email)", shortLabel: "邮件切分", value: "email" },
  { label: "法律 (laws)", shortLabel: "法律切分", value: "laws" },
  { label: "手动 (manual)", shortLabel: "手动切分", value: "manual" },
  { label: "论文 (paper)", shortLabel: "论文切分", value: "paper" },
  { label: "问答 (qa)", shortLabel: "问答切分", value: "qa" },
  { label: "表格 (table)", shortLabel: "表格切分", value: "table" }
]

const data = reactive({
  form: {
    id: undefined,
    name: "",
    description: "",
    chunk_method: "naive",
    permission: "me"
  },
  queryParams: {
    pageNum: 1,
    pageSize: 12,
    name: undefined
  },
  rules: {
    name: [{ required: true, message: "知识库名称不能为空", trigger: "blur" }]
  }
})

const { form, queryParams, rules } = toRefs(data)

const totalKnowledgeBases = computed(() => allDatasets.value.length)
const totalDocuments = computed(() => sumBy(allDatasets.value, "document_count"))
const totalChunks = computed(() => sumBy(allDatasets.value, "chunk_count"))
const latestUpdateText = computed(() => {
  const latest = allDatasets.value
    .map(item => parseDatasetDate(item))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  if (!latest) return "--"
  const today = new Date()
  const isToday = latest.toDateString() === today.toDateString()
  const time = latest.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
  return isToday ? `今日 ${time}` : latest.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
})

const isCurrentPageAllSelected = computed({
  get() {
    return datasetList.value.length > 0 && datasetList.value.every(item => ids.value.includes(item.id))
  },
  set(checked) {
    const pageIds = datasetList.value.map(item => item.id)
    ids.value = checked
      ? Array.from(new Set([...ids.value, ...pageIds]))
      : ids.value.filter(id => !pageIds.includes(id))
    syncSelectionState()
  }
})

const isCurrentPageIndeterminate = computed(() => {
  const selectedCount = datasetList.value.filter(item => ids.value.includes(item.id)).length
  return selectedCount > 0 && selectedCount < datasetList.value.length
})

function sumBy(list, key) {
  return list.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

function fuzzyMatch(text, keyword) {
  return text && text.toLowerCase().includes(keyword.toLowerCase())
}

function applyFilter() {
  const keyword = (queryParams.value.name || '').trim()
  let list = allDatasets.value

  if (keyword) {
    list = list.filter(d => fuzzyMatch(d.name, keyword) || fuzzyMatch(d.description, keyword))
  }
  if (statusFilter.value) {
    list = list.filter(d => getDatasetStatus(d).type === statusFilter.value)
  }
  if (chunkFilter.value) {
    list = list.filter(d => (d.chunk_method || "naive") === chunkFilter.value)
  }

  total.value = list.length
  const maxPage = Math.max(1, Math.ceil(total.value / queryParams.value.pageSize))
  if (queryParams.value.pageNum > maxPage) queryParams.value.pageNum = maxPage
  const start = (queryParams.value.pageNum - 1) * queryParams.value.pageSize
  datasetList.value = list.slice(start, start + queryParams.value.pageSize)
  ids.value = ids.value.filter(id => allDatasets.value.some(item => item.id === id))
  syncSelectionState()
}

function getList() {
  loading.value = true
  listDataset({ pageNum: 1, pageSize: 500 }).then(response => {
    allDatasets.value = response.rows || []
    applyFilter()
    loading.value = false
  }).catch(() => {
    allDatasets.value = []
    applyFilter()
    loading.value = false
  })
}

let searchTimer = null
watch(() => queryParams.value.name, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    queryParams.value.pageNum = 1
    applyFilter()
  }, 300)
})

watch([statusFilter, chunkFilter], () => {
  queryParams.value.pageNum = 1
  applyFilter()
})

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function syncSelectionState() {
  single.value = ids.value.length !== 1
  multiple.value = ids.value.length === 0
}

function toggleCardSelection(row, checked) {
  ids.value = checked
    ? Array.from(new Set([...ids.value, row.id]))
    : ids.value.filter(id => id !== row.id)
  syncSelectionState()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加知识库"
}

function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  const current = row.id ? row : allDatasets.value.find(item => item.id === id) || {}
  open.value = true
  title.value = "修改知识库"
  form.value.id = id
  form.value.name = current.name
  form.value.description = current.description
  form.value.chunk_method = current.chunk_method || "naive"
  form.value.permission = current.permission || "me"
}

function handleFiles(row) {
  router.push({ name: 'KnowledgeFiles', params: { id: row.id }, query: { name: row.name } })
}

function handleCardCommand(command, row) {
  if (command === "edit") handleUpdate(row)
  if (command === "delete") handleDelete(row)
}

function submitForm() {
  proxy.$refs["datasetRef"].validate(valid => {
    if (valid) {
      const params = {
        name: form.value.name,
        description: form.value.description,
        chunk_method: form.value.chunk_method,
        permission: form.value.permission
      }
      if (form.value.id) {
        params.id = form.value.id
        updateDataset(params).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addDataset(params).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

function handleDelete(row) {
  const deleteIds = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除选中的知识库？').then(function() {
    return delDataset(deleteIds.join(","))
  }).then(() => {
    ids.value = ids.value.filter(id => !deleteIds.includes(id))
    syncSelectionState()
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    id: undefined,
    name: "",
    description: "",
    chunk_method: "naive",
    permission: "me"
  }
  proxy.resetForm("datasetRef")
}

function chunkMethodLabel(method) {
  return chunkOptions.find(item => item.value === (method || "naive"))?.shortLabel || "通用切分"
}

function getDatasetStatus(row) {
  const status = String(row.status ?? row.run ?? "").toLowerCase()
  if (["running", "parsing", "1"].includes(status)) return { type: "running", label: "解析中" }
  if (["fail", "failed", "error", "2"].includes(status) || Number(row.error_count || 0) > 0) return { type: "failed", label: "有失败" }
  if (["disabled", "stop", "stopped", "0"].includes(status)) return { type: "disabled", label: "停用" }
  return { type: "normal", label: "正常" }
}

function displayDate(row) {
  const val = row.create_date || row.create_time
  if (!val) return "--"
  // ISO string like "2026-05-10T16:27:35"
  if (typeof val === 'string' && val.includes('T')) {
    return val.replace('T', ' ').substring(0, 19)
  }
  // unix timestamp (seconds)
  if (typeof val === 'number' || /^\d+$/.test(String(val))) {
    return formatTime(val)
  }
  return val
}

function parseDatasetDate(row) {
  if (row.update_time) return new Date(Number(row.update_time) * 1000)
  if (row.create_time) return new Date(Number(row.create_time) * 1000)
  if (row.update_date) return new Date(row.update_date)
  if (row.create_date) return new Date(row.create_date)
  return null
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(Number(timestamp) * 1000)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})

getList()
</script>

<style scoped>
.knowledge-page {
  min-height: calc(100vh - 84px);
  padding: 16px 16px 18px;
  background: #f3f6fa;
  color: #20242c;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0 0 4px;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0;
}

.page-subtitle {
  margin: 0;
  color: #697386;
  font-size: 13px;
  line-height: 1.5;
}

.notice-strip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  margin-top: 8px;
  padding: 0 12px;
  border-radius: 7px;
  background: #e6f0ff;
  color: #0a6edc;
  font-size: 12px;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cc-btn {
  height: 38px;
  min-width: 86px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all .18s ease;
}

.cc-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.cc-btn-light {
  background: #fff;
  color: #20242c;
  border-color: #dbe2ec;
}

.cc-btn-light:hover:not(:disabled) {
  border-color: #b8c5d8;
}

.cc-btn-primary {
  background: #086ed4;
  color: #fff;
}

.cc-btn-primary:hover:not(:disabled) {
  background: #075fba;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.summary-card {
  height: 64px;
  padding: 12px 16px;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: #fff;
}

.summary-card span {
  display: block;
  margin-bottom: 4px;
  color: #747f91;
  font-size: 12px;
}

.summary-card strong {
  display: block;
  color: #20242c;
  font-size: 22px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0;
}

.filter-bar {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 10px 16px;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: #fff;
}

.filter-left,
.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

.filter-select {
  width: 140px;
}

.search-input :deep(.el-input__wrapper),
.filter-select :deep(.el-select__wrapper) {
  min-height: 40px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px #dbe2ec inset;
}

.search-input :deep(.el-input__wrapper.is-focus),
.filter-select :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #0b75de inset, 0 0 0 3px rgba(11, 117, 222, .12);
}

.danger-pill {
  height: 38px;
  padding: 0 22px;
  border: 1px solid #ffb7b4;
  border-radius: 999px;
  background: #fff7f7;
  color: #e5332f;
  font-weight: 600;
  cursor: pointer;
}

.danger-pill:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.list-count {
  color: #6f7a8c;
  font-size: 14px;
  margin-left: 8px;
}

.icon-refresh {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbe2ec;
  border-radius: 50%;
  background: #fff;
  color: #20242c;
  cursor: pointer;
}

.card-grid {
  min-height: 240px;
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr));
  gap: 14px;
  align-items: stretch;
}

.kb-card {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  padding: 14px 16px 10px;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: #fff;
  transition: border-color .18s ease, box-shadow .18s ease;
  cursor: pointer;
}

.kb-card:hover {
  border-color: #b9d5f8;
  box-shadow: 0 8px 20px rgba(24, 45, 78, .06);
}

.kb-card.selected {
  border-color: #0874dd;
  box-shadow: 0 0 0 1px #0874dd;
}

.card-top,
.card-footer,
.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kb-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  border-radius: 8px;
  background: #eef6ff;
  color: #0874dd;
  font-size: 22px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-title {
  margin: 12px 0 4px;
  color: #20242c;
  font-size: 15px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  min-height: 32px;
  margin: 0;
  color: #687385;
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.metric-panel {
  height: 44px;
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  align-items: center;
  margin-top: 10px;
  border-radius: 6px;
  background: #f8fafc;
}

.metric-panel div:not(.metric-divider) {
  text-align: center;
}

.metric-panel strong {
  display: block;
  color: #20242c;
  font-size: 15px;
  line-height: 1.1;
}

.metric-panel span {
  display: block;
  margin-top: 2px;
  color: #687385;
  font-size: 11px;
}

.metric-divider {
  width: 1px;
  height: 20px;
  background: #dfe5ee;
}

.card-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #edf1f6;
}

.chunk-chip {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 4px;
  background: #f0f3f7;
  color: #334054;
  font-size: 11px;
  font-weight: 600;
}

.date-text {
  margin: 4px 0 0;
  color: #95a0b2;
  font-size: 12px;
}

.more-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #667085;
  cursor: pointer;
}

.more-btn:hover {
  background: #f3f6fa;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-normal {
  background: #e4f5ea;
  color: #1b8d48;
}

.status-normal i {
  background: #20a957;
}

.status-running {
  background: #e6f1ff;
  color: #0874dd;
}

.status-running i {
  background: #0874dd;
}

.status-failed {
  background: #ffefef;
  color: #dd3732;
}

.status-failed i {
  background: #dd3732;
}

.status-disabled {
  background: #f1f3f6;
  color: #687385;
}

.status-disabled i {
  background: #9aa4b2;
}

.empty-state {
  grid-column: 1 / -1;
  min-height: 300px;
  border: 1px solid #dfe5ee;
  border-radius: 14px;
  background: #fff;
}

.pagination-shell {
  margin-top: 18px;
  padding: 12px 16px;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: #fff;
}

.pagination-shell :deep(.pagination-container) {
  margin: 0;
  padding: 0;
  background: transparent;
}

.knowledge-dialog :deep(.el-dialog) {
  border-radius: 18px;
}

.knowledge-dialog :deep(.el-dialog__header) {
  padding: 26px 30px 0;
}

.knowledge-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 700;
}

.knowledge-dialog :deep(.el-dialog__body) {
  padding: 24px 30px;
}

.knowledge-dialog :deep(.el-dialog__footer) {
  padding: 0 30px 28px;
}

.pill-input :deep(.el-input__wrapper),
.pill-select :deep(.el-select__wrapper) {
  border-radius: 10px;
}

.knowledge-dialog :deep(.el-textarea__inner) {
  border-radius: 10px;
  resize: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-checkbox__inner) {
  border-radius: 3px;
  border-color: #c8d2df;
}

@media (max-width: 1400px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(200px, 1fr));
  }
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-grid {
    grid-template-columns: repeat(2, minmax(200px, 1fr));
  }
}

@media (max-width: 760px) {
  .knowledge-page {
    padding: 18px 14px 24px;
  }

  .page-header,
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions,
  .filter-left,
  .filter-right {
    width: 100%;
  }

  .notice-strip,
  .search-input,
  .filter-select {
    width: 100%;
    min-width: 0;
  }

  .summary-grid,
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
