const express = require('express')
const jwt = require('jsonwebtoken')
const svgCaptcha = require('svg-captcha')
const config = require('../config')
const { authMiddleware } = require('../middleware/auth')
const { requestEhealthApi, normalizeUser, ExternalApiError } = require('../utils/ehealthApi')
const logger = require('../utils/logger')

const router = express.Router()

const extractTokenBundle = (loginResult = {}) => {
  const accessToken = loginResult.accessToken || loginResult.access_token || loginResult.token || ''
  const refreshToken = loginResult.refreshToken || loginResult.refresh_token || ''
  const accessTokenExpiresIn = loginResult.accessTokenExpiresIn || loginResult.expiresIn || loginResult.expires_in || ''
  return { accessToken, refreshToken, accessTokenExpiresIn }
}

const fetchExternalProfile = async (accessToken) => {
  const profilePaths = ['/api/web/v1/users/profile', '/api/web/v1/user/profile']
  let lastError = null

  for (const path of profilePaths) {
    try {
      return await requestEhealthApi({ path, token: accessToken })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('获取用户信息失败')
}

const fetchMiniProfile = async (accessToken) => {
  return await requestEhealthApi({
    path: '/api/mini/v1/profile',
    token: accessToken
  })
}

const fetchClinicDetail = async (clinicId, accessToken) => {
  if (!clinicId) return null
  try {
    return await requestEhealthApi({
      path: `/api/web/v1/clinic/${clinicId}`,
      token: accessToken
    })
  } catch (error) {
    return null
  }
}

const pickId = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

router.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 2,
    color: true,
    background: '#f0f0f0',
    width: 120,
    height: 40
  })

  res.set('Content-Type', 'image/svg+xml')
  res.send(captcha.data)
})

router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) {
      return res.status(400).json({ code: 400, message: '请输入手机号码' })
    }

    const result = await requestEhealthApi({
      path: '/api/web/v1/user/send-verify-code-first',
      method: 'POST',
      data: {
        phone,
        type: 3,
        verifyCodeType: 'Login'
      }
    })

    res.json({ code: 200, message: '验证码已发送', data: result })
  } catch (error) {
    console.error('发送短信验证码错误:', error)
    const status = error instanceof ExternalApiError ? error.status : 500
    res.status(status).json({ code: status, message: error.message || '发送验证码失败' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const body = req.body || {}
    const { username, account, password, phone, code } = body

    const loginAccount = account || username

    if (!((loginAccount && password) || (phone && code))) {
      return res.status(400).json({
        code: 400,
        message: '请提供账号密码或手机号验证码'
      })
    }

    let loginResult

    if (phone && code) {
      const payload = { phone, code, type: 3 }
      loginResult = await requestEhealthApi({
        path: '/api/web/v1/user/login-by-phone',
        method: 'POST',
        data: payload
      })
    } else {
      const payload = { account: loginAccount, password, type: 3 }
      loginResult = await requestEhealthApi({
        path: '/api/web/v1/user/login',
        method: 'POST',
        data: payload
      })
    }

    const tokenBundle = extractTokenBundle(loginResult)
    if (!tokenBundle.accessToken) {
      return res.status(401).json({ code: 401, message: '登录成功但未获取访问令牌，请重试' })
    }

    let profile = {}
    let miniProfile = null
    try {
      profile = await fetchExternalProfile(tokenBundle.accessToken)
    } catch (error) {
      profile = loginResult || {}
    }

    try {
      miniProfile = await fetchMiniProfile(tokenBundle.accessToken)
    } catch (error) {
      miniProfile = null
    }

    let matchedClinicUser = null
    try {
      const clinicUsers = await requestEhealthApi({
        path: '/api/web/v1/user/list',
        token: tokenBundle.accessToken,
        params: {
          page: 1,
          limit: 20,
          type: 3,
          keyword: loginAccount || phone || profile.account || profile.phone
        }
      })

      matchedClinicUser = clinicUsers?.data?.find((item) => {
        if (loginResult.id && item.id === loginResult.id) return true
        if (profile.account && item.account === profile.account) return true
        return Boolean(profile.phone) && item.phone === profile.phone
      }) || null
    } catch (error) {
      console.warn('获取用户分页列表失败，改用 profile 进行诊所校验:', error.message)
    }

    const normalizedUser = normalizeUser(profile, loginResult)

    const fallbackClinicId = pickId(
      normalizedUser.clinicId,
      miniProfile?.clinic?.id,
      loginResult?.clinicId,
      loginResult?.id,
      loginResult?.userId,
      profile?.clinicId,
      profile?.clinic?.id,
      profile?.id,
      matchedClinicUser?.id
    )

    if (!normalizedUser.clinicId && fallbackClinicId) {
      normalizedUser.clinicId = fallbackClinicId
      normalizedUser.isClinic = true
    }

    const matchedType = matchedClinicUser?.type
    const isMatchedClinic = matchedType === 'Clinic' || matchedType === 3 || String(matchedType) === '3'
    if (!normalizedUser.isClinic && !isMatchedClinic) {
      return res.status(403).json({ code: 403, message: '仅支持诊所账号登录' })
    }

    if (!normalizedUser.clinicId) {
      return res.status(403).json({ code: 403, message: '当前账号未绑定诊所，无法登录' })
    }

    const clinicDetail = await fetchClinicDetail(normalizedUser.clinicId, tokenBundle.accessToken)
    if (clinicDetail) {
      normalizedUser.clinic = clinicDetail
      normalizedUser.clinicName = clinicDetail.shortName || clinicDetail.fullName || normalizedUser.clinicName
      normalizedUser.clinicFullName = clinicDetail.fullName || clinicDetail.shortName || normalizedUser.clinicFullName
    } else if (miniProfile?.clinic) {
      normalizedUser.clinic = miniProfile.clinic
      normalizedUser.clinicName = miniProfile.clinic.shortName || miniProfile.clinic.fullName || normalizedUser.clinicName
      normalizedUser.clinicFullName = miniProfile.clinic.fullName || miniProfile.clinic.shortName || normalizedUser.clinicFullName
    }

    const token = jwt.sign(
      {
        id: normalizedUser.id,
        user: normalizedUser,
        externalAccessToken: tokenBundle.accessToken,
        externalRefreshToken: tokenBundle.refreshToken,
        externalAccessTokenExpiresIn: tokenBundle.accessTokenExpiresIn
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    res.json({ code: 200, message: '登录成功', data: { token, user: normalizedUser } })
  } catch (error) {
    try { logger.error(`登录错误: ${error && (error.stack || error.message)}`) } catch (e) { }
    // 同步输出到控制台，便于当前终端查看
    try { console.error('登录错误:', error && (error.stack || error.message)) } catch (e) {}
    // 如果是第三方错误，记录其 payload 便于排查
    if (error && error.payload) {
      try { logger.error(`第三方错误 payload: ${JSON.stringify(error.payload)}`) } catch (e) { }
      try { console.error('第三方错误 payload:', JSON.stringify(error.payload)) } catch (e) {}
    }
    const status = error instanceof ExternalApiError ? error.status : 500
    // 在开发环境下把第三方错误 payload 返回给客户端，便于定位（勿在生产环境暴露）
    const extra = config.server.env === 'development' && error && error.payload ? { detail: error.payload } : {}
    res.status(status).json({ code: status, message: error.message || '登录失败', ...extra })
  }
})

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const accessToken = req.auth.externalAccessToken
    const profile = await fetchExternalProfile(accessToken)
    const normalizedUser = normalizeUser(profile, {
      id: req.user?.id,
      accessTokenExpiresIn: req.auth.externalAccessTokenExpiresIn
    })

    if (!normalizedUser.clinicId && req.user?.clinicId) {
      normalizedUser.clinicId = req.user.clinicId
    }

    const clinicDetail = await fetchClinicDetail(normalizedUser.clinicId, accessToken)
    const mergedUser = {
      ...req.user,
      ...normalizedUser,
      clinic: clinicDetail || normalizedUser.clinic || req.user?.clinic || null
    }

    if (mergedUser.clinic && !mergedUser.clinicName) {
      mergedUser.clinicName = mergedUser.clinic.shortName || mergedUser.clinic.fullName || ''
    }

    res.json({ code: 200, data: mergedUser })
  } catch (error) {
    const status = error instanceof ExternalApiError ? error.status : 500
    res.status(status).json({ code: status, message: error.message || '获取用户信息失败' })
  }
})

