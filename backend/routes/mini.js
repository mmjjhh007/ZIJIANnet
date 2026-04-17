const express = require('express')
const { Op } = require('sequelize')
const { Order } = require('../models')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 小程序需要鉴权的接口
router.use(authMiddleware)

// GET /profile - 返回当前用户信息
router.get('/profile', async (req, res) => {
  try {
    const user = req.user
    res.json({ code: 200, data: { id: user.id, username: user.username, name: user.name || user.username, phone: user.phone, role: user.role, clinicId: user.clinicId } })
  } catch (err) {
    res.status(500).json({ code: 500, message: '获取用户信息失败' })
  }
})

// GET /laboratory-orders/paging - 分页查询订单（支持 page, size, status, patientName, fromDate, toDate, orderNo）
router.get('/laboratory-orders/paging', async (req, res) => {
  try {
    const {
      page = 1,
      size = 15,
      status,
      patientName,
      fromDate,
      toDate,
      orderNo
    } = req.query

    const where = {}

    // 只返回当前用户所属诊所的数据（如果 user.clinicId 存在）
    if (req.user && req.user.clinicId) {
      where.clinicId = req.user.clinicId
    }

    if (status) where.status = status
    if (patientName) where.patientName = { [Op.like]: `%${patientName}%` }
    if (orderNo) where.orderId = orderNo

    if (fromDate && toDate) {
      where.testTime = { [Op.between]: [new Date(fromDate), new Date(toDate + ' 23:59:59')] }
    } else if (fromDate) {
      where.testTime = { [Op.gte]: new Date(fromDate) }
    } else if (toDate) {
      where.testTime = { [Op.lte]: new Date(toDate + ' 23:59:59') } }

    const offset = (parseInt(page) - 1) * parseInt(size)
    const limit = parseInt(size)

    const { count, rows } = await Order.findAndCountAll({ where, order: [['testTime', 'DESC']], offset, limit })

    const list = rows.map(o => ({ id: o.id, orderId: o.orderId, patientName: o.patientName, phone: o.phone, testProject: o.testProject, status: o.status, clinicId: o.clinicId, clinicName: o.clinicName, testTime: o.getFormattedTestTime() }))

    res.json({ code: 200, data: { list, total: count, page: parseInt(page), size: parseInt(size) } })
  } catch (error) {
    console.error('小程序分页查询订单失败:', error)
    res.status(500).json({ code: 500, message: '查询订单失败' })
  }
})

// GET /laboratory-orders/:id - 订单详情
router.get('/laboratory-orders/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id)
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' })

    // 简化返回字段，包含报告占位
    res.json({ code: 200, data: {
      id: order.id,
      orderId: order.orderId,
      patientName: order.patientName,
      gender: order.gender,
      age: order.age,
      phone: order.phone,
      testProject: order.testProject,
      testResult: order.testResult,
      status: order.status,
      clinicId: order.clinicId,
      clinicName: order.clinicName,
      testTime: order.getFormattedTestTime(),
      reportId: order.reportId || null
    } })
  } catch (error) {
    console.error('小程序获取订单详情失败:', error)
    res.status(500).json({ code: 500, message: '获取订单详情失败' })
  }
})

module.exports = router
