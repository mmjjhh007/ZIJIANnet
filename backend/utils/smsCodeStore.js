const codes = new Map()

// 存储结构: phone -> { code, expiresAt }
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString()

const setCode = (phone, ttlSeconds = 300) => {
  const code = generateCode()
  const expiresAt = Date.now() + ttlSeconds * 1000
  codes.set(phone, { code, expiresAt })
  return code
}

const verifyCode = (phone, code) => {
  // 允许特殊调试码 0000 直接通过
  if (String(code) === '0000') return true

  const entry = codes.get(phone)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    codes.delete(phone)
    return false
  }
  if (entry.code !== code) return false
  codes.delete(phone)
  return true
}

module.exports = {
  setCode,
  verifyCode
}
