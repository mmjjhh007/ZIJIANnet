<template>
  <div class="login-container">
    <div class="login-panel">
      <div class="brand-panel">
        <img class="brand-logo" src="/logo.png" alt="Zijian Logo" onerror="this.onerror=null;this.src='/logo.svg'" />
        
        <h1>检验订单管理</h1>
        <p>对接深圳梓健检测平台，提供检验订单管理服务。</p>
        <ul class="feature-list">
          <li>仅支持诊所账号登录</li>
          <li>自动拉取诊所下检验订单</li>
          <li>签章报告可直接跳转查看</li>
        </ul>
      </div>

      <div class="login-box">
        <div class="login-header">
          <h2>欢迎登录</h2>
          <p>请输入诊所账号信息</p>
        </div>

        <el-tabs v-model="loginType" class="login-tabs" stretch>
          <el-tab-pane label="账号密码登录" name="account">
            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              class="login-form"
            >
              <el-form-item prop="account">
                <el-input
                  v-model="loginForm.account"
                  placeholder="请输入诊所账号"
                  prefix-icon="User"
                  size="large"
                  @keyup.enter="handleLogin"
                />
              </el-form-item>

              <el-form-item prop="password">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入登录密码"
                  prefix-icon="Lock"
                  size="large"
                  show-password
                  @keyup.enter="handleLogin"
                />
              </el-form-item>

              <div class="login-options">
                <el-checkbox v-model="rememberMe">记住账号</el-checkbox>
              </div>

              <el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  class="login-btn"
                  :loading="loading"
                  @click="handleLogin"
                >
                  登 录
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="手机验证码登录" name="phone">
            <el-form class="login-form">
              <el-form-item>
                <el-input
                  v-model="phoneForm.phone"
                  placeholder="请输入诊所绑定手机号"
                  prefix-icon="Phone"
                  size="large"
                />
              </el-form-item>

              <el-form-item>
                <div class="captcha-row">
                  <el-input
                    v-model="phoneForm.code"
                    placeholder="请输入短信验证码"
                    prefix-icon="Message"
                    size="large"
                    class="captcha-input"
                    @keyup.enter="handlePhoneLogin"
                  />
                  <el-button
                    size="large"
                    :disabled="countdown > 0"
                    @click="sendCode"
                  >
                    {{ countdown > 0 ? `${countdown}秒后重试` : '获取验证码' }}
                  </el-button>
                </div>
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  class="login-btn"
                  :loading="loading"
                  @click="handlePhoneLogin"
                >
                  登 录
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <div class="login-agreement">
          <el-checkbox v-model="agreement">我已知晓当前仅支持诊所账号</el-checkbox>
        </div>
      </div>
    </div>

    <div class="login-footer">
      <p>诊所检验订单管理系统 · 基础功能版</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loginType = ref('account')
const loading = ref(false)
const rememberMe = ref(false)
const agreement = ref(false)
const countdown = ref(0)

const loginForm = reactive({
  account: '',
  password: ''
})

const phoneForm = reactive({
  phone: '',
  code: ''
})

const loginRules = {
  account: [
    { required: true, message: '请输入诊所账号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!agreement.value) {
    ElMessage.warning('请先确认仅使用诊所账号登录')
    return
  }

  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login({
      account: loginForm.account,
      password: loginForm.password
    })

    const clinicName = userStore.clinicInfo?.shortName || userStore.clinicInfo?.fullName || userStore.userInfo?.clinicName || ''

    if (!rememberMe.value) {
      localStorage.removeItem('savedAccount')
    }

    ElMessage.success(clinicName ? `登录成功，当前诊所：${clinicName}` : '登录成功')
    router.push('/orders')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const sendCode = async () => {
  if (!phoneForm.phone) {
    ElMessage.warning('请输入手机号码')
    return
  }

  try {
    const res = await api.post('/auth/send-code', { phone: phoneForm.phone })
    ElMessage.success(res.message || '验证码已发送')
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    ElMessage.error(error.message || '发送验证码失败')
  }
}

const handlePhoneLogin = async () => {
  if (!agreement.value) {
    ElMessage.warning('请先确认仅使用诊所账号登录')
    return
  }

  if (!phoneForm.phone || !phoneForm.code) {
    ElMessage.warning('请输入手机号和验证码')
    return
  }

  loading.value = true
  try {
    await userStore.login({ phone: phoneForm.phone, code: phoneForm.code })
    const clinicName = userStore.clinicInfo?.shortName || userStore.clinicInfo?.fullName || userStore.userInfo?.clinicName || ''
    ElMessage.success(clinicName ? `登录成功，当前诊所：${clinicName}` : '登录成功')
    router.push('/orders')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const savedAccount = localStorage.getItem('savedAccount')
  if (savedAccount) {
    loginForm.account = savedAccount
    rememberMe.value = true
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background:
    radial-gradient(circle at top left, rgba(64, 158, 255, 0.3), transparent 35%),
    linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #2563eb 100%);
  padding: 40px 20px 80px;
}

.login-panel {
  width: min(1040px, 100%);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  overflow: hidden;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.32);
}

.brand-panel {
  padding: 56px 48px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.brand-logo {
  width: 160px;
  height: auto;
  object-fit: contain;
  margin-bottom: 6px;
}

.brand-badge {
  width: fit-content;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 13px;
}

.brand-panel h1 {
  font-size: 36px;
  font-weight: 700;
}

.brand-panel p {
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.8;
  font-size: 15px;
}

.feature-list {
  list-style: none;
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.feature-list li {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.92);
}

.login-box {
  padding: 48px 42px;
  background: #fff;
}

.login-header {
  margin-bottom: 26px;
}

.login-header h2 {
  font-size: 28px;
  color: #333;
  font-weight: 600;
}

.login-header p {
  margin-top: 8px;
  color: #909399;
}

.login-tabs {
  margin-bottom: 12px;
}

.login-form {
  margin-top: 24px;
}

.captcha-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.captcha-input {
  flex: 1;
}

.login-options {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
}

.login-agreement {
  font-size: 12px;
  color: #666;
  margin-top: 10px;
}

.login-footer {
  position: fixed;
  bottom: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

@media (max-width: 900px) {
  .login-panel {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    padding: 36px 28px 24px;
  }

  .login-box {
    padding: 32px 24px;
  }
}
</style>
