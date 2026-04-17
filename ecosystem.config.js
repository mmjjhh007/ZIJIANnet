// PM2 ecosystem file for production. Adjust paths and ports as needed.
module.exports = {
  apps: [
    {
      name: 'order-backend',
      cwd: __dirname + '/backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      // If your 检测小程序 backend lives in a different repo/path on the server,
      // update `cwd` below to the real absolute path (e.g. /var/www/inspection-platform/backend)
      name: 'inspection-mini',
      cwd: '/var/www/inspection-platform/backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
}
