(async ()=>{
  const base = 'http://localhost:3000'
  const phone = '17347438749'
  console.log('Verify start', new Date().toISOString())
  try {
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code: '0000' })
    })
    const loginJson = await loginRes.json().catch(() => null)
    console.log('LOGIN_STATUS', loginRes.status)
    console.log('LOGIN_BODY', JSON.stringify(loginJson))
    const token = loginJson?.data?.token
    if (!token) return console.log('NO_TOKEN')
    const headers = { Authorization: 'Bearer ' + token }

    const profileRes = await fetch(base + '/api/auth/profile', { headers })
    const profileJson = await profileRes.json().catch(() => null)
    console.log('PROFILE_STATUS', profileRes.status)
    console.log('PROFILE_BODY', JSON.stringify(profileJson))

    const clinicRes = await fetch(base + '/api/auth/clinic', { headers })
    const clinicJson = await clinicRes.json().catch(() => null)
    console.log('CLINIC_STATUS', clinicRes.status)
    console.log('CLINIC_BODY', JSON.stringify(clinicJson))

    const ordersRes = await fetch(base + '/api/orders?page=1&pageSize=5', { headers })
    const ordersJson = await ordersRes.json().catch(() => null)
    console.log('ORDERS_STATUS', ordersRes.status)
    console.log('ORDERS_BODY', JSON.stringify(ordersJson))

  } catch (e) {
    console.error('SCRIPT_ERROR', e && e.stack ? e.stack : e)
  }
})()
