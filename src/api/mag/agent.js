import request from '@/utils/request'

export function listAgents() {
  return request({
    url: '/mag/agent/list',
    method: 'get'
  })
}

export function getAgentSchema(agentCode) {
  return request({
    url: `/mag/agent/${agentCode}/schema`,
    method: 'get'
  })
}
