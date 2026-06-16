import request from './request'

export function executeTransform(data: any) {
  return request.post('/transform/execute', data)
}

export function testTransform(data: any) {
  return request.post('/transform/test', data)
}

export function parseStructure(data: { data: string; format: string }) {
  return request.post('/transform/parse-structure', data)
}
