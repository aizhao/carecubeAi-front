<template>
  <div class="apple-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">知识库</h1>
      <p class="page-subtitle">管理你的知识库，上传文件并构建智能检索</p>
    </div>

    <!-- 搜索区域 —— 胶囊输入框 -->
    <div class="search-row" v-show="showSearch">
      <div class="search-input-wrapper">
        <el-input
          v-model="queryParams.name"
          placeholder="搜索知识库"
          clearable
          class="pill-input"
          @keyup.enter="handleQuery"
          @clear="handleQuery"
        >
          <template #prefix>
            <el-icon class="search-icon"><search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="search-actions" v-show="showSearch">
        <span class="search-count" v-if="total > 0">{{ total }} 个结果</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="apple-btn apple-btn-primary" @click="handleAdd" v-hasPermi="['mag:kb:add']">
          <el-icon class="btn-icon"><plus /></el-icon>
          <span>新增知识库</span>
        </button>
        <button class="apple-btn apple-btn-ghost" :disabled="single" @click="handleUpdate" v-hasPermi="['mag:kb:edit']">
          修改
        </button>
        <button class="apple-btn apple-btn-ghost" :disabled="multiple" @click="handleDelete" v-hasPermi="['mag:kb:remove']">
          删除
        </button>
      </div>
      <div class="toolbar-right">
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-wrapper">
      <el-table
        v-loading="loading"
        :data="datasetList"
        class="apple-table"
        @selection-change="handleSelectionChange"
        row-class-name="table-row"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column label="名称" prop="name" :show-overflow-tooltip="true" min-width="200" />
        <el-table-column label="描述" prop="description" :show-overflow-tooltip="true" min-width="180" />
        <el-table-column label="文件数" align="center" prop="document_count" width="100" />
        <el-table-column label="块数" align="center" prop="chunk_count" width="80" />
        <el-table-column label="切分方式" align="center" width="120">
          <template #default="scope">
            <span class="chip-label">{{ scope.row.chunk_method || 'naive' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" width="180">
          <template #default="scope">
            <span class="time-text">{{ scope.row.create_date || formatTime(scope.row.create_time) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="260">
          <template #default="scope">
            <el-button link type="primary" class="table-link" @click="handleFiles(scope.row)">
              <el-icon><folder-opened /></el-icon>
              <span>管理文件</span>
            </el-button>
            <el-button link type="primary" class="table-link" @click="handleUpdate(scope.row)" v-hasPermi="['mag:kb:edit']">
              <el-icon><edit /></el-icon>
              <span>修改</span>
            </el-button>
            <el-button link type="primary" class="table-link" @click="handleDelete(scope.row)" v-hasPermi="['mag:kb:remove']">
              <el-icon><delete /></el-icon>
              <span>删除</span>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="applyFilter"
    />

    <!-- 添加 / 修改知识库对话框 -->
    <el-dialog :title="title" v-model="open" width="520px" append-to-body class="apple-dialog">
      <el-form ref="datasetRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="知识库名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入知识库名称" maxlength="128" class="pill-input" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" maxlength="256" />
        </el-form-item>
        <el-form-item label="切分方式" prop="chunk_method">
          <el-select v-model="form.chunk_method" placeholder="选择切分方式" class="pill-select">
            <el-option label="通用 (naive)" value="naive" />
            <el-option label="书籍 (book)" value="book" />
            <el-option label="邮件 (email)" value="email" />
            <el-option label="法律 (laws)" value="laws" />
            <el-option label="手动 (manual)" value="manual" />
            <el-option label="论文 (paper)" value="paper" />
            <el-option label="问答 (qa)" value="qa" />
            <el-option label="表格 (table)" value="table" />
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
          <button class="apple-btn apple-btn-ghost" @click="cancel">取消</button>
          <button class="apple-btn apple-btn-primary" @click="submitForm">确定</button>
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
    pageSize: 10,
    name: undefined
  },
  rules: {
    name: [{ required: true, message: "知识库名称不能为空", trigger: "blur" }]
  }
})

const { form, queryParams, rules } = toRefs(data)

function fuzzyMatch(text, keyword) {
  return text && text.toLowerCase().includes(keyword.toLowerCase())
}

function applyFilter() {
  const keyword = (queryParams.value.name || '').trim()
  let list = allDatasets.value
  if (keyword) {
    list = list.filter(d => fuzzyMatch(d.name, keyword) || fuzzyMatch(d.description, keyword))
  }
  total.value = list.length
  const start = (queryParams.value.pageNum - 1) * queryParams.value.pageSize
  datasetList.value = list.slice(start, start + queryParams.value.pageSize)
}

/** 查询知识库列表（首次加载全量） */
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

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加知识库"
}

function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  open.value = true
  title.value = "修改知识库"
  form.value.id = id
  form.value.name = row.name
  form.value.description = row.description
  form.value.chunk_method = row.chunk_method || "naive"
  form.value.permission = row.permission || "me"
}

