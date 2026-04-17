<template>
  <div class="product-list">
    <el-card>
      <div class="table-actions">
        <el-button type="primary" icon="Plus" @click="handleAdd">添加商品</el-button>
      </div>
      
      <el-table :data="products" stripe style="margin-top: 15px;">
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image :src="row.image" style="width: 60px; height: 60px;" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="200" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 添加/编辑商品对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑商品' : '添加商品'"
      width="600px"
    >
      <el-form :model="productForm" label-width="100px">
        <el-form-item label="商品名称">
          <el-input v-model="productForm.name" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="productForm.category" style="width: 100%;">
            <el-option label="数码配件" value="数码配件" />
            <el-option label="服饰" value="服饰" />
            <el-option label="家居" value="家居" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="productForm.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="productForm.stock" :min="0" />
        </el-form-item>
        <el-form-item label="商品图片">
          <el-upload action="/api/upload" list-type="picture-card" :limit="1">
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const dialogVisible = ref(false)
const isEdit = ref(false)

const products = ref([
  { id: 1, name: '无线蓝牙耳机', category: '数码配件', price: 199.00, stock: 100, status: 1, image: 'https://via.placeholder.com/60' },
  { id: 2, name: '手机壳', category: '数码配件', price: 49.00, stock: 500, status: 1, image: 'https://via.placeholder.com/60' },
  { id: 3, name: '充电宝', category: '数码配件', price: 99.00, stock: 200, status: 1, image: 'https://via.placeholder.com/60' }
])

const productForm = reactive({
  name: '',
  category: '',
  price: 0,
  stock: 0
})

const handleAdd = () => {
  isEdit.value = false
  Object.assign(productForm, { name: '', category: '', price: 0, stock: 0 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(productForm, row)
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const index = products.value.findIndex(p => p.id === row.id)
    products.value.splice(index, 1)
    ElMessage.success('删除成功')
  } catch {
    // 取消操作
  }
}

const handleSave = () => {
  dialogVisible.value = false
  ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
}
</script>

<style scoped>
.table-actions {
  display: flex;
  gap: 10px;
}
</style>
