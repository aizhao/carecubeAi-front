import { buildCitationHtml, buildFileList, hasCitationMarkers } from '@/utils/citations'

export function useReferenceParser() {
  function normalizeReferences(references) {
    if (!references) {
      return { chunks: [], doc_aggs: [] }
    }

    if (Array.isArray(references)) {
      const chunks = references.map((item, index) => ({
        id: item.sourceId || item.id || String(index),
        document_id: item.sourceId || item.document_id || item.doc_id || '',
        document_name: item.sourceName || item.document_name || item.doc_name || item.name || '',
        content: item.content || '',
        similarity: item.score ?? item.similarity ?? null
      }))
      return { chunks, doc_aggs: buildAggsFromChunks(chunks) }
    }

    const chunks = toArray(references.chunks).map((item, index) => ({
      ...item,
      id: item.id || String(index),
      document_id: item.document_id || item.doc_id || item.sourceId || '',
      document_name: item.document_name || item.doc_name || item.sourceName || item.name || '',
      content: item.content || item.text || '',
      similarity: item.similarity ?? item.score ?? null
    }))
    const docAggs = toArray(references.doc_aggs)
    return {
      chunks,
      doc_aggs: docAggs.length ? docAggs : buildAggsFromChunks(chunks)
    }
  }

  function referenceChunks(references) {
    return normalizeReferences(references).chunks
  }

  function referenceDocAggs(references) {
    return normalizeReferences(references).doc_aggs
  }

  function referenceFiles(references) {
    const normalized = normalizeReferences(references)
    return buildFileList(normalized.chunks, normalized.doc_aggs)
  }

  function renderCitationHtml(text, references) {
    if (!text) return ''
    const chunks = referenceChunks(references)
    if (chunks.length || hasCitationMarkers(text)) {
      return buildCitationHtml(text, chunks)
    }
    return buildCitationHtml(text, [])
  }

  function previewForFile(file, references, maxLength = 96) {
    const chunks = referenceChunks(references)
    const chunk = chunks.find(item => item.document_id === file.doc_id)
    const content = chunk?.content || '该文档命中了当前辅助分析的相关知识片段。'
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content
  }

  return {
    normalizeReferences,
    referenceChunks,
    referenceDocAggs,
    referenceFiles,
    renderCitationHtml,
    previewForFile
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

function buildAggsFromChunks(chunks) {
  const seen = new Map()
  chunks.forEach(chunk => {
    const docId = chunk.document_id
    if (!docId) return
    const current = seen.get(docId) || {
      doc_id: docId,
      doc_name: chunk.document_name || '未知文档',
      count: 0
    }
    current.count += 1
    seen.set(docId, current)
  })
  return [...seen.values()]
}
