<template>
  <div class="user-list">
    <el-card>
      <el-table :data="users" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="createTime" label="注册时间" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" text size="small">编辑</el-button>
            <el-button type="danger" text size="small">禁用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const users = ref([
  { id: 1, username: '张三', phone: '138****1234', createTime: '2026-01-01', status: 1 },
  { id: 2, username: '李四', phone: '139****5678', createTime: '2026-02-15', status: 1 },
  { id: 3, username: '王五', phone: '137****9012', createTime: '2026-03-20', status: 0 }
])
</script>
