(async () => {
  try {
    const { sequelize } = require('./config/database')
    console.log('开始手动同步（alter:true）')
    await sequelize.sync({ alter: true })
    console.log('手动同步成功')
  } catch (err) {
    console.error('手动同步失败:')
    try {
      console.error(JSON.stringify({ message: err && err.message, stack: err && err.stack }, null, 2))
    } catch (e) {
      console.error(err && err.stack ? err.stack : err)
    }
    process.exit(1)
  }
})()
