<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <!-- 统计卡片 -->
      <el-col :span="6" v-for="item in statsCards" :key="item.title">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-info">
              <p class="stats-title">{{ item.title }}</p>
              <p class="stats-value">{{ item.value }}</p>
            </div>
            <div class="stats-icon" :style="{ background: item.color }">
              <el-icon :size="24"><component :is="item.icon" /></el-icon>
            </div>
          </div>
          <div class="stats-footer">
            <span>{{ item.trend }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 最近订单 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近订单</span>
              <el-button type="primary" text @click="$router.push('/orders')">
                查看更多
              </el-button>
            </div>
          </template>
          
          <el-table :data="recentOrders" stripe>
            <el-table-column prop="orderNo" label="订单号" width="180" />
            <el-table-column prop="customer" label="客户" width="120" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                ¥{{ row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" />
          </el-table>
        </el-card>
      </el-col>
      
      <!-- 快捷操作 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>快捷操作</span>
          </template>
          
          <div class="quick-actions">
            <el-button 
              v-for="action in quickActions" 
              :key="action.text"
              :type="action.type"
              :icon="action.icon"
              size="large"
              class="action-btn"
              @click="action.handler"
            >
              {{ action.text }}
            </el-button>
          </div>
        </el-card>
        
        <el-card style="margin-top: 20px;">
          <template #header>
            <span>系统信息</span>
          </template>
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
            <el-descriptions-item label="Vue版本">3.x</el-descriptions-item>
            <el-descriptions-item label="运行环境">Production</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const statsCards = ref([
  { 
    title: '今日订单', 
    value: '128', 
    icon: 'Document', 
    color: '#409EFF',
    trend: '较昨日 +12%'
  },
  { 
    title: '今日销售额', 
    value: '¥12,680', 
    icon: 'Money', 
    color: '#67C23A',
    trend: '较昨日 +8%'
  },
  { 
    title: '待处理订单', 
    value: '23', 
    icon: 'Clock', 
    color: '#E6A23C',
    trend: '需要处理'
  },
  { 
    title: '本月用户', 
    value: '1,024', 
    icon: 'User', 
    color: '#F56C6C',
    trend: '较上月 +15%'
  }
])

const recentOrders = ref([
  { orderNo: 'ORD202604130001', customer: '张三', amount: 299.00, status: 'pending', createTime: '2026-04-13 10:30:00' },
  { orderNo: 'ORD202604130002', customer: '李四', amount: 588.00, status: 'paid', createTime: '2026-04-13 11:20:00' },
  { orderNo: 'ORD202604130003', customer: '王五', amount: 1299.00, status: 'shipped', createTime: '2026-04-13 12:15:00' },
  { orderNo: 'ORD202604130004', customer: '赵六', amount: 199.00, status: 'completed', createTime: '2026-04-13 14:00:00' },
  { orderNo: 'ORD202604130005', customer: '钱七', amount: 459.00, status: 'pending', createTime: '2026-04-13 15:30:00' }
])

const quickActions = ref([
  { text: '新建订单', type: 'primary', icon: 'Plus', handler: () => router.push('/orders/create') },
  { text: '商品管理', type: 'success', icon: 'Goods', handler: () => router.push('/products') },
  { text: '用户管理', type: 'info', icon: 'User', handler: () => router.push('/users') },
  { text: '系统设置', type: 'warning', icon: 'Setting', handler: () => router.push('/settings') }
])

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    paid: 'primary',
    shipped: 'info',
    completed: 'success',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待支付',
    paid: '已支付',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-card {
  margin-bottom: 0;
}

.stats-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-info {
  flex: 1;
}

.stats-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stats-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stats-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stats-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.action-btn {
  width: 100%;
}
</style>
