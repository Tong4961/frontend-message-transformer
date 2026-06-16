import request from './request'

export function getTemplateList(params?: any) {
  return request.get('/template/list', { params })
}

export function getTemplateById(id: number) {
  return request.get(`/template/${id}`)
}

export function createTemplate(data: any) {
  return request.post('/template', data)
}

export function updateTemplate(data: any) {
  return request.put('/template', data)
}

export function deleteTemplate(id: number) {
  return request.delete(`/template/${id}`)
}
