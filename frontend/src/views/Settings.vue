<template>
  <div class="settings">
    <el-card>
      <template #header>系统设置</template>
      
      <el-form label-width="120px">
        <el-form-item label="系统名称">
          <el-input v-model="settings.systemName" style="max-width: 400px;" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="settings.phone" style="max-width: 400px;" />
        </el-form-item>
        <el-form-item label="开启注册">
          <el-switch v-model="settings.enableRegister" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const settings = reactive({
  systemName: '小程序订单管理系统',
  phone: '400-123-4567',
  enableRegister: true
})
</script>
