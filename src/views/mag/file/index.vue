<template>
  <div class="apple-container">
    <div class="page-header">
      <h1 class="page-title">文件管理</h1>
      <p class="page-subtitle">组织和管理你的文件，将文件关联到知识库进行智能检索</p>
    </div>

    <div class="file-manager">
      <!-- 左侧文件夹树 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">目录</span>
        </div>
        <div class="tree-wrapper">
          <div class="tree-node root-node" :class="{ active: currentParentId === '' || !currentParentId }" @click="navigateTo('')">
            <el-icon class="tree-icon"><folder-opened /></el-icon>
            <span>根目录</span>
          </div>
          <div v-for="folder in folderTree" :key="folder.id" class="tree-node-wrapper">
            <div
              class="tree-node"
              :class="{ active: currentParentId === folder.id }"
              :style="{ paddingLeft: (folder._depth || 1) * 20 + 'px' }"
              @click="navigateTo(folder.id)"
            >
              <el-icon class="tree-icon"><folder /></el-icon>
              <span class="tree-name">{{ folder.name }}</span>
              <span class="tree-count" v-if="folder._childCount > 0">{{ folder._childCount }}</span>
            </div>
          </div>
          <div v-if="folderLoading" class="tree-loading"><el-icon class="is-loading"><loading /></el-icon></div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="main-content">
        <!-- 面包屑 -->
        <div class="breadcrumb" v-if="breadcrumb.length > 0">
          <span class="breadcrumb-item" @click="navigateTo('')">根目录</span>
          <template v-for="(item, idx) in breadcrumb" :key="item.id">
            <el-icon class="breadcrumb-sep"><arrow-right /></el-icon>
            <span
              class="breadcrumb-item"
              :class="{ current: idx === breadcrumb.length - 1 }"
              @click="navigateTo(item.id)"
            >{{ item.name }}</span>
          </template>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar">
          <button class="apple-btn apple-btn-primary" @click="openCreateFolder" v-hasPermi="['mag:file:add']">
            <el-icon class="btn-icon"><folder-add /></el-icon>
            <span>新建文件夹</span>
          </button>
          <el-upload
            :action="uploadActionUrl"
            :headers="uploadHeaders"
            :data="{ parentId: currentParentId || '' }"
            :before-upload="beforeUpload"
            :on-success="onUploadSuccess"
            :on-error="onUploadError"
            :show-file-list="false"
            multiple
            class="upload-btn-inline"
          >
            <button class="apple-btn apple-btn-ghost">
              <el-icon class="btn-icon"><upload /></el-icon>
              <span>上传文件</span>
            </button>
          </el-upload>
          <div class="toolbar-spacer"></div>
          <button class="apple-btn apple-btn-ghost" :disabled="selectedIds.length === 0" @click="openMoveDialog" v-hasPermi="['mag:file:edit']">移动</button>
          <button class="apple-btn apple-btn-ghost" @click="openRenameDialog" :disabled="selectedIds.length !== 1" v-hasPermi="['mag:file:edit']">重命名</button>
          <button class="apple-btn apple-btn-ghost" :disabled="selectedFileIds.length === 0" @click="openLinkDialog" v-hasPermi="['mag:file:edit']">关联到知识库</button>
          <button class="apple-btn apple-btn-ghost" :disabled="selectedIds.length === 0" @click="handleDelete" v-hasPermi="['mag:file:remove']">删除</button>
        </div>

        <!-- 文件表格 -->
        <div class="table-wrapper">
          <el-table
            v-loading="loading"
            :data="fileList"
            class="apple-table"
            @selection-change="handleSelectionChange"
            row-class-name="table-row"
          >
            <el-table-column type="selection" width="48" align="center" />
            <el-table-column label="名称" min-width="260">
              <template #default="scope">
                <div class="file-name-cell" @click="handleItemClick(scope.row)">
                  <el-icon class="file-icon"><folder v-if="scope.row.type === 'folder'" /><document v-else /></el-icon>
                  <span class="file-name">{{ scope.row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="大小" align="center" width="100">
              <template #default="scope">
                <span class="meta-text">{{ scope.row.type === 'folder' ? '—' : formatFileSize(scope.row.size) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" align="center" width="100">
              <template #default="scope">
                <span class="chip-label">{{ scope.row.type === 'folder' ? '文件夹' : (scope.row.type || '文件') }}</span>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" align="center" width="180">
              <template #default="scope">
                <span class="meta-text">{{ formatTime(scope.row.create_time) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" align="center" width="200">
              <template #default="scope">
                <el-button link type="primary" class="table-link" @click="handleDownload(scope.row)" v-if="scope.row.type !== 'folder'">
                  <el-icon><download /></el-icon><span>下载</span>
                </el-button>
                <el-button link type="primary" class="table-link" @click="openRenameDialogWithItem(scope.row)">
                  <el-icon><edit /></el-icon><span>重命名</span>
                </el-button>
                <el-button link type="primary" class="table-link" @click="handleDeleteSingle(scope.row)" v-hasPermi="['mag:file:remove']">
                  <el-icon><delete /></el-icon><span>删除</span>
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
          @pagination="fetchFiles"
        />
      </div>
    </div>

    <!-- 新建文件夹对话框 -->
    <el-dialog v-model="folderDialogVisible" title="新建文件夹" width="420px" append-to-body class="apple-dialog">
      <el-input v-model="newFolderName" placeholder="输入文件夹名称" maxlength="128" class="pill-input" @keyup.enter="submitCreateFolder" />
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="folderDialogVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" @click="submitCreateFolder">确定</button>
        </div>
      </template>
    </el-dialog>

    <!-- 重命名对话框 -->
    <el-dialog v-model="renameDialogVisible" title="重命名" width="420px" append-to-body class="apple-dialog">
      <el-input v-model="renameValue" placeholder="输入新名称" maxlength="128" class="pill-input" @keyup.enter="submitRename" />
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="renameDialogVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" @click="submitRename">确定</button>
        </div>
      </template>
    </el-dialog>

    <!-- 移动到对话框 -->
    <el-dialog v-model="moveDialogVisible" title="移动到..." width="500px" append-to-body class="apple-dialog">
      <div class="move-tree">
        <div class="move-node" @click="moveTarget = ''" :class="{ selected: moveTarget === '' }">
          <el-icon><folder-opened /></el-icon><span>根目录</span>
        </div>
        <div v-for="f in folderTree" :key="f.id" class="move-node" :class="{ selected: moveTarget === f.id }" :style="{ paddingLeft: (f._depth || 1) * 20 + 'px' }" @click="moveTarget = f.id">
          <el-icon><folder /></el-icon><span>{{ f.name }}</span>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="moveDialogVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" @click="submitMove">移动</button>
        </div>
      </template>
    </el-dialog>

    <!-- 关联到知识库对话框 -->
    <el-dialog v-model="linkDialogVisible" title="关联到知识库" width="500px" append-to-body class="apple-dialog">
      <p class="link-hint">选择目标知识库，选中的文件将被关联并转换为可检索的文档。</p>
      <el-select v-model="linkTargetKbs" multiple placeholder="选择知识库" class="kb-select" filterable>
        <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
      </el-select>
      <template #footer>
        <div class="dialog-footer">
          <button class="apple-btn apple-btn-ghost" @click="linkDialogVisible = false">取消</button>
          <button class="apple-btn apple-btn-primary" :disabled="linkTargetKbs.length === 0" @click="submitLink">关联</button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="FileManager">
import { listFiles, uploadFileToManager, createFolder, delFiles, downloadFileUrl, moveFiles, linkToDatasets, getAncestors } from "@/api/mag/knowledgeBase"
import { listDataset } from "@/api/mag/knowledgeBase"
import { getToken } from "@/utils/auth"

const { proxy } = getCurrentInstance()

const loading = ref(false)
const fileList = ref([])
const folderTree = ref([])
const folderLoading = ref(false)
const total = ref(0)
const selectedIds = ref([])
const selectedFileIds = ref([])
const currentParentId = ref("")
const breadcrumb = ref([])

// 上传配置
const uploadActionUrl = computed(() => import.meta.env.VITE_APP_BASE_API + '/mag/file/upload')
const uploadHeaders = computed(() => ({ Authorization: 'Bearer ' + getToken() }))

const queryParams = ref({ pageNum: 1, pageSize: 15 })

// 对话框
const folderDialogVisible = ref(false)
const newFolderName = ref("")
const renameDialogVisible = ref(false)
const renameTarget = ref(null)
const renameValue = ref("")
const moveDialogVisible = ref(false)
const moveTarget = ref("")
const linkDialogVisible = ref(false)
const linkTargetKbs = ref([])
const kbList = ref([])

async function fetchFiles() {
  loading.value = true
  try {
    const data = await listFiles({ parentId: currentParentId.value || undefined, page: queryParams.value.pageNum, pageSize: queryParams.value.pageSize })
    fileList.value = data.rows || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchFolderTree() {
  folderLoading.value = true
  try {
    // 拉所有文件夹：用大 page_size
    const data = await listFiles({ parentId: "", page: 1, pageSize: 100 })
    const all = (data.rows || []).filter(f => f.type === 'folder')
    // 简单递归获取子文件夹
    const tree = []
    const collectFolders = async (pid, depth) => {
      if (pid) {
        const sub = await listFiles({ parentId: pid, page: 1, pageSize: 100 })
        const subs = (sub.rows || []).filter(f => f.type === 'folder')
        for (const f of subs) {
          f._depth = depth
          f._childCount = 0
          tree.push(f)
          await collectFolders(f.id, depth + 1)
        }
      }
    }
    for (const f of all) {
      f._depth = 1
      f._childCount = 0
      tree.push(f)
      await collectFolders(f.id, 2)
    }
    folderTree.value = tree
  } finally {
    folderLoading.value = false
  }
}

async function fetchBreadcrumb() {
  if (!currentParentId.value) {
    breadcrumb.value = []
    return
  }
  try {
    const data = await getAncestors(currentParentId.value)
    breadcrumb.value = (data.data?.parent_folders || []).reverse()
  } catch { breadcrumb.value = [] }
}

function navigateTo(id) {
  currentParentId.value = id || ""
  queryParams.value.pageNum = 1
  selectedIds.value = []
  selectedFileIds.value = []
  fetchFiles()
  fetchBreadcrumb()
}

function handleItemClick(row) {
  if (row.type === 'folder') {
    navigateTo(row.id)
  }
}

function handleSelectionChange(selection) {
  selectedIds.value = selection.map(s => s.id)
  selectedFileIds.value = selection.filter(s => s.type !== 'folder').map(s => s.id)
}

// 上传
function beforeUpload(file) {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) { proxy.$modal.msgError("文件大小不能超过50MB"); return false }
  return true
}
function onUploadSuccess(res) {
  if (res.code === 200) { proxy.$modal.msgSuccess("上传成功"); fetchFiles() }
  else { proxy.$modal.msgError(res.msg || "上传失败") }
}
function onUploadError() { proxy.$modal.msgError("上传失败") }

// 新建文件夹
function openCreateFolder() { newFolderName.value = ""; folderDialogVisible.value = true }
async function submitCreateFolder() {
  if (!newFolderName.value.trim()) { proxy.$modal.msgError("名称不能为空"); return }
  await createFolder({ name: newFolderName.value.trim(), parent_id: currentParentId.value || undefined })
  proxy.$modal.msgSuccess("创建成功")
  folderDialogVisible.value = false
  fetchFiles()
  fetchFolderTree()
}

// 重命名
function openRenameDialogWithItem(row) { renameTarget.value = row; renameValue.value = row.name; renameDialogVisible.value = true }
function openRenameDialog() {
  if (selectedIds.value.length !== 1) return
  const row = fileList.value.find(r => r.id === selectedIds.value[0])
  if (row) openRenameDialogWithItem(row)
}
async function submitRename() {
  if (!renameValue.value.trim()) { proxy.$modal.msgError("名称不能为空"); return }
  await moveFiles({ src_file_ids: [renameTarget.value.id], new_name: renameValue.value.trim() })
  proxy.$modal.msgSuccess("重命名成功")
  renameDialogVisible.value = false
  fetchFiles()
  fetchFolderTree()
}

// 移动
function openMoveDialog() { moveTarget.value = ""; moveDialogVisible.value = true }
async function submitMove() {
  await moveFiles({ src_file_ids: selectedIds.value, dest_file_id: moveTarget.value || undefined })
  proxy.$modal.msgSuccess("移动成功")
  moveDialogVisible.value = false
  fetchFiles()
  fetchFolderTree()
}

// 关联到知识库
async function openLinkDialog() {
  linkTargetKbs.value = []
  linkDialogVisible.value = true
  try {
    const res = await listDataset({ pageNum: 1, pageSize: 100 })
    kbList.value = res.rows || []
  } catch { kbList.value = [] }
}
async function submitLink() {
  await linkToDatasets({ file_ids: selectedFileIds.value, kb_ids: linkTargetKbs.value })
  proxy.$modal.msgSuccess("关联成功，文件将在知识库中解析")
  linkDialogVisible.value = false
}

// 删除
function handleDeleteSingle(row) {
  proxy.$modal.confirm(`确认删除 "${row.name}"？`).then(async () => {
    await delFiles([row.id])
    proxy.$modal.msgSuccess("删除成功")
    fetchFiles()
    fetchFolderTree()
  }).catch(() => {})
}
function handleDelete() {
  const names = fileList.value.filter(r => selectedIds.value.includes(r.id)).map(r => r.name).join("、")
  proxy.$modal.confirm(`确认删除选中文件？(${names})`).then(async () => {
    await delFiles(selectedIds.value)
    proxy.$modal.msgSuccess("删除成功")
    fetchFiles()
    fetchFolderTree()
  }).catch(() => {})
}

// 下载
function handleDownload(row) {
  const url = downloadFileUrl(row.id)
  const link = document.createElement('a')
  link.href = url
  link.download = row.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0, size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(1) + ' ' + units[i]
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d instanceof Date && !isNaN(d) ? d.toLocaleString() : ''
}

onMounted(() => {
  fetchFiles()
  fetchFolderTree()
})
</script>

<style scoped>
/* Apple Design */
.apple-container {
  font-family: "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1d1d1f;
  height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  padding: 32px 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header { margin-bottom: 28px; flex-shrink: 0; }
.page-title {
  font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
  font-size: 34px; font-weight: 600; line-height: 1.1; color: #1d1d1f; margin: 0;
}
.page-subtitle { font-size: 15px; color: #7a7a7a; margin: 6px 0 0; }

/* File Manager Layout */
.file-manager { display: flex; gap: 0; flex: 1; overflow: hidden; border-radius: 14px; border: 1px solid #e8e8ed; background: #fff; }

/* Sidebar */
.sidebar { width: 240px; flex-shrink: 0; border-right: 1px solid #f0f0f0; background: #fafafc; display: flex; flex-direction: column; }
.sidebar-header { padding: 16px 20px 12px; border-bottom: 1px solid #f0f0f0; }
.sidebar-title { font-size: 13px; font-weight: 600; color: #7a7a7a; text-transform: uppercase; letter-spacing: 0.5px; }
.tree-wrapper { flex: 1; overflow-y: auto; padding: 8px 0; }
.tree-node, .tree-node-wrapper { user-select: none; }
.tree-node {
  display: flex; align-items: center; gap: 8px; padding: 8px 20px; cursor: pointer; font-size: 14px;
  color: #1d1d1f; transition: background 0.1s; border-radius: 0;
}
.tree-node:hover { background: rgba(0,102,204,0.04); }
.tree-node.active { background: rgba(0,102,204,0.08); color: #0066cc; font-weight: 500; }
.tree-icon { color: #5697d4; font-size: 16px; flex-shrink: 0; }
.tree-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-count { font-size: 12px; color: #b0b0b5; margin-left: auto; }
.tree-loading { padding: 16px; text-align: center; }
.root-node { font-weight: 500; }

/* Main */
.main-content { flex: 1; overflow: auto; display: flex; flex-direction: column; padding: 0; }

/* Breadcrumb */
.breadcrumb { display: flex; align-items: center; gap: 4px; padding: 16px 24px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.breadcrumb-item { font-size: 14px; color: #0066cc; cursor: pointer; }
.breadcrumb-item:hover { text-decoration: underline; }
.breadcrumb-item.current { color: #1d1d1f; font-weight: 500; cursor: default; text-decoration: none; }
.breadcrumb-sep { color: #d2d2d7; font-size: 12px; }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: 10px; padding: 14px 24px; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.upload-btn-inline { display: inline-flex; }

/* Buttons */
.apple-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  border: none; cursor: pointer; font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 14px; font-weight: 400; padding: 9px 18px; border-radius: 9999px;
  transition: all 0.15s ease; white-space: nowrap; background: transparent;
}
.apple-btn:active { transform: scale(0.95); }
.apple-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
.apple-btn-primary { background: #0066cc; color: #fff; }
.apple-btn-primary:hover:not(:disabled) { background: #0071e3; }
.apple-btn-ghost { color: #0066cc; border: 1px solid #0066cc; }
.apple-btn-ghost:hover:not(:disabled) { background: rgba(0,102,204,0.06); }
.btn-icon { font-size: 15px; }

/* Table */
.table-wrapper { flex: 1; overflow: auto; }
.apple-table :deep(.el-table__header th) {
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 13px; font-weight: 600; color: #7a7a7a; padding: 14px 0;
  border-bottom: 1px solid #f0f0f0; background: #fafafc;
}
.apple-table :deep(.el-table__body td) {
  font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
  font-size: 15px; color: #1d1d1f; padding: 14px 0; border-bottom: 1px solid #f5f5f7;
}
.apple-table :deep(.table-row:last-child td) { border-bottom: none; }
.apple-table :deep(.table-row:hover td) { background: rgba(0,102,204,0.02); }

.file-name-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; padding-left: 4px; }
.file-icon { color: #b0b0b5; font-size: 18px; flex-shrink: 0; }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-text { font-size: 14px; color: #7a7a7a; }
.chip-label { display: inline-block; font-size: 13px; color: #7a7a7a; background: #f5f5f7; padding: 3px 10px; border-radius: 9999px; }

/* Dialog */
.apple-dialog :deep(.el-dialog) { border-radius: 18px; box-shadow: 0 8px 40px rgba(0,0,0,0.12); }
.apple-dialog :deep(.el-dialog__header) { padding: 28px 32px 0; }
.apple-dialog :deep(.el-dialog__title) {
  font-family: "SF Pro Display", system-ui, -apple-system, sans-serif; font-size: 21px; font-weight: 600;
}
.apple-dialog :deep(.el-dialog__body) { padding: 24px 32px; }
.apple-dialog :deep(.el-dialog__footer) { padding: 0 32px 28px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }

.pill-input :deep(.el-input__wrapper) { border-radius: 9999px; background: #f5f5f7; border: none; box-shadow: none; }
.pill-input :deep(.el-input__wrapper:focus, .el-input__wrapper.is-focus) { background: #fff; box-shadow: 0 0 0 3px rgba(0,102,204,0.15); }

.move-tree { max-height: 320px; overflow-y: auto; }
.move-node { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 14px; border-radius: 6px; margin-bottom: 2px; }
.move-node:hover { background: #f5f5f7; }
.move-node.selected { background: rgba(0,102,204,0.08); color: #0066cc; font-weight: 500; }

.kb-select { width: 100%; }
.kb-select :deep(.el-select__tags) { max-width: 100%; }
.link-hint { font-size: 14px; color: #7a7a7a; margin: 0 0 16px; }

.table-link :deep(.el-icon) { margin-right: 2px; }
</style>
