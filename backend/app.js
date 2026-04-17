const express = require('express')
const cors = require('cors')
const config = require('./config')
const { testConnection } = require('./config/database')
const { syncDatabase, initDefaultData } = require('./models')
const logger = require('./utils/logger')

// 导入路由
const authRoutes = require('./routes/auth')
const orderRoutes = require('./routes/orders')

const app = express()

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`)
  next()
})

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/orders', orderRoutes)

// 小程序相关路由（/api/mini/v1/...）
const miniRoutes = require('./routes/mini')
app.use('/api/mini/v1', miniRoutes)

// 报告/下载 等通用接口（/api/v1/...）
const reportsRoutes = require('./routes/reports')
app.use('/api/v1/reports', reportsRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  })
})

// 错误处理
app.use((err, req, res, next) => {
  logger.error(`服务器错误: ${err && err.stack ? err.stack : err}`)
  res.status(500).json({ code: 500, message: '服务器内部错误' })
})

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection()
    if (!dbConnected) {
      logger.error('⚠️ 数据库连接失败，请检查配置')
      logger.info('💡 提示: 请确保数据库已启动，并在 .env 文件中配置正确的数据库连接信息')
      process.exit(1)
    }

    // 同步数据库表
    await syncDatabase()

    // 初始化默认数据
    await initDefaultData()

    // 启动 HTTP 服务器
    app.listen(config.server.port, () => {
      logger.info(`🚀 服务器已启动: http://localhost:${config.server.port}`)
      logger.info(`📝 环境: ${config.server.env}`)
      logger.info(`🔑 默认管理员账号: admin / admin123`)
    })
  } catch (error) {
    logger.error(`启动服务器失败: ${error && error.stack ? error.stack : error}`)
    process.exit(1)
  }
}

startServer()
