(async ()=>{
  const path = require('path')
  const fs = require('fs')
  const { requestEhealthApi } = require('../utils/ehealthApi')

  try {
    console.log('logging into third-party')
    const login = await requestEhealthApi({ path: '/api/web/v1/user/login-by-phone', method: 'POST', data: { phone: '15186192123', code: '0000', type: 3 } })
    const accessToken = login.accessToken || login.token || login.access_token || (login.result && (login.result.accessToken || login.result.token))
    if (!accessToken) {
      console.error('no external accessToken')
      process.exit(2)
    }

    console.log('fetching web/paging page 1')
    const resp = await requestEhealthApi({ path: '/api/web/v1/laboratory-orders/paging', token: accessToken, params: { page: 1, limit: 50 } })

    const outdir = path.resolve(__dirname, '..', 'outputs')
    fs.mkdirSync(outdir, { recursive: true })
    const fname = `web_paging_page1_${Date.now()}.json`
    const full = { fetchedAt: new Date().toISOString(), loginResult: login, paging: resp }
    const outPath = path.join(outdir, fname)
    fs.writeFileSync(outPath, JSON.stringify(full, null, 2), 'utf8')
    console.log('WROTE', outPath)
  } catch (e) {
    console.error(e && e.stack ? e.stack : e)
    process.exit(1)
  }
})()
