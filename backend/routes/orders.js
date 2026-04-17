const express = require('express')
const { authMiddleware } = require('../middleware/auth')
const { requestEhealthApi, ExternalApiError } = require('../utils/ehealthApi')

const router = express.Router()

router.use(authMiddleware)

const resolveClinicId = async (req) => {
  if (req.user?.clinicId) return req.user.clinicId

  let profile
  try {
    profile = await requestEhealthApi({
      path: '/api/web/v1/users/profile',
      token: req.auth.externalAccessToken
    })
  } catch (error) {
    profile = await requestEhealthApi({
      path: '/api/web/v1/user/profile',
      token: req.auth.externalAccessToken
    })
  }

  const clinicId = profile?.clinic?.id || profile?.clinicId || profile?.clinic_id || null
  if (clinicId) {
    req.user = {
      ...(req.user || {}),
      clinicId
    }
  }

  return clinicId
}

const toDisplayGender = (gender) => {
  const genderMap = {
    MALE: '男',
    FEMALE: '女',
    OTHER: '其他'
  }

  return genderMap[gender] || gender || '--'
}

const formatAge = (patient = {}) => {
  if (patient.age === undefined || patient.age === null || patient.age === '') return '--'
  return `${patient.age}${patient.ageUnit === 'MONTH' ? '个月' : '岁'}`
}

const formatTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().replace('T', ' ').substring(0, 19)
}

const mapOrder = (order = {}) => {
  const patient = order.patient || {}
  const clinic = order.clinic || {}
  const items = Array.isArray(order.items) ? order.items : []
  const testProject = items
    .map((item) => item.testItemName || item.packageName)
    .filter(Boolean)
    .join(' / ')

  return {
    id: order.id,
    orderId: order.orderNo,
    orderNo: order.orderNo,
    patientName: order.patientName || patient.name || '--',
    gender: toDisplayGender(patient.gender),
    age: formatAge(patient),
    phone: patient.phone || '--',
    testTime: formatTime(order.createdAt),
    updatedAt: formatTime(order.updatedAt),
    testProject: testProject || '--',
    testResult: '--',
    status: order.status,
    clinicId: order.clinicId || clinic.id || null,
    clinicName: clinic.shortName || clinic.fullName || order.clinicName || '--',
    totalAmount: order.totalAmount ?? 0,
    paidAmount: order.paidAmount ?? 0,
    remark: order.remark || '',
    reportUrl: order.reportUrl || '',
    signReportUrl: order.signReportUrl || '',
    thirdReportUrl: order.thirdReportUrl || '',
    items,
    patient,
    clinic
  }
}

const filterOrders = (orders, filters) => {
  const {
    patientName,
    testProject,
    clinicName,
    status,
    startDate,
    endDate,
    orderNo
  } = filters

  return orders.filter((item) => {
    if (patientName && !String(item.patientName || '').includes(patientName)) return false
    if (testProject && !String(item.testProject || '').includes(testProject)) return false
    if (clinicName && !String(item.clinicName || '').includes(clinicName)) return false
    if (status && item.status !== status) return false
    if (orderNo && !String(item.orderNo || '').includes(orderNo)) return false

    if (startDate || endDate) {
      const current = new Date(item.testTime)
      if (!Number.isNaN(current.getTime())) {
        if (startDate) {
          const start = new Date(startDate)
          if (current < start) return false
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59`)
          if (current > end) return false
        }
      }
    }

    return true
  })
}

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 15,
      orderNo,
      patientName,
      testProject,
      clinicName,
      status,
      startDate,
      endDate
    } = req.query

    const clinicId = await resolveClinicId(req)

    if (!clinicId) {
      return res.status(403).json({ code: 403, message: '当前账号未绑定诊所' })
    }

    const accessToken = req.auth.externalAccessToken
    const currentPage = parseInt(page)
    const limit = parseInt(pageSize)

    let list = []
    let total = 0

    if (testProject) {
      const rawOrders = await requestEhealthApi({
        path: '/api/web/v1/laboratory-orders/list',
        token: accessToken,
        params: {
          clinicId
        }
      })

      const mappedOrders = (Array.isArray(rawOrders) ? rawOrders : []).map(mapOrder)
      const filteredOrders = filterOrders(mappedOrders, {
        orderNo,
        patientName,
        testProject,
        clinicName,
        status,
        startDate,
        endDate
      }).sort((a, b) => new Date(b.testTime) - new Date(a.testTime))

      total = filteredOrders.length
      const startIndex = (currentPage - 1) * limit
      list = filteredOrders.slice(startIndex, startIndex + limit)
    } else {
      const pagingResult = await requestEhealthApi({
        path: '/api/web/v1/laboratory-orders/paging',
        token: accessToken,
        params: {
          clinicId,
          page: currentPage,
          limit,
          orderNo,
          status,
          keyword: patientName,
          startAt: startDate,
          endAt: endDate,
          sortField: 'createdAt',
          sortOrder: 'DESC'
        }
      })

      list = (pagingResult?.data || []).map(mapOrder)
      total = Number(pagingResult?.total || 0)

      if (clinicName) {
        const filteredOrders = filterOrders(list, { clinicName })
        list = filteredOrders
        total = filteredOrders.length
      }
    }

    res.json({
      code: 200,
      data: {
        list,
        total,
        page: currentPage,
        pageSize: limit
      }
    })
  } catch (error) {
    console.error('获取订单列表错误:', error)
    const status = error instanceof ExternalApiError ? error.status : 500
    res.status(status).json({
      code: status,
      message: error.message || '获取订单列表失败'
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const order = await requestEhealthApi({
      path: `/api/web/v1/laboratory-orders/${req.params.id}`,
      token: req.auth.externalAccessToken
    })

    const mappedOrder = mapOrder(order)
    if (!mappedOrder.id) {
      return res.status(404).json({
        code: 404,
        message: '订单不存在'
      })
    }

    res.json({
      code: 200,
      data: mappedOrder
    })
  } catch (error) {
    console.error('获取订单详情错误:', error)
    const status = error instanceof ExternalApiError ? error.status : 500
    res.status(status).json({
      code: status,
      message: error.message || '获取订单详情失败'
    })
  }
})

module.exports = router
