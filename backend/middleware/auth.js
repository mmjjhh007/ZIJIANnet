const jwt = require('jsonwebtoken')
const config = require('../config')

// 验证 Token 中间件
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证Token'
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwt.secret)

    if (!decoded.user || !decoded.externalAccessToken) {
      return res.status(401).json({
        code: 401,
        message: '登录信息无效，请重新登录'
      })
    }

    req.user = decoded.user
    req.auth = decoded
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的Token'
      })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: 'Token已过期'
      })
    }
    return res.status(500).json({
      code: 500,
      message: '认证失败'
    })
  }
}

// 角色验证中间件
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        message: '没有权限访问'
      })
    }

    next()
  }
}

module.exports = {
  authMiddleware,
  roleMiddleware
}
