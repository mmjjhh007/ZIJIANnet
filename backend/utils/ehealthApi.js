const config = require('../config')

const SUCCESS_CODES = new Set(['00000', '0', 0, 200, '200'])

class ExternalApiError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message)
    this.name = 'ExternalApiError'
    this.status = status
    this.payload = payload
  }
}

const appendQuery = (url, params = {}) => {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.append(key, String(value))
  })
}

const extractMessage = (payload, fallback) => {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload || fallback
  return payload.message || payload.error || fallback
}

const requestEhealthApi = async ({ path, method = 'GET', token, data, params }) => {
  const url = new URL(path, config.ehealth.baseUrl)
  appendQuery(url, params)

  const headers = {
    Accept: 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (data !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined
    })
  } catch (error) {
    throw new ExternalApiError(`第三方接口连接失败：${error.message}`, 502)
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new ExternalApiError(extractMessage(payload, `第三方接口请求失败 (${response.status})`), response.status, payload)
  }

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
    if (!SUCCESS_CODES.has(payload.code)) {
      throw new ExternalApiError(extractMessage(payload, '第三方接口返回失败'), 400, payload)
    }

    return payload.result
  }

  return payload
}

const normalizeUser = (profile = {}, loginResult = {}) => {
  const clinic = profile.clinic || {}
  const clinicId = clinic.id || profile.clinicId || profile.clinic_id || loginResult.clinicId || null
  const clinicName = clinic.shortName || clinic.fullName || profile.clinicName || profile.clinic_name || ''

  return {
    id: profile.id || loginResult.id,
    name: profile.name || profile.account || '',
    username: profile.account || '',
    account: profile.account || '',
    phone: profile.phone || '',
    avatar: profile.avatar || '',
    type: profile.type || 'Clinic',
    status: profile.status || 'Enable',
    clinicId,
    clinicName,
    clinicFullName: clinic.fullName || clinic.shortName || clinicName,
    isClinic: profile.type === 'Clinic' || profile.type === 3 || String(profile.type) === '3' || Boolean(clinicId),
    clinic,
    accessTokenExpiresIn: loginResult.accessTokenExpiresIn || ''
  }
}

module.exports = {
  ExternalApiError,
  requestEhealthApi,
  normalizeUser
}