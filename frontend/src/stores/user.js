import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))
  const clinicInfo = ref(JSON.parse(localStorage.getItem('clinicInfo') || 'null'))

  const login = async (loginData) => {
    const response = await api.post('/auth/login', loginData)
    token.value = response.data.token
    userInfo.value = response.data.user
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('userInfo', JSON.stringify(response.data.user))

    if (response.data.user?.account) {
      localStorage.setItem('savedAccount', response.data.user.account)
    }

    await getUserInfo()
    await getClinicInfo().catch(() => null)

    return response.data
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    clinicInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('clinicInfo')
  }

  const getUserInfo = async () => {
    if (!token.value) return null
    try {
      const response = await api.get('/auth/profile')
      userInfo.value = response.data
      localStorage.setItem('userInfo', JSON.stringify(response.data))
      return response.data
    } catch (error) {
      logout()
      throw error
    }
  }

  const getClinicInfo = async () => {
    if (!token.value) return null
    const response = await api.get('/auth/clinic')
    clinicInfo.value = response.data
    localStorage.setItem('clinicInfo', JSON.stringify(response.data))
    return response.data
  }

  const bootstrapSession = async () => {
    if (!token.value) return null
    if (userInfo.value && clinicInfo.value) return { userInfo: userInfo.value, clinicInfo: clinicInfo.value }

    const profile = await getUserInfo()
    await getClinicInfo().catch(() => null)
    return profile
  }

  return {
    token,
    userInfo,
    clinicInfo,
    login,
    logout,
    getUserInfo,
    getClinicInfo,
    bootstrapSession
  }
})
