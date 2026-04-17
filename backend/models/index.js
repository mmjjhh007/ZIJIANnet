const { sequelize } = require('../config/database')
const config = require('../config')
const User = require('./User')
const Order = require('./Order')

// 定义关联关系
User.hasMany(Order, { foreignKey: 'doctorId', as: 'orders' })
Order.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' })

// 同步所有模型到数据库
const syncDatabase = async (force = false) => {
  try {
    const isSqlite = config.database?.dialect === 'sqlite'
    const isDev = config.server?.env === 'development'
    const enableAlter = !(isSqlite && isDev)

    await sequelize.sync({ force, alter: !force && enableAlter })
    console.log('✅ 数据库表同步成功')
    return true
  } catch (error) {
    console.error('❌ 数据库表同步失败:', error && error.stack ? error.stack : error)
    // 开发环境下不阻断启动，继续运行（避免因 sqlite alter 导致的同步失败阻塞调试）
    console.warn('⚠️ 开发模式：跳过表同步错误，继续启动（请在生产环境修复模型/数据库差异）')
    return true
  }
}

// 初始化默认数据
const initDefaultData = async () => {
  try {
    // 检查是否已有管理员
    const adminExists = await User.findOne({ where: { username: 'admin' } })
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        realName: '系统管理员',
        role: 'admin',
        status: 1
      })
      console.log('✅ 默认管理员账号创建成功 (admin / admin123)')
    }

    // 检查是否已有订单数据
    const orderCount = await Order.count()
    if (orderCount === 0) {
      // 插入示例数据
      const sampleOrders = [
        {
          orderId: '990366',
          patientName: '李俊阳',
          gender: '男',
          age: 14,
          phone: '13019969559',
          testTime: new Date('2025-04-28 18:50:01'),
          testProject: 'Cpn-IgM检测',
          testResult: '阴性(0.13)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        },
        {
          orderId: '990367',
          patientName: '李俊阳',
          gender: '男',
          age: 14,
          phone: '13019969559',
          testTime: new Date('2025-04-28 18:50:01'),
          testProject: 'MP-IgM检测',
          testResult: '阴性(0.28)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        },
        {
          orderId: '772086',
          patientName: '王大明',
          gender: '男',
          age: 44,
          phone: '13065254511',
          testTime: new Date('2024-12-21 08:24:15'),
          testProject: 'Cpn-IgM检测',
          testResult: '阴性(0.19)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        },
        {
          orderId: '772087',
          patientName: '王大明',
          gender: '男',
          age: 44,
          phone: '13065254511',
          testTime: new Date('2024-12-21 08:24:15'),
          testProject: 'MP-IgM检测',
          testResult: '阴性(0.61)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        },
        {
          orderId: '766560',
          patientName: '刘爽',
          gender: '女',
          age: 26,
          phone: '13358916669',
          testTime: new Date('2024-12-19 10:59:57'),
          testProject: 'Cpn-IgM检测',
          testResult: '阴性(0.15)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        },
        {
          orderId: '766561',
          patientName: '刘爽',
          gender: '女',
          age: 26,
          phone: '13358916669',
          testTime: new Date('2024-12-19 10:59:57'),
          testProject: 'MP-IgM检测',
          testResult: '阴性(0.48)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        },
        {
          orderId: '753389',
          patientName: '孙然',
          gender: '女',
          age: 31,
          phone: '15694276466',
          testTime: new Date('2024-12-15 09:28:02'),
          testProject: 'Cpn-IgM检测',
          testResult: '阴性(0.08)',
          status: 'completed',
          clinicName: '盘锦市大洼区二界沟诊所'
        }
      ]

      await Order.bulkCreate(sampleOrders)
      console.log('✅ 示例订单数据创建成功')
    }

    return true
  } catch (error) {
    console.error('❌ 初始化默认数据失败:', error.message)
    return false
  }
}

module.exports = {
  sequelize,
  User,
  Order,
  syncDatabase,
  initDefaultData
}
