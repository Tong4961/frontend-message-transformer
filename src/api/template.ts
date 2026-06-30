import request from './request'

export function getTemplateList(params?: any) {
  return request.get('/template/list', { params })
}

export function getTemplatePage(params: any) {
  return request.get('/template/page', { params })
}

export function getTemplateStats() {
  return request.get('/template/stats')
}

export function getTemplateById(id: string) {
  return request.get(`/template/${id}`)
}

export function createTemplate(data: any) {
  return request.post('/template', data)
}

export function updateTemplate(data: any) {
  return request.put('/template', data)
}

export function deleteTemplate(id: string) {
  return request.delete(`/template/${id}`)
}

export function exportTemplate(id: string) {
  return request.get(`/template/${id}/export`)
}

export function importTemplate(data: any) {
  return request.post('/template/import', data)
}

// 检索条件配置
export function getSearchFields(templateId: string) {
  return request.get('/template-search-field/list', { params: { templateId } })
}

export function saveSearchFields(templateId: string, fields: any[]) {
  return request.post('/template-search-field/save', { templateId, fields })
}

// 节点循环配置
export function getNodeConfigs(templateId: string) {
  return request.get('/template-node-config/list', { params: { templateId } })
}

export function saveNodeConfigs(templateId: string, configs: any[]) {
  return request.post('/template-node-config/save', { templateId, configs })
}

// 节点约束配置
export function getNodeConstraints(templateId: string) {
  return request.get('/template-node-constraint/list', { params: { templateId } })
}

export function saveNodeConstraints(templateId: string, constraints: any[]) {
  return request.post('/template-node-constraint/save', { templateId, constraints })
}

// 消息验证
export function validateMessage(data: { templateId: string; messageType: string; content: string }) {
  return request.post('/template/validate', data)
}
