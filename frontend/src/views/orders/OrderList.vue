<template>
  <div class="order-list">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="page-header">
          <div>
            <h2>检验订单列表</h2>
            <p>当前诊所：{{ userStore.clinicInfo?.shortName || userStore.clinicInfo?.fullName || userStore.userInfo?.clinicName || '未识别' }}，仅展示该诊所下的检验订单。</p>
          </div>
        </div>
      </template>

      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="订单号" clearable style="width: 160px;" />
        </el-form-item>
        <el-form-item label="患者姓名">
          <el-input v-model="searchForm.patientName" placeholder="患者姓名" clearable style="width: 160px;" />
        </el-form-item>
        <el-form-item label="检测项目">
          <el-input v-model="searchForm.testProject" placeholder="检测项目关键词" clearable style="width: 180px;" />
        </el-form-item>
        <el-form-item label="诊所名称">
          <el-input v-model="searchForm.clinicName" placeholder="诊所名称" clearable style="width: 180px;" />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="orders" stripe v-loading="loading" border class="order-table">
        <el-table-column prop="orderNo" label="订单号" min-width="160" />
        <el-table-column prop="patientName" label="患者姓名" width="120" align="center" />
        <el-table-column prop="gender" label="性别" width="80" align="center" />
        <el-table-column prop="age" label="年龄" width="90" align="center" />
        <el-table-column prop="phone" label="联系电话" width="140" align="center" />
        <el-table-column prop="clinicName" label="诊所名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="testTime" label="下单时间" width="170" align="center" />
        <el-table-column prop="testProject" label="检测项目" min-width="220" show-overflow-tooltip />
        <el-table-column prop="paidAmount" label="实付金额" width="110" align="center">
          <template #default="{ row }">
            ¥{{ Number(row.paidAmount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="订单状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleDetail(row)">
              <el-icon><Document /></el-icon>详情
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              :disabled="!row.signReportUrl"
              @click="handleReport(row)"
            >
              <el-icon><Link /></el-icon>签章报告
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              :disabled="!row.signReportUrl"
              @click="handlePrintReport(row)"
            >
              打印
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <span class="total-text">共 {{ pagination.total }} 条</span>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 15, 20, 50]"
          :total="pagination.total"
          layout="sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../utils/api'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const statusOptions = [
  { label: '待支付', value: 'PENDING_PAYMENT' },
  { label: '待检测', value: 'PENDING_TESTING' },
  { label: '已检测', value: 'TESTED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
  { label: '退款中', value: 'REFUNDING' },
  { label: '已退款', value: 'REFUNDED' }
]

const searchForm = reactive({
  orderNo: '',
  patientName: '',
  testProject: '',
  clinicName: '',
  status: '',
  dateRange: []
})

const pagination = reactive({
  page: 1,
  pageSize: 15,
  total: 0
})

const orders = ref([])

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

const handleSearch = () => {
  pagination.page = 1
  fetchOrders()
}

const handleReset = () => {
  searchForm.orderNo = ''
  searchForm.patientName = ''
  searchForm.testProject = ''
  searchForm.clinicName = ''
  searchForm.status = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchOrders()
}

const handleDetail = (row) => {
  router.push(`/orders/${row.id}`)
}

  const openPreview = (title, url) => {
  const printUrl = `/api/v1/reports/print?url=${encodeURIComponent(String(url))}`
  const win = window.open(printUrl, '_blank')
  if (!win) {
    ElMessage.warning('浏览器拦截了弹窗，已在当前页打开预览')
    window.location.href = printUrl
  }
}

const handleReport = (row) => {
  if (!row.signReportUrl) {
    ElMessage.warning('当前订单暂无签章报告')
    return
  }

  openPreview('签章报告预览', row.signReportUrl)
}

const handlePrintReportSize = (row) => {
  if (!row.signReportUrl) {
    ElMessage.warning('当前订单暂无签章报告')
    return
  }
  const printUrl = `/api/v1/reports/print?url=${encodeURIComponent(String(row.signReportUrl))}`
  window.open(printUrl, '_blank')
}

// 保留兼容函数，默认 A4
const handlePrintReport = (row) => handlePrintReportSize(row)

const handleSizeChange = (size) => {
  pagination.pageSize = size
  fetchOrders()
}

const handlePageChange = (page) => {
  pagination.page = page
  fetchOrders()
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      orderNo: searchForm.orderNo || undefined,
      patientName: searchForm.patientName || undefined,
      testProject: searchForm.testProject || undefined,
      clinicName: searchForm.clinicName || undefined,
      status: searchForm.status || undefined
    }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const response = await api.get('/orders', { params })
    orders.value = response.data.list || []
    pagination.total = response.data.total || 0
  } catch (error) {
    console.error('获取订单列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.order-list {
  height: 100%;
}

.page-card {
  border: none;
}

.page-header h2 {
  font-size: 22px;
  color: #303133;
  margin-bottom: 8px;
}

.page-header p {
  color: #909399;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.order-table {
  width: 100%;
}

.order-table :deep(th) {
  background: #f8fafc !important;
  color: #1d4ed8;
  font-weight: 600;
}

.pagination-wrapper {
  padding-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.total-text {
  color: #606266;
  font-size: 13px;
}
</style>
