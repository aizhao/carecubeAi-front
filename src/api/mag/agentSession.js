import request from '@/utils/request'

export function listAgentSessions(query) {
  return request({
    url: '/mag/agent/session/list',
    method: 'get',
    params: query
  })
}

export function getAgentSession(sessionId) {
  return request({
    url: `/mag/agent/session/${sessionId}`,
    method: 'get'
  })
}

export function deleteAgentSession(sessionId) {
  return request({
    url: `/mag/agent/session/${sessionId}`,
    method: 'delete'
  })
}
