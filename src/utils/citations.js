/**
 * Citation parsing and rendering utilities.
 *
 * Supported citation markers in answer text:
 *   ##0$$          — RAGFlow native format
 *   [ID:0]         — alternative format
 *   [0]            — simple numeric format
 *
 * Index is 0-based and maps to reference.chunks[index].
 */

const CITATION_RE = /##(\d+)\$\$|\[ID:(\d+)\]|\[(\d+)\]/g

/**
 * Parse citation markers from text into segments.
 * @param {string} text  Raw answer text
 * @returns {Array<{type: 'text', value: string}|{type: 'citation', index: number}>}
 */
export function parseCitations(text) {
  if (!text) return []
  const segments = []
  let lastIndex = 0
  let match
  const regex = new RegExp(CITATION_RE.source, 'g')

  while ((match = regex.exec(text)) !== null) {
    const citationIndex = parseInt(match[1] || match[2] || match[3], 10)
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'citation', index: citationIndex })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments
}

/**
 * Escape HTML entities in a string.
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Replace citation markers in text with HTML badge elements.
 *
 * @param {string} text   Raw answer text
 * @param {Array}  chunks reference.chunks array (or empty array)
 * @returns {string}  HTML string with citation badges
 */
export function buildCitationHtml(text, chunks) {
  if (!text) return ''
  const safeChunks = chunks || []
  const segments = parseCitations(text)
  if (segments.length === 0) return escapeHtml(text)

  return segments
    .map((seg) => {
      if (seg.type === 'citation') {
        const num = seg.index + 1
        const chunk = safeChunks[seg.index]
        const chunkContent = chunk ? (chunk.content || '') : ''
        return (
          '<sup class="citation-badge" data-citation-index="' +
          seg.index +
          '" data-citation-content="' +
          escapeHtml(chunkContent) +
          '">[' +
          num +
          ']</sup>'
        )
      }
      return seg.value
    })
    .join('')
}

/**
 * Build a deduplicated file list from chunks and/or doc_aggs.
 *
 * @param {Array} chunks   reference.chunks
 * @param {Array} docAggs  reference.doc_aggs
 * @returns {Array<{doc_id: string, doc_name: string, count: number}>}
 */
export function buildFileList(chunks, docAggs) {
  const safeChunks = chunks || []
  const safeAggs = docAggs || []

  // Prefer doc_aggs if available (more accurate counts)
  if (safeAggs.length > 0) {
    return safeAggs.map((d) => ({
      doc_id: d.doc_id || '',
      doc_name: d.doc_name || '',
      count: d.count || 0
    }))
  }

  // Fallback: deduplicate by document_id from chunks
  const seen = new Map()
  for (const c of safeChunks) {
    const id = c.document_id
    if (!id) continue
    if (seen.has(id)) {
      seen.get(id).count++
    } else {
      seen.set(id, {
        doc_id: id,
        doc_name: c.document_name || c.doc_name || '',
        count: 1
      })
    }
  }
  return [...seen.values()]
}

/**
 * Get chunks belonging to a specific document.
 *
 * @param {Array}  chunks     reference.chunks
 * @param {string} documentId
 * @returns {Array} chunks for that document
 */
export function getChunksByDocument(chunks, documentId) {
  if (!chunks || !documentId) return []
  return chunks.filter((c) => c.document_id === documentId)
}

/**
 * Check if text contains any complete citation marker.
 * Used to avoid partial-marker rendering during streaming.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasCitationMarkers(text) {
  if (!text) return false
  const regex = new RegExp(CITATION_RE.source, 'g')
  return regex.test(text)
}