function handleFiles(row) {
  router.push({ name: 'KnowledgeFiles', params: { id: row.id }, query: { name: row.name } })
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
  proxy.$modal.confirm('是否确认删除选中的数据项？').then(function() {
    return delDataset(deleteIds.join(","))
  }).then(() => {
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

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})

getList()
</script>

<style scoped>
/* ========== Apple Design Tokens ========== */
/* Primary: #0066cc, Ink: #1d1d1f, Parchment: #f5f5f7, Hairline: #e0e0e0 */

.apple-container {
  font-family: "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1d1d1f;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

/* ---- Page Header ---- */
.page-header {
  margin-bottom: 40px;
}

.page-title {
  font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
  color: #1d1d1f;
  margin: 0;
}

.page-subtitle {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #7a7a7a;
  margin: 8px 0 0;
}

/* ---- Search Row ---- */
.search-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.search-input-wrapper {
  flex: 1;
  max-width: 360px;
}

.search-count {
  font-size: 14px;
  color: #7a7a7a;
  letter-spacing: -0.224px;
}

/* ---- Pill Input ---- */
.pill-input :deep(.el-input__wrapper) {
  border-radius: 9999px;
  background: #f5f5f7;
  border: none;
  box-shadow: none;
  padding: 10px 18px;
  transition: background 0.2s ease;
}

.pill-input :deep(.el-input__wrapper:hover) {
  background: #ebebed;
}

.pill-input :deep(.el-input__wrapper.is-focus) {
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
}

.pill-input :deep(.el-input__inner) {
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 17px;
  color: #1d1d1f;
  line-height: 1.47;
}

.pill-input :deep(.el-input__inner::placeholder) {
  color: #b0b0b5;
}

.search-icon {
  color: #b0b0b5;
  font-size: 16px;
}

/* ---- Pill Select ---- */
.pill-select :deep(.el-input__wrapper) {
  border-radius: 9999px;
  background: #f5f5f7;
  border: none;
  box-shadow: none;
}

.pill-select :deep(.el-input__wrapper:hover) {
  background: #ebebed;
}

.pill-select :deep(.el-input__wrapper.is-focus) {
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
}

/* ---- Toolbar ---- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ---- Apple Buttons ---- */
.apple-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.24px;
  line-height: 1;
  padding: 11px 22px;
  border-radius: 9999px;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.apple-btn:active {
  transform: scale(0.95);
}

.apple-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
}

.apple-btn-primary {
  background: #0066cc;
  color: #ffffff;
}

.apple-btn-primary:hover:not(:disabled) {
  background: #0071e3;
}

.apple-btn-ghost {
  background: transparent;
  color: #0066cc;
  border: 1px solid #0066cc;
}

.apple-btn-ghost:hover:not(:disabled) {
  background: rgba(0, 102, 204, 0.06);
}

.btn-icon {
  font-size: 16px;
}

/* ---- Table ---- */
.table-wrapper {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8ed;
  overflow: hidden;
}

.apple-table {
  --el-table-border-color: #f0f0f0;
  --el-table-header-bg-color: #fafafc;
}

.apple-table :deep(.el-table__header th) {
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #7a7a7a;
  letter-spacing: -0.1px;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafc;
}

.apple-table :deep(.el-table__body td) {
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 15px;
  color: #1d1d1f;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f7;
}

.apple-table :deep(.table-row:last-child td) {
  border-bottom: none;
}

.apple-table :deep(.table-row:hover td) {
  background: rgba(0, 102, 204, 0.02);
}

.apple-table :deep(.el-checkbox__inner) {
  border-radius: 5px;
  border-color: #d2d2d7;
}

.chip-label {
  display: inline-block;
  font-size: 13px;
  color: #7a7a7a;
  background: #f5f5f7;
  padding: 4px 12px;
  border-radius: 9999px;
}

.time-text {
  font-size: 14px;
  color: #7a7a7a;
}

/* ---- Table Links ---- */
.table-link :deep(.el-icon) {
  margin-right: 2px;
}

/* ---- Dialog ---- */
.apple-dialog :deep(.el-dialog) {
  border-radius: 18px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}

.apple-dialog :deep(.el-dialog__header) {
  padding: 28px 32px 0;
}

.apple-dialog :deep(.el-dialog__title) {
  font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.apple-dialog :deep(.el-dialog__body) {
  padding: 24px 32px;
}

.apple-dialog :deep(.el-dialog__footer) {
  padding: 0 32px 28px;
}

.apple-dialog :deep(.el-form-item__label) {
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -0.224px;
  margin-bottom: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* ---- Radio Group ---- */
.apple-radio-group :deep(.el-radio__label) {
  font-size: 15px;
  color: #1d1d1f;
}

/* ---- Textarea ---- */
.apple-dialog :deep(.el-textarea__inner) {
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 15px;
  color: #1d1d1f;
  padding: 12px 16px;
  resize: none;
  transition: border-color 0.2s ease;
}

.apple-dialog :deep(.el-textarea__inner:focus) {
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.12);
}
</style>
