import request from './request'

export function getConverterPage(params: any) {
  return request.get('/converter/page', { params })
}

export function getConverterById(id: string) {
  return request.get(`/converter/${id}`)
}

export function createConverter(data: any) {
  return request.post('/converter', data)
}

export function updateConverter(data: any, logAudit = true) {
  return request.put('/converter', data, { params: { logAudit } })
}

export function deleteConverter(id: string) {
  return request.delete(`/converter/${id}`)
}

export function publishConverter(id: string) {
  return request.post(`/converter/${id}/publish`)
}

export function disableConverter(id: string) {
  return request.post(`/converter/${id}/disable`)
}

export function cloneConverter(id: string) {
  return request.post(`/converter/${id}/clone`)
}

export function exportConverter(id: string) {
  return request.get(`/converter/${id}/export`)
}

export function importConverter(data: string) {
  return request.post('/converter/import', data)
}

export function getVersions(id: string) {
  return request.get(`/converter/${id}/versions`)
}

export function rollbackVersion(id: string, version: number) {
  return request.post(`/converter/${id}/rollback/${version}`)
}
