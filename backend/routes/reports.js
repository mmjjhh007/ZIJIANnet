const express = require('express')
const fs = require('fs')
const path = require('path')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 注意：`/proxy` 允许被前端直接请求（浏览器请求不会带 Authorization header），
// 因此我们不在路由级别统一使用 authMiddleware，而是为需要鉴权的路由单独添加中间件。

// 代理 PDF 请求：GET /api/v1/reports/proxy?url=ENCODED_URL
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query
    if (!url) return res.status(400).json({ code: 400, message: '缺少 url 参数' })

    let target
    try {
      target = new URL(url)
    } catch (err) {
      return res.status(400).json({ code: 400, message: '无效的 url' })
    }

    const config = require('../config')
    const allowedHosts = [new URL(config.ehealth.baseUrl).hostname]
    const hostname = target.hostname || ''
    // 开发环境允许额外的测试域名（便于本地调试）
    const devAllowed = config.server.env === 'development' ? ['localhost', '127.0.0.1', 'www.w3.org'] : []
    const allowed = allowedHosts.includes(hostname) || devAllowed.includes(hostname) || hostname.endsWith('.aliyuncs.com') || hostname.endsWith('.oss-cn-shenzhen.aliyuncs.com')
    if (!allowed) {
      return res.status(403).json({ code: 403, message: '不允许访问该域名' })
    }

    const httpLib = target.protocol === 'http:' ? require('http') : require('https')
    const externalToken = req.auth && req.auth.externalAccessToken
    const requestOptions = {
      method: 'GET',
      headers: {
        ...(externalToken ? { Authorization: `Bearer ${externalToken}` } : {})
      }
    }

    console.log('[reports.proxy] target=', target.href, 'externalToken=', !!externalToken)

    const proxiedReq = httpLib.request(target.href, requestOptions, (proxiedRes) => {
      console.log('[reports.proxy] upstream status=', proxiedRes.statusCode)
      const headers = { ...proxiedRes.headers }
      // 移除可能影响页面嵌入或打印的安全头
      delete headers['x-frame-options']
      delete headers['x-xss-protection']
      delete headers['content-disposition']
      delete headers['content-security-policy']
      delete headers['content-security-policy-report-only']

      const statusCode = proxiedRes.statusCode || 200
      if (statusCode >= 200 && statusCode < 300) {
        res.writeHead(200, {
          'Content-Type': headers['content-type'] || 'application/pdf',
          'Content-Disposition': 'inline',
          ...headers
        })
        proxiedRes.pipe(res)
        return
      }

      // 非 2xx：收集 upstream body 并返回可读的错误信息给前端
      let body = ''
      proxiedRes.setEncoding('utf8')
      proxiedRes.on('data', (chunk) => { body += chunk })
      proxiedRes.on('end', () => {
        console.warn('[reports.proxy] upstream non-2xx body:', body?.substring(0, 200))
        const message = body ? `Upstream ${statusCode}: ${body}` : `Upstream returned status ${statusCode}`
        res.status(statusCode).json({ code: statusCode, message })
      })
    })

    proxiedReq.on('error', (err) => {
      console.error('proxy fetch error:', err)
      res.status(502).json({ code: 502, message: '代理请求失败' })
    })
    proxiedReq.end()
  } catch (error) {
    console.error('proxy handler error:', error)
    res.status(500).json({ code: 500, message: '代理服务异常' })
  }
})

