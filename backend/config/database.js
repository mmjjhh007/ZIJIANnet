const { Sequelize } = require('sequelize')
const config = require('./index')
const path = require('path')

const sequelize = new Sequelize({
  dialect: config.database.dialect,
  storage: path.resolve(__dirname, '..', config.database.storage),
  logging: config.database.logging,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
})

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功 (SQLite)')
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    return false
  }
}

module.exports = {
  sequelize,
  testConnection
}
