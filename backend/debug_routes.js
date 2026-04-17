const r = require('./routes/auth')
console.log(r.stack ? r.stack.filter(s=>s.route).map(s=>({path:s.route.path, methods:s.route.methods})) : r)
