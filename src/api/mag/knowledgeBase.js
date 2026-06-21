import request from '@/utils/request'

// ========== 知识库（Dataset）管理 ==========

// 查询知识库列表
export function listDataset(query) {
  return request({
    url: '/mag/kb/dataset/list',
    method: 'get',
    params: query
  })
}

// 查询知识库详情
export function getDataset(datasetId) {
  return request({
    url: '/mag/kb/dataset/' + datasetId,
    method: 'get'
  })
}

// 新增知识库
export function addDataset(data) {
  return request({
    url: '/mag/kb/dataset',
    method: 'post',
    data: data
  })
}

// 修改知识库
export function updateDataset(data) {
  return request({
    url: '/mag/kb/dataset',
    method: 'put',
    data: data
  })
}

// 删除知识库
export function delDataset(ids) {
  return request({
    url: '/mag/kb/dataset/' + ids,
    method: 'delete'
  })
}

// ========== 文件（Document）管理 ==========

// 查询文件列表
export function listDocument(datasetId, query) {
  return request({
    url: '/mag/kb/doc/list/' + datasetId,
    method: 'get',
    params: query
  })
}

// 上传文件
export function uploadDocument(datasetId, formData) {
  return request({
    url: '/mag/kb/doc/upload/' + datasetId,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })
}

// 删除文件
export function delDocument(datasetId, ids) {
  return request({
    url: '/mag/kb/doc/' + datasetId + '/' + ids,
    method: 'delete'
  })
}

// 下载文件
export function downloadDocumentUrl(datasetId, docId) {
  return import.meta.env.VITE_APP_BASE_API
    + '/mag/kb/doc/download/'
    + encodeURIComponent(datasetId)
    + '/'
    + encodeURIComponent(docId)
}

// 预览文件
export function previewDocumentUrl(docId) {
  return import.meta.env.VITE_APP_BASE_API
    + '/mag/chat/document/preview/'
    + encodeURIComponent(docId)
}

// 获取文档详情
export function getDocument(datasetId, docId) {
  return request({
    url: '/mag/kb/doc/' + datasetId + '/' + docId,
    method: 'get'
  })
}

// 更新文档（重命名/修改配置等）
export function updateDocument(datasetId, docId, data) {
  return request({
    url: '/mag/kb/doc/' + datasetId + '/' + docId,
    method: 'put',
    data: data
  })
}

// 解析文档（触发分块）
export function parseDocuments(datasetId, docIds) {
  return request({
    url: '/mag/kb/doc/parse/' + datasetId,
    method: 'post',
    data: { document_ids: docIds }
  })
}

// 停止解析
export function stopParsing(datasetId, docIds) {
  return request({
    url: '/mag/kb/doc/parse/' + datasetId,
    method: 'delete',
    data: { document_ids: docIds }
  })
}

// ========== 文件管理（File Management）==========

// 列出文件夹内容
export function listFiles(query) {
  return request({
    url: '/mag/file/list',
    method: 'get',
    params: query
  })
}

// 上传文件到文件管理
export function uploadFileToManager(parentId, formData) {
  return request({
    url: '/mag/file/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
    params: parentId ? { parentId } : {}
  })
}

// 创建文件夹
export function createFolder(data) {
  return request({
    url: '/mag/file/folder',
    method: 'post',
    data: data
  })
}

// 删除文件/文件夹
export function delFiles(ids) {
  return request({
    url: '/mag/file',
    method: 'delete',
    data: { ids }
  })
}

// 下载文件 URL
export function downloadFileUrl(fileId) {
  return import.meta.env.VITE_APP_BASE_API + '/mag/file/download/' + fileId
}

// 移动/重命名文件
export function moveFiles(data) {
  return request({
    url: '/mag/file/move',
    method: 'post',
    data: data
  })
}

// 关联文件到知识库
export function linkToDatasets(data) {
  return request({
    url: '/mag/file/link-to-datasets',
    method: 'post',
    data: data
  })
}

// 获取祖先路径
export function getAncestors(fileId) {
  return request({
    url: '/mag/file/ancestors/' + fileId,
    method: 'get'
  })
}