// 打印页包装器：GET /api/v1/reports/print?url=ENCODED_URL&page=a4|a5
router.get('/print', (req, res) => {
  try {
    const { url, page = 'a4' } = req.query
    if (!url) return res.status(400).send('缺少 url 参数')

    // 仅允许安全域名（与 proxy 相同）
    let target
    try {
      target = new URL(url)
    } catch (err) {
      return res.status(400).send('无效的 url')
    }
    const config = require('../config')
    const allowedHosts = [new URL(config.ehealth.baseUrl).hostname]
    const hostname = target.hostname || ''
    // 开发环境允许额外的测试域名（便于本地调试）
    const devAllowed = config.server.env === 'development' ? ['localhost', '127.0.0.1', 'www.w3.org'] : []
    const allowed = allowedHosts.includes(hostname) || devAllowed.includes(hostname) || hostname.endsWith('.aliyuncs.com') || hostname.endsWith('.oss-cn-shenzhen.aliyuncs.com')
    if (!allowed) return res.status(403).send('不允许访问该域名')

    const sizeCss = page === 'a5' ? 'size: 148mm 210mm;' : 'size: 210mm 297mm;'

    const proxiedUrl = `/api/v1/reports/proxy?url=${encodeURIComponent(String(url))}`

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>报告打印</title>
    <style>
      html,body{height:100%;margin:0}
      .toolbar{display:none}
      embed,object,iframe{width:100%;height:100%;border:0}
      @page { ${sizeCss} }
    </style>
  </head>
  <body>
    <script>
      const proxied = '${proxiedUrl}';
      // 首选：在新窗口打开 PDF（保留浏览器的原生打印/下载功能）并在加载完成后打印
      try{
        const w = window.open(proxied, '_blank');
        if(w){
          // 轮询直到新窗口准备好，然后触发打印（同源时可用）
          const interval = setInterval(()=>{
            try{
              if(!w || w.closed){ clearInterval(interval); return }
              // 当可访问 document 且准备就绪时打印
              if(w.document && (w.document.readyState === 'complete' || w.document.readyState === 'interactive')){
                clearInterval(interval);
                try{ w.focus(); w.print(); }catch(e){}
              }
            }catch(e){
              // 访问被阻止则继续等待（可能尚未同源）
            }
          }, 300);
          // 若 popup 被阻止或无法打开，则降级为内嵌显示
          setTimeout(()=>{
            if(!w || w.closed){
              const container = document.createElement('div');
              container.innerHTML = '<p>无法打开新窗口，已在页面内嵌显示报告，请使用浏览器打印按钮。</p>' + '<embed src="' + proxied + '" type="application/pdf" />';
              document.body.appendChild(container);
            }
          }, 500);
        }else{
          // popup 被阻止，直接内嵌
          document.body.innerHTML = '<p>无法打开新窗口，已在页面内嵌显示报告，请使用浏览器打印按钮。</p>' + '<embed src="' + proxied + '" type="application/pdf" />';
        }
      }catch(err){
        console.error('print wrapper error', err);
        document.body.innerHTML = '<p>生成打印页面失败</p>';
      }
    </script>
  </body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    console.error('print page error:', err)
    res.status(500).send('打印页生成失败')
  }
})

// GET /api/v1/reports/:reportId - 返回报告元信息（占位实现）
// 先检查是否为编码的远程 URL；若是，直接重定向到 proxy（无需鉴权）
router.get('/:reportId', (req, res, next) => {
  const { reportId } = req.params
  try {
    const maybeDecoded = decodeURIComponent(reportId)
    if (/^https?:\/\//i.test(maybeDecoded) || reportId.includes('%2F') || reportId.startsWith('http') || reportId.startsWith('https')) {
      const encoded = encodeURIComponent(maybeDecoded)
      return res.redirect(307, `/api/v1/reports/proxy?url=${encoded}`)
    }
  } catch (e) {
    // ignore decode errors and fallback to file lookup
  }
  next()
}, authMiddleware, async (req, res) => {
  const { reportId } = req.params
  // 占位：如果存在文件报告则返回元信息（需要鉴权）
  const reportsDir = path.join(__dirname, '..', 'reports')
  const pdfPath = path.join(reportsDir, `${reportId}.pdf`)
  if (fs.existsSync(pdfPath)) {
    return res.json({ code: 200, data: { reportId, available: true, filename: `${reportId}.pdf` } })
  }
  return res.status(404).json({ code: 404, message: '报告未找到' })
})

// GET /api/v1/reports/:reportId/download - 下载报告 PDF（stream）
router.get('/:reportId/download', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params
    const reportsDir = path.join(__dirname, '..', 'reports')
    const pdfPath = path.join(reportsDir, `${reportId}.pdf`)

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ code: 404, message: '报告文件不存在' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${reportId}.pdf"`)

    const stream = fs.createReadStream(pdfPath)
    stream.pipe(res)
    stream.on('error', err => {
      console.error('报告文件读取错误:', err)
      res.status(500).end()
    })
  } catch (error) {
    console.error('下载报告失败:', error)
    res.status(500).json({ code: 500, message: '下载报告失败' })
  }
})

module.exports = router
