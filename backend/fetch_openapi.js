const https = require('https')

https.get('https://ehealth-platform.szzijian.com/openapi.json', (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    try {
      if (data.length > 100000) console.log('RESPONSE_LENGTH', data.length)
      const keywords = ['LoginByPhoneReqDto', 'LoginByPhone', 'login-by-phone', 'LoginByPhoneReq']
      for (const kw of keywords) {
        const idx = data.indexOf(kw)
        console.log('SEARCH', kw, '=>', idx)
        if (idx !== -1) {
          const snippet = data.substr(Math.max(0, idx-200), 800)
          console.log('SNIPPET FOR', kw, ':\n', snippet)
        }
      }
    } catch (e) {
      console.error('PARSE_ERROR', e.message)
    }
  })
}).on('error', (e) => console.error('REQUEST_ERROR', e.message))
