import request from './request'

export function getRulesByConverter(converterId: string) {
  return request.get(`/mapping-rule/list/${converterId}`)
}

export function saveRules(converterId: string, rules: any[]) {
  return request.post(`/mapping-rule/save/${converterId}`, rules)
}

export function createRule(data: any) {
  return request.post('/mapping-rule', data)
}

export function updateRule(data: any) {
  return request.put('/mapping-rule', data)
}

export function deleteRule(id: string) {
  return request.delete(`/mapping-rule/${id}`)
}
