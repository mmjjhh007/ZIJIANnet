(async ()=>{
  const { User } = require('./models')
  const phone = '17347438749'
  const u = await User.findOne({ where: { phone } })
  console.log('local user for', phone, !!u)
  if (u) console.log(u.toJSON())
  process.exit(0)
})()