router.get('/clinic', authMiddleware, async (req, res) => {
  try {
    const accessToken = req.auth.externalAccessToken
    const profile = await fetchExternalProfile(accessToken)
    const normalizedUser = normalizeUser(profile, {})
    const clinicId = normalizedUser.clinicId || req.user?.clinicId
    if (!clinicId) {
      return res.status(404).json({ code: 404, message: '未找到诊所信息' })
    }

    const clinic = await fetchClinicDetail(clinicId, accessToken)
    if (clinic) {
      return res.json({ code: 200, data: clinic })
    }

    const fallbackClinic = {
      id: clinicId,
      shortName: normalizedUser.clinicName || req.user?.clinicName || '',
      fullName: normalizedUser.clinicFullName || req.user?.clinicFullName || normalizedUser.clinicName || req.user?.clinicName || ''
    }

    res.json({ code: 200, data: fallbackClinic })
  } catch (error) {
    const status = error instanceof ExternalApiError ? error.status : 500
    res.status(status).json({ code: status, message: error.message || '获取诊所信息失败' })
  }
})

// 开发专用：直接使用第三方 login-by-phone 结果构造本地 JWT（仅开发环境）
router.post('/dev-external-login', async (req, res) => {
  if (config.server.env !== 'development') return res.status(403).json({ code: 403, message: '仅开发环境可用' })
  try {
    const { phone, code } = req.body || {}
    if (!phone || !code) return res.status(400).json({ code: 400, message: '缺少 phone 或 code' })
    const payload = { phone, code, type: 3 }
    const ext = await requestEhealthApi({ path: '/api/web/v1/user/login-by-phone', method: 'POST', data: payload })
    const tokenBundle = extractTokenBundle(ext)
    if (!tokenBundle.accessToken) {
      return res.status(401).json({ code: 401, message: '登录成功但未获取访问令牌' })
    }
    const profileExt = ext
    const normalized = normalizeUser(profileExt, ext)
    if (!normalized.clinicId) {
      normalized.clinicId = ext.id
      normalized.isClinic = true
    }
    const token = jwt.sign({ id: normalized.id, user: normalized, externalAccessToken: tokenBundle.accessToken }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
    return res.json({ code: 200, message: '登录成功 (dev)', data: { token, user: normalized } })
  } catch (err) {
    const status = err instanceof ExternalApiError ? err.status : 500
    return res.status(status).json({ code: status, message: err.message || '登录失败', detail: err && err.payload ? err.payload : null })
  }
})

router.put('/password', authMiddleware, async (req, res) => {
  res.status(501).json({ code: 501, message: '密码修改暂未开放，请前往原系统处理' })
})

module.exports = router

