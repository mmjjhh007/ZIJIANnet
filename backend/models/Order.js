const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'order_id',
    comment: '订单ID'
  },
  patientName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'patient_name',
    comment: '患者姓名'
  },
  gender: {
    type: DataTypes.ENUM('男', '女'),
    allowNull: false,
    comment: '性别'
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '年龄'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '联系电话'
  },
  testTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'test_time',
    comment: '检测时间'
  },
  testProject: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'test_project',
    comment: '检测项目'
  },
  testResult: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'test_result',
    comment: '检测结果'
  },
  status: {
    type: DataTypes.ENUM('pending', 'testing', 'completed'),
    defaultValue: 'pending',
    comment: '检测状态: pending-待检测, testing-检测中, completed-已完成'
  },
  clinicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'clinic_id',
    comment: '诊所ID'
  },
  clinicName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'clinic_name',
    comment: '诊所名称'
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'doctor_id',
    comment: '医生ID'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'orders',
  indexes: [
    { fields: ['order_id'] },
    { fields: ['patient_name'] },
    { fields: ['phone'] },
    { fields: ['status'] },
    { fields: ['test_time'] }
  ]
})

// 格式化年龄显示
Order.prototype.getFormattedAge = function () {
  return `${this.age} 周岁`
}

// 格式化检测时间
Order.prototype.getFormattedTestTime = function () {
  if (!this.testTime) return null
  return this.testTime.toISOString().replace('T', ' ').substring(0, 19)
}

module.exports = Order
