<template>
  <div class="apple-container">
    <!-- 导航栏 -->
    <div class="nav-bar">
      <button class="back-link" @click="goBack">
        <el-icon><arrow-left /></el-icon>
        <span>返回知识库列表</span>
      </button>
      <div class="breadcrumb-divider">/</div>
      <span class="current-label">知识库：{{ knowledgeBaseName }}</span>
    </div>

    <!-- 搜索区域 -->
    <div class="search-row" v-show="showSearch">
      <div class="search-input-wrapper">
        <el-input
          v-model="queryParams.keywords"
          placeholder="搜索文件"
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
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button
          class="apple-btn apple-btn-primary"
          @click="uploadDialogVisible = true"
          v-hasPermi="['mag:kb:add']"
        >
          <el-icon class="btn-icon"><upload-filled /></el-icon>
          <span>上传文件</span>
        </button>
        <button
          class="apple-btn apple-btn-ghost"
          @click="openFileBrowser"
          v-hasPermi="['mag:kb:add']"
        >
          <el-icon class="btn-icon"><plus /></el-icon>
          <span>从文件管理选择</span>
        </button>
        <button
          class="apple-btn apple-btn-ghost"
          :disabled="multiple"
          @click="handleBulkParseAction"
          v-hasPermi="['mag:kb:edit']"
        >
          <el-icon class="btn-icon"><video-play v-if="bulkParseAction === 'parse'" /><video-pause v-else-if="bulkParseAction === 'stop'" /><refresh v-else /></el-icon>
          <span>{{ bulkParseLabel }}</span>
        </button>
        <button
          class="apple-btn apple-btn-ghost"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['mag:kb:remove']"
        >
          <el-icon class="btn-icon"><delete /></el-icon>
          <span>删除选中</span>
        </button>
      </div>
      <div class="toolbar-right">
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="table-wrapper">
      <el-table
        v-loading="loading"
        :data="docList"
        class="apple-table"
        @selection-change="handleSelectionChange"
        row-class-name="table-row"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column label="文件名称" prop="name" :show-overflow-tooltip="true" min-width="220" />
        <el-table-column label="大小" align="center" width="100">
          <template #default="scope">
            <span class="meta-text">{{ formatFileSize(scope.row.size) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" width="140">
          <template #default="scope">
            <div class="status-cell">
              <span class="status-chip" :class="'status-' + (scope.row.run || 'UNSTART').toLowerCase()">
                <span class="status-dot"></span>
                {{ statusLabel(scope.row.run) }}
              </span>
              <div v-if="scope.row.run === 'RUNNING' && scope.row.progress != null" class="mini-progress">
                <div class="mini-progress-track">
                  <div class="mini-progress-fill" :style="{ width: (scope.row.progress * 100) + '%' }"></div>
                </div>
                <span class="mini-progress-text">{{ Math.round(scope.row.progress * 100) }}%</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="块数" align="center" width="80">
          <template #default="scope">
            <span class="meta-text">{{ scope.row.chunk_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" width="180">
          <template #default="scope">
            <span class="meta-text">{{ scope.row.create_date || formatTime(scope.row.create_time) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="280">
          <template #default="scope">
            <!-- UNSTART / CANCEL → 解析 -->
            <el-tooltip v-if="scope.row.run === 'UNSTART' || scope.row.run === 'CANCEL' || !scope.row.run" content="解析文档" placement="top" :show-after="300">
              <el-button link type="primary" class="table-link" @click="handleParseSingle(scope.row)" v-hasPermi="['mag:kb:edit']">
                <el-icon><video-play /></el-icon>
              </el-button>
            </el-tooltip>
            <!-- RUNNING → 停止解析 -->
            <el-tooltip v-if="scope.row.run === 'RUNNING'" content="停止解析" placement="top" :show-after="300">
              <el-button link type="warning" class="table-link" @click="handleStopParsingSingle(scope.row)" v-hasPermi="['mag:kb:edit']">
                <el-icon><video-pause /></el-icon>
              </el-button>
            </el-tooltip>
            <!-- DONE / FAIL → 重新解析 -->
            <el-tooltip v-if="scope.row.run === 'DONE' || scope.row.run === 'FAIL'" content="重新解析" placement="top" :show-after="300">
              <el-button link type="primary" class="table-link" @click="handleParseSingle(scope.row)" v-hasPermi="['mag:kb:edit']">
                <el-icon><refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="下载" placement="top" :show-after="300">
              <el-button link type="primary" class="table-link" @click="handleDownload(scope.row)">
                <el-icon><download /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="重命名" placement="top" :show-after="300">
              <el-button link type="primary" class="table-link" @click="openRename(scope.row)" v-hasPermi="['mag:kb:edit']">
                <el-icon><edit /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top" :show-after="300">
              <el-button link type="danger" class="table-link" @click="handleDelete(scope.row)" v-hasPermi="['mag:kb:remove']">
                <el-icon><delete /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 从文件管理选择对话框 -->
    <el-dialog v-model="fileBrowserVisible" title="从文件管理选择文件" width="650px" append-to-body class="apple-dialog">
      <div class="file-browser">
        <div class="fb-breadcrumb">
          <span class="fb-breadcrumb-item" @click="fbNavigateTo('')">根目录</span>
          <template v-for="(fb, idx) in fbBreadcrumb" :key="fb.id">
            <el-icon class="fb-breadcrumb-sep"><arrow-right /></el-icon>
            <span class="fb-breadcrumb-item" :class="{ current: idx === fbBreadcrumb.length - 1 }" @click="fbNavigateTo(fb.id)">{{ fb.name }}</span>
          </template>
        </div>
        <div class="fb-table-wrapper">
          <el-table :data="fbFileList" class="apple-table" @selection-change="fbSelectionChange" max-height="320">
            <el-table-column type="selection" width="48" align="center" />
            <el-table-column label="名称" min-width="220">
              <template #default="scope">
                <div class="file-name-cell" @click="fbEnterFolder(scope.row)">
                  <el-icon class="file-icon"><folder v-if="scope.row.type === 'folder'" /><document v-else /></el-icon>
                  <span class="file-name">{{ scope.row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="大小" align="center" width="100">
              <template #default="scope"><span class="meta-text">{{ scope.row.type === 'folder' ? '—' : formatFileSize(scope.row.size) }}</span></template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="fileBrowserVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" :disabled="fbSelectedIds.length === 0" @click="submitFileLink">关联选中文件</button>
        </div>
      </template>
    </el-dialog>

    <!-- 上传文件对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传文件" width="500px" append-to-body class="apple-dialog" @open="onUploadDialogOpen" @close="handleUploadDialogClose">
      <div class="upload-dialog-body">
        <el-upload
          ref="uploadRef"
          class="dialog-upload"
          drag
          :auto-upload="false"
          :before-upload="beforeUpload"
          @change="onUploadChange"
          :show-file-list="false"
          multiple
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.md,.csv,.html,.htm,.png,.jpg,.jpeg"
        >
          <div v-if="uploadFileStates.length === 0" class="upload-dialog-content">
            <div class="upload-icon-circle">
              <el-icon class="upload-icon"><upload-filled /></el-icon>
            </div>
            <p class="upload-title">将文件拖到此处</p>
            <p class="upload-hint">或点击选择文件</p>
            <p class="upload-formats">PDF、DOC、TXT、Excel、PPT、Markdown、CSV、HTML、图片等</p>
            <p class="upload-limit">单个文件不超过 50MB</p>
          </div>
          <div v-else class="upload-dialog-content upload-dialog-compact">
            <p class="upload-hint" style="margin:0">继续添加文件</p>
          </div>
        </el-upload>
        <!-- 自定义文件列表 + 进度条 -->
        <div v-if="uploadFileStates.length > 0" class="upload-file-list">
          <div v-for="(f, idx) in uploadFileStates" :key="idx" class="upload-file-row">
            <el-icon class="ufr-icon" :class="'ufr-' + f.status">
              <document v-if="f.status === 'pending'" />
              <loading v-else-if="f.status === 'uploading'" />
              <circle-check-filled v-else-if="f.status === 'done'" />
              <circle-close-filled v-else />
            </el-icon>
            <span class="ufr-name">{{ f.name }}</span>
            <span class="ufr-size">{{ formatFileSize(f.size) }}</span>
            <div v-if="f.status === 'uploading'" class="ufr-progress">
              <div class="ufr-progress-track">
                <div class="ufr-progress-fill" :style="{ width: f.progress + '%' }"></div>
              </div>
            </div>
            <el-icon v-if="f.status === 'pending' && !uploading" class="ufr-remove" @click="removeUploadFile(idx)"><close /></el-icon>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="uploadDialogVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" :disabled="uploading || uploadFileStates.length === 0" @click="submitUpload">
            <span v-if="uploading">上传中...</span>
            <span v-else>保存</span>
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 重命名对话框 -->
    <el-dialog v-model="renameVisible" title="重命名文档" width="420px" append-to-body class="apple-dialog">
      <div class="rename-content">
        <el-input v-model="renameForm.name" placeholder="输入新名称" class="pill-input" @keyup.enter="submitRename" />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="renameVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" :disabled="!renameForm.name" @click="submitRename">确认</button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KnowledgeFiles">
import { listDocument, delDocument, downloadDocumentUrl, updateDocument, parseDocuments, stopParsing, listFiles, linkToDatasets } from "@/api/mag/knowledgeBase"
import { getToken } from "@/utils/auth"

const { proxy } = getCurrentInstance()
const router = useRouter()
const route = useRoute()

const datasetId = ref(route.params.id)
const knowledgeBaseName = ref(route.query.name || "")

const loading = ref(false)
const showSearch = ref(true)
const uploadDialogVisible = ref(false)
const uploadRef = ref(null)
const uploading = ref(false)
const uploadFileStates = ref([])
const docList = ref([])
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  keywords: undefined
})

function statusLabel(run) {
  const map = {
    'DONE': '已完成',
    'RUNNING': '解析中',
    'FAIL': '失败',
    'CANCEL': '已取消'
  }
  return map[run] || '未开始'
}

let pollTimer = null

function getList(options = {}) {
  if (!options.silent) {
    loading.value = true
  }
  listDocument(datasetId.value, queryParams.value).then(response => {
    if (options.silent) {
      detectStatusChanges(response.rows)
    }
    docList.value = response.rows
    total.value = response.total
    loading.value = false
    schedulePoll()
  })
}

function detectStatusChanges(newDocs) {
  const oldMap = {}
  docList.value.forEach(d => { oldMap[d.id] = d.run })
  newDocs.forEach(d => {
    const prev = oldMap[d.id]
    if (prev === 'RUNNING' && d.run === 'DONE') {
      proxy.$modal.msgSuccess('解析完成: ' + d.name)
    } else if (prev === 'RUNNING' && d.run === 'FAIL') {
      proxy.$modal.msgError('解析失败: ' + d.name)
    }
  })
}

function schedulePoll() {
  clearTimeout(pollTimer)
  const hasRunning = docList.value.some(d => d.run === 'RUNNING')
  if (hasRunning) {
    pollTimer = setTimeout(() => getList({ silent: true }), 2000)
  }
}

onBeforeUnmount(() => {
  clearTimeout(pollTimer)
  clearTimeout(searchTimer)
})

let searchTimer = null
watch(() => queryParams.value.keywords, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    queryParams.value.pageNum = 1
    getList()
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

const selectedRows = ref([])

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  selectedRows.value = selection
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

const bulkParseAction = computed(() => {
  if (selectedRows.value.length === 0) return 'parse'
  const allRunning = selectedRows.value.every(r => r.run === 'RUNNING')
  if (allRunning) return 'stop'
  const allDoneOrFail = selectedRows.value.every(r => r.run === 'DONE' || r.run === 'FAIL')
  if (allDoneOrFail) return 'reparse'
  return 'parse'
})

const bulkParseLabel = computed(() => {
  return { parse: '解析', stop: '停止解析', reparse: '重新解析' }[bulkParseAction.value]
})

function beforeUpload(file) {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    proxy.$modal.msgError("文件大小不能超过50MB")
    return false
  }
  return true
}

function onUploadDialogOpen() {
  uploadFileStates.value = []
  uploadRef.value?.clearFiles()
}

function onUploadChange(_file, fileList) {
  uploadFileStates.value = fileList.map(f => ({
    name: f.name,
    size: f.size,
    raw: f.raw,
    status: 'pending',
    progress: 0,
    uid: f.uid
  }))
}

function removeUploadFile(idx) {
  uploadFileStates.value.splice(idx, 1)
}

function handleUploadDialogClose() {
  if (!uploading.value) {
    uploadFileStates.value = []
  }
}

function uploadSingleFile(fileObj, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', fileObj.raw)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        fileObj.progress = Math.round((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(xhr.statusText))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(new Error('Aborted')))

    // 直接请求后端，绕过 Vite proxy 以避免缓冲导致 progress 事件失效
    xhr.open('POST', 'http://localhost:8081/mag/kb/doc/upload/' + datasetId.value)
    xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    xhr.send(formData)
  })
}

async function submitUpload() {
  if (uploadFileStates.value.length === 0) return
  uploading.value = true
  const token = getToken()
  let success = 0, fail = 0
  for (const f of uploadFileStates.value) {
    f.status = 'uploading'
    f.progress = 0
    try {
      await uploadSingleFile(f, token)
      f.status = 'done'
      f.progress = 100
      success++
    } catch {
      f.status = 'error'
      fail++
    }
  }
  uploading.value = false
  if (fail === 0) {
    proxy.$modal.msgSuccess('上传完成（' + success + ' 个文件）')
    uploadDialogVisible.value = false
    uploadFileStates.value = []
  } else {
    proxy.$modal.msgWarning('上传完成：' + success + ' 个成功，' + fail + ' 个失败')
  }
  getList()
}

function handleDownload(row) {
  const url = downloadDocumentUrl(datasetId.value, row.id)
  const link = document.createElement('a')
  link.href = url
  link.download = row.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleDelete(row) {
  const deleteIds = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除选中的文件？').then(function() {
    return delDocument(datasetId.value, deleteIds.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function goBack() {
  router.push('/mag/kb')
}

// ========== 文件浏览器（从文件管理选择）==========
const fileBrowserVisible = ref(false)
const fbCurrentParentId = ref("")
const fbFileList = ref([])
const fbSelectedIds = ref([])
const fbBreadcrumb = ref([])

async function openFileBrowser() {
  fileBrowserVisible.value = true
  fbCurrentParentId.value = ""
  fbBreadcrumb.value = []
  await fbFetchFiles()
}

async function fbFetchFiles() {
  try {
    const data = await listFiles({ parentId: fbCurrentParentId.value || undefined, page: 1, pageSize: 200 })
    fbFileList.value = (data.rows || []).filter(f => f.type !== 'folder')  // 只显示文件
  } catch { fbFileList.value = [] }
}

function fbEnterFolder(row) {
  if (row.type === 'folder') {
    fbNavigateTo(row.id)
  }
}

async function fbNavigateTo(id) {
  fbCurrentParentId.value = id || ""
  fbSelectedIds.value = []
  // 简单面包屑：用父文件夹名
  if (id) {
    try {
      const data = await listFiles({ parentId: id, page: 1, pageSize: 1 })
      // 尝试获取当前文件夹信息
    } catch {}
  }
  await fbFetchFiles()
}

function fbSelectionChange(selection) {
  fbSelectedIds.value = selection.map(s => s.id)
}

async function submitFileLink() {
  await linkToDatasets({ file_ids: fbSelectedIds.value, kb_ids: [datasetId.value] })
  proxy.$modal.msgSuccess("关联成功")
  fileBrowserVisible.value = false
  getList()
}

// ========== 重命名 ==========
const renameVisible = ref(false)
const renameForm = ref({ id: "", name: "" })

function openRename(row) {
  renameForm.value = { id: row.id, name: row.name }
  renameVisible.value = true
}

async function submitRename() {
  try {
    await updateDocument(datasetId.value, renameForm.value.id, { name: renameForm.value.name })
    proxy.$modal.msgSuccess("重命名成功")
    renameVisible.value = false
    getList()
  } catch {}
}

// ========== 解析 / 停止解析 / 重新解析 ==========
function handleBulkParseAction() {
  if (bulkParseAction.value === 'stop') {
    proxy.$modal.confirm('确认要停止解析选中的文档吗？').then(function () {
      return stopParsing(datasetId.value, ids.value)
    }).then(() => {
      proxy.$modal.msgSuccess("已停止解析")
      getList()
    }).catch(() => {})
  } else {
    const label = bulkParseAction.value === 'reparse' ? '重新解析' : '解析'
    proxy.$modal.confirm('确认要' + label + '选中的文档吗？' + (label === '重新解析' ? '这将重新生成文档块。' : '')).then(function () {
      return parseDocuments(datasetId.value, ids.value)
    }).then(() => {
      proxy.$modal.msgSuccess("已开始" + label)
      getList()
    }).catch(() => {})
  }
}

function handleParseSingle(row) {
  parseDocuments(datasetId.value, [row.id]).then(() => {
    proxy.$modal.msgSuccess("已开始解析: " + row.name)
    getList()
  })
}

function handleStopParsingSingle(row) {
  stopParsing(datasetId.value, [row.id]).then(() => {
    proxy.$modal.msgSuccess("已停止解析: " + row.name)
    getList()
  })
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return size.toFixed(1) + ' ' + units[i]
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

getList()
</script>

<style scoped>
/* ========== Apple Design Tokens ========== */

.apple-container {
  font-family: "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1d1d1f;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

/* ---- Navigation Bar ---- */
.nav-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 36px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e8e8ed;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #0066cc;
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 17px;
  font-weight: 400;
  cursor: pointer;
  padding: 0;
  letter-spacing: -0.374px;
  transition: color 0.15s ease;
}

.back-link:hover {
  color: #0071e3;
}

.breadcrumb-divider {
  color: #d2d2d7;
  font-size: 17px;
}

.current-label {
  font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
  font-size: 21px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 0.231px;
}

/* ---- Upload Dialog ---- */
.upload-dialog-body {
  padding: 4px 0;
}

.dialog-upload :deep(.el-upload-dragger) {
  background: #fafafc;
  border: 2px dashed #d2d2d7;
  border-radius: 18px;
  padding: 36px 20px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.dialog-upload :deep(.el-upload-dragger:hover) {
  border-color: #0066cc;
  background: rgba(0, 102, 204, 0.02);
}

.upload-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.upload-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 102, 204, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.upload-icon {
  font-size: 22px;
  color: #0066cc;
}

.upload-title {
  font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
  letter-spacing: -0.374px;
}

.upload-hint {
  font-size: 13px;
  color: #0066cc;
  margin: 0;
  font-weight: 400;
}

.upload-formats {
  font-size: 12px;
  color: #7a7a7a;
  margin: 8px 0 0;
  letter-spacing: -0.1px;
}

.upload-limit {
  font-size: 11px;
  color: #b0b0b5;
  margin: 2px 0 0;
  letter-spacing: -0.12px;
}

.upload-dialog-compact {
  padding: 12px 0;
}

/* ---- Upload File List ---- */
.upload-file-list {
  margin-top: 12px;
  max-height: 260px;
  overflow-y: auto;
}

.upload-file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f5f5f7;
  margin-bottom: 6px;
}

.ufr-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.ufr-icon.ufr-pending { color: #8e8e93; }
.ufr-icon.ufr-uploading { color: #0066cc; animation: spin 1.2s linear infinite; }
.ufr-icon.ufr-done { color: #34c759; }
.ufr-icon.ufr-error { color: #ff3b30; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ufr-name {
  flex: 1;
  font-size: 13px;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ufr-size {
  font-size: 12px;
  color: #8e8e93;
  flex-shrink: 0;
  min-width: 48px;
  text-align: right;
}

.ufr-progress {
  width: 60px;
  flex-shrink: 0;
}

.ufr-progress-track {
  width: 100%;
  height: 3px;
  background: #e8e8ed;
  border-radius: 9999px;
  overflow: hidden;
}

.ufr-progress-fill {
  height: 100%;
  background: #0066cc;
  border-radius: 9999px;
  transition: width 0.15s ease;
}

.ufr-remove {
  font-size: 14px;
  color: #b0b0b5;
  cursor: pointer;
  flex-shrink: 0;
}
.ufr-remove:hover { color: #ff3b30; }

/* ---- Search Row ---- */
.search-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.search-input-wrapper {
  flex: 1;
  max-width: 320px;
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
}

.pill-input :deep(.el-input__inner::placeholder) {
  color: #b0b0b5;
}

.search-icon {
  color: #b0b0b5;
  font-size: 16px;
}

/* ---- Toolbar ---- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
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

.meta-text {
  font-size: 14px;
  color: #7a7a7a;
}

/* ---- Status Cell ---- */
.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* ---- Status Chips ---- */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-done {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.status-done .status-dot {
  background: #34c759;
}

.status-running {
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
}

.status-running .status-dot {
  background: #007aff;
}

.status-fail {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.status-fail .status-dot {
  background: #ff3b30;
}

.status-cancel {
  background: rgba(142, 142, 147, 0.1);
  color: #8e8e93;
}

.status-cancel .status-dot {
  background: #8e8e93;
}

.status-unstart {
  background: rgba(142, 142, 147, 0.08);
  color: #8e8e93;
}

.status-unstart .status-dot {
  background: #8e8e93;
}

/* ---- Mini Progress Bar ---- */
.mini-progress {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-progress-track {
  width: 52px;
  height: 3px;
  background: #e8e8ed;
  border-radius: 9999px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: #007aff;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.mini-progress-text {
  font-size: 10px;
  color: #8e8e93;
  font-weight: 500;
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  min-width: 28px;
}

/* ---- Table Links ---- */
.table-link :deep(.el-icon) {
  margin-right: 2px;
}

/* ---- Ghost Button Variant ---- */
.apple-btn-ghost {
  background: transparent;
  color: #0066cc;
  border: 1px solid #0066cc;
}
.apple-btn-ghost:hover:not(:disabled) {
  background: rgba(0,102,204,0.06);
}

/* ---- File Browser Dialog ---- */
.file-browser { min-height: 300px; }
.fb-breadcrumb { display: flex; align-items: center; gap: 4px; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.fb-breadcrumb-item { font-size: 14px; color: #0066cc; cursor: pointer; }
.fb-breadcrumb-item:hover { text-decoration: underline; }
.fb-breadcrumb-item.current { color: #1d1d1f; font-weight: 500; cursor: default; text-decoration: none; }
.fb-breadcrumb-sep { color: #d2d2d7; font-size: 12px; }
.fb-table-wrapper { max-height: 340px; overflow-y: auto; }
.file-name-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.file-icon { color: #b0b0b5; font-size: 16px; flex-shrink: 0; }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---- Rename Dialog ---- */
.rename-content { padding: 8px 0; }

/* ---- Dialog ---- */
.apple-dialog :deep(.el-dialog) { border-radius: 18px; box-shadow: 0 8px 40px rgba(0,0,0,0.12); }
.apple-dialog :deep(.el-dialog__header) { padding: 28px 32px 0; }
.apple-dialog :deep(.el-dialog__title) { font-family: "SF Pro Display", system-ui, -apple-system, sans-serif; font-size: 21px; font-weight: 600; }
.apple-dialog :deep(.el-dialog__body) { padding: 24px 32px; }
.apple-dialog :deep(.el-dialog__footer) { padding: 0 32px 28px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
</style>
