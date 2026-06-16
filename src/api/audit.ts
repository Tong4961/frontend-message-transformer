import request from './request'

export function getAuditPage(params: any) {
  return request.get('/audit/page', { params })
}

export function getAuditById(id: number) {
  return request.get(`/audit/${id}`)
}
