<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="layout-aside">
      <div class="logo">
        <el-icon :size="24" color="#fff"><Monitor /></el-icon>
        <span class="logo-text">检测订单管理系统</span>
      </div>
      
      <el-menu
        :default-active="$route.path"
        :default-openeds="['/check-order']"
        router
        class="layout-menu"
        background-color="#409EFF"
        text-color="rgba(255,255,255,0.8)"
        active-text-color="#fff"
      >
        <el-sub-menu index="/check-order">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>检查订单</span>
          </template>
          <el-menu-item index="/orders">
            <span>订单列表</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    
    <!-- 主体区域 -->
    <el-container>
      <!-- 头部 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="menu-icon"><Operation /></el-icon>
        </div>
        
        <div class="header-center">
          <el-icon><ChatDotRound /></el-icon>
          <span class="notice-text">当前仅开放诊所账号登录，打印功能后续再补。</span>
        </div>
        
        <div class="header-right">
          <el-button text @click="handleClearCache">
            <el-icon><Delete /></el-icon>
            <span>清除缓存</span>
          </el-button>
          <el-button text @click="handleTheme">
            <el-icon><Sunny /></el-icon>
            <span>切换肤色</span>
          </el-button>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="User" />
              <span class="username">{{ userStore.userInfo?.name || userStore.userInfo?.username || '未登录' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 内容区域 -->
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const handleClearCache = () => {
  ElMessage.success('缓存已清除')
}

const handleTheme = () => {
  ElMessage.info('切换肤色功能开发中...')
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    } catch {
      // 取消退出
    }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: #409EFF;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  gap: 10px;
  background: rgba(0, 0, 0, 0.1);
}

.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
}

.layout-menu {
  border-right: none;
  height: calc(100vh - 60px);
}

.layout-menu :deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
}

.layout-menu :deep(.el-menu-item) {
  height: 45px;
  line-height: 45px;
  padding-left: 50px !important;
  background-color: rgba(0, 0, 0, 0.1) !important;
}

.layout-menu :deep(.el-menu-item.is-active) {
  background-color: rgba(0, 0, 0, 0.2) !important;
}

.layout-header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 50px;
}

.header-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  font-size: 18px;
  color: #666;
  cursor: pointer;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 13px;
}

.notice-text {
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-right .el-button {
  color: #666;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
}

.user-info:hover {
  background: #f5f7fa;
}

.username {
  color: #333;
  font-size: 14px;
}

.layout-main {
  background: #f5f7fa;
  padding: 15px;
  overflow-y: auto;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
