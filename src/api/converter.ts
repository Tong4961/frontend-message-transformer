import request from './request'

export function getConverterPage(params: any) {
  return request.get('/converter/page', { params })
}

export function getConverterById(id: number) {
  return request.get(`/converter/${id}`)
}

export function createConverter(data: any) {
  return request.post('/converter', data)
}

export function updateConverter(data: any, logAudit = true) {
  return request.put('/converter', data, { params: { logAudit } })
}

export function deleteConverter(id: number) {
  return request.delete(`/converter/${id}`)
}

export function publishConverter(id: number) {
  return request.post(`/converter/${id}/publish`)
}

export function disableConverter(id: number) {
  return request.post(`/converter/${id}/disable`)
}

export function cloneConverter(id: number) {
  return request.post(`/converter/${id}/clone`)
}

export function exportConverter(id: number) {
  return request.get(`/converter/${id}/export`)
}

export function importConverter(data: string) {
  return request.post('/converter/import', data)
}

export function getVersions(id: number) {
  return request.get(`/converter/${id}/versions`)
}

export function rollbackVersion(id: number, version: number) {
  return request.post(`/converter/${id}/rollback/${version}`)
}
