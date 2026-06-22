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
