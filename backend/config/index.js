require('dotenv').config()

module.exports = {
  // 数据库配置 (SQLite)
  database: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // 服务器配置
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // 第三方平台配置
  ehealth: {
    baseUrl: process.env.EHEALTH_API_BASE_URL || 'https://ehealth-platform.szzijian.com'
  }
}
