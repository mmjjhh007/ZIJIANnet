(async () => {
  const path = require('path')
  const fs = require('fs')
  const { requestEhealthApi, ExternalApiError } = require('../utils/ehealthApi')

  const phone = process.argv[2] || '13046086058'
  const code = process.argv[3] || '0000'

  const outdir = path.resolve(__dirname, '..', 'outputs')
  fs.mkdirSync(outdir, { recursive: true })
  const stamp = Date.now()
  const outFile = path.join(outdir, `login_orders_${phone}_${stamp}.json`)

  const result = { fetchedAt: new Date().toISOString(), phone, steps: [] }

  try {
    result.steps.push('login')
    const login = await requestEhealthApi({ path: '/api/web/v1/user/login-by-phone', method: 'POST', data: { phone, code, type: 3 } })
    result.loginRaw = login

    const accessToken = login.accessToken || login.token || login.access_token || (login.result && (login.result.accessToken || login.result.token))
    const userId = login.id || login.result?.id || login.userId || login.result?.userId
    if (!accessToken) throw new Error('no external accessToken')
    result.steps.push('fetched_token')

    // fetch user details
    result.steps.push('fetch_user')
    let user = null
    if (userId) {
      try {
        user = await requestEhealthApi({ path: `/api/web/v1/user/${userId}`, token: accessToken })
      } catch (e) {
        // store error
        result.userFetchError = e.payload || { message: e.message }
      }
    }
    result.user = user || login

    // also try mini profile endpoint to discover clinic info (some accounts expose clinic via mini/profile)
    try {
      const mini = await requestEhealthApi({ path: '/api/mini/v1/profile', token: accessToken })
      result.miniProfile = mini
    } catch (e) {
      result.miniProfileError = e.payload || { message: e.message }
    }

    // try to discover clinic list from user object
    result.steps.push('discover_clinics')
    const clinics = []
    const u = result.user || {}
    // common keys
    if (Array.isArray(u.clinicRows) && u.clinicRows.length) clinics.push(...u.clinicRows)
    if (Array.isArray(u.clinics) && u.clinics.length) clinics.push(...u.clinics)
    if (u.clinic && typeof u.clinic === 'object' && u.clinic.id) clinics.push(u.clinic)

    // generic scan: any array of objects with id
    if (!clinics.length) {
      for (const [k, v] of Object.entries(u)) {
        if (Array.isArray(v) && v.length && v[0] && (v[0].id || v[0].clinicId)) {
          clinics.push(...v)
        }
      }
    }

    // dedupe by id
    const clinicMap = new Map()
    clinics.forEach(c => {
      const id = c.id || c.clinicId || c.clinic_id
      if (id) clinicMap.set(Number(id), c)
    })

    // if miniProfile returned a clinic, ensure it's included
    if (result.miniProfile && result.miniProfile.clinic && result.miniProfile.clinic.id) {
      const mid = Number(result.miniProfile.clinic.id)
      if (!clinicMap.has(mid)) clinicMap.set(mid, result.miniProfile.clinic)
    }

    // fallback: if user has leaderId/clinicId fields
    if (!clinicMap.size) {
      const maybeId = u.clinicId || u.clinic_id || u.leaderId || u.leader_id
      if (maybeId) clinicMap.set(Number(maybeId), { id: Number(maybeId) })
    }

    result.clinicIds = Array.from(clinicMap.keys())

    // for each clinic id, fetch orders (paging) and map fields
    result.steps.push('fetch_orders')
    result.ordersByClinic = {}

    for (const cid of result.clinicIds) {
      try {
        const paging = await requestEhealthApi({ path: '/api/web/v1/laboratory-orders/paging', token: accessToken, params: { clinicId: cid, page: 1, limit: 50 } })
        // normalize list
        let list = []
        if (Array.isArray(paging)) list = paging
        else if (Array.isArray(paging.data)) list = paging.data
        else if (Array.isArray(paging.result)) list = paging.result
        else if (Array.isArray(paging.rows)) list = paging.rows

        // map to simplified rows for web
        const mapped = list.map(o => ({
          id: o.id || o.orderId || null,
          orderNo: o.orderNo || o.order_no || null,
          clinicId: o.clinicId || o.clinic?.id || cid,
          clinicName: (o.clinic && (o.clinic.shortName || o.clinic.fullName)) || (clinicMap.get(cid)?.shortName) || null,
          patientName: o.patientName || o.patient?.name || null,
          status: o.status || null,
          paymentStatus: o.paymentStatus || null,
          totalAmount: o.totalAmount || o.total || 0,
          paidAmount: o.paidAmount || 0,
          paymentTime: o.paymentTime || null,
          testingTime: o.testingTime || null,
          completedTime: o.completedTime || null,
          createdAt: o.createdAt || null
        }))

        result.ordersByClinic[cid] = { rawPaging: paging, list: mapped, total: (paging && paging.total) || mapped.length }
      } catch (e) {
        result.ordersByClinic[cid] = { error: e.payload || { message: e.message } }
      }
    }

    // write output
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8')
    console.log('WROTE', outFile)
    process.exit(0)
  } catch (err) {
    result.error = (err && err.payload) || { message: err.message }
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8')
    console.error('ERROR, wrote partial result to', outFile)
    process.exit(1)
  }
})()
