const { User, sequelize } = require('../models')

const bind = async () => {
  try {
    await sequelize.authenticate()
    console.log('DB connected')

    let admin = await User.findOne({ where: { username: 'admin' } })
    if (!admin) {
      admin = await User.create({ username: 'admin', password: 'admin123', realName: '系统管理员', role: 'admin', status: 1 })
      console.log('created admin')
    }

    admin.phone = '13019969559'
    await admin.save()
    console.log(`bound phone ${admin.phone} to user admin`)
    process.exit(0)
  } catch (err) {
    console.error('bind failed', err)
    process.exit(1)
  }
}

bind()
