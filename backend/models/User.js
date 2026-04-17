const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')
const bcrypt = require('bcryptjs')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '密码'
  },
  realName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'real_name',
    comment: '真实姓名'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '手机号'
  },
  role: {
    type: DataTypes.ENUM('admin', 'doctor', 'staff'),
    defaultValue: 'staff',
    comment: '角色: admin-管理员, doctor-医生, staff-员工'
  },
  clinicName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'clinic_name',
    comment: '诊所名称'
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '状态: 0-禁用, 1-启用'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10)
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10)
      }
    }
  }
})

// 验证密码
User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password)
}

// 隐藏密码字段
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get())
  delete values.password
  return values
}

module.exports = User
