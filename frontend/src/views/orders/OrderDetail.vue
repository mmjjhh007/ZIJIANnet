<template>
  <div class="order-detail">
    <el-page-header @back="$router.back()" title="返回" content="订单详情" />

    <el-skeleton :loading="loading" animated :rows="8">
      <el-card style="margin-top: 20px;">
        <template #header>
          <div class="card-header">
            <span>基础信息</span>
            <el-tag :type="getStatusType(order.status)" size="large">
              {{ getStatusText(order.status) }}
            </el-tag>
          </div>
        </template>

        <el-descriptions :column="3" border>
          <el-descriptions-item label="订单号">{{ order.orderNo || '--' }}</el-descriptions-item>
          <el-descriptions-item label="诊所名称">{{ order.clinicName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ order.testTime || '--' }}</el-descriptions-item>
          <el-descriptions-item label="患者姓名">{{ order.patientName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ order.phone || '--' }}</el-descriptions-item>
          <el-descriptions-item label="患者信息">{{ `${order.gender || '--'} / ${order.age || '--'}` }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">¥{{ Number(order.paidAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="订单总额">¥{{ Number(order.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ order.remark || '--' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card style="margin-top: 20px;">
        <template #header>检测项目</template>

        <el-table :data="order.items || []" empty-text="暂无检测项目">
          <el-table-column prop="packageName" label="套餐名称" min-width="160" />
          <el-table-column prop="testItemName" label="检测项目" min-width="180" />
          <el-table-column prop="testItemCode" label="项目编码" width="140" />
          <el-table-column prop="deviceName" label="设备名称" min-width="160" />
          <el-table-column prop="price" label="价格" width="110" align="center">
            <template #default="{ row }">
              ¥{{ Number(row.price || 0).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card style="margin-top: 20px;">
        <template #header>报告链接</template>

        <div class="report-actions">
          <el-button type="primary" plain :disabled="!order.reportUrl" @click="openLink(order.reportUrl)">
            查看原始报告
          </el-button>
          <el-button type="primary" :disabled="!order.signReportUrl" @click="openLink(order.signReportUrl)">
            查看签章报告
          </el-button>
          <el-button type="primary" :disabled="!order.signReportUrl" @click="printLink(order.signReportUrl)">
            打印签章报告
          </el-button>
          <el-button :disabled="!order.thirdReportUrl" @click="openLink(order.thirdReportUrl)">
            查看三方签章报告
          </el-button>
        </div>
      </el-card>
    </el-skeleton>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../utils/api'

const route = useRoute()
const loading = ref(false)
const order = ref({ items: [] })

const getStatusType = (status) => {
  const types = {
    PENDING_PAYMENT: 'warning',
    PENDING_TESTING: 'warning',
    TESTED: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    REFUNDING: 'info',
    REFUNDED: ''
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    PENDING_PAYMENT: '待支付',
    PENDING_TESTING: '待检测',
    TESTED: '已检测',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REFUNDING: '退款中',
    REFUNDED: '已退款'
  }
  return texts[status] || status || '--'
}

const openPreview = (title, url) => {
  const printUrl = `/api/v1/reports/print?url=${encodeURIComponent(String(url))}`
  const win = window.open(printUrl, '_blank')
  if (!win) {
    ElMessage.warning('浏览器拦截了弹窗，已在当前页打开预览')
    window.location.href = printUrl
  }
}

const openLink = (url) => {
  if (!url) {
    ElMessage.warning('暂无可查看的报告链接')
    return
  }

  openPreview('报告预览', url)
}

const printLinkWithSize = (url) => {
  if (!url) {
    ElMessage.warning('暂无可打印的报告链接')
    return
  }
  const printUrl = `/api/v1/reports/print?url=${encodeURIComponent(String(url))}`
  window.open(printUrl, '_blank')
}

// 兼容原名
const printLink = (url) => printLinkWithSize(url)

const fetchOrderDetail = async () => {
  loading.value = true
  try {
    const response = await api.get(`/orders/${route.params.id}`)
    order.value = response.data
  } catch (error) {
    ElMessage.error(error.message || '获取订单详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrderDetail()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
