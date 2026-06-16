<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>模板管理</span>
          <el-button type="primary" @click="showDialog()">新建模板</el-button>
        </div>
      </template>
      <el-table :data="dataList" stripe v-loading="loading">
        <el-table-column prop="code" label="编码" width="150" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="format" label="格式" width="80" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="updatedTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showDialog(row)">编辑</el-button>
            <el-button link type="primary" @click="viewSchema(row)">查看结构</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '新建模板'" width="700px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="编码" required>
          <el-input v-model="formData.code" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="格式" required>
          <el-select v-model="formData.format">
            <el-option label="XML" value="XML" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" />
        </el-form-item>
        <el-form-item label="结构定义">
          <el-input v-model="formData.schemaData" type="textarea" :rows="8" placeholder="JSON Schema 或 XML 结构" />
        </el-form-item>
        <el-form-item label="示例数据">
          <el-input v-model="formData.sampleData" type="textarea" :rows="6" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Schema Viewer -->
    <el-dialog v-model="schemaVisible" title="结构定义" width="700px">
      <pre class="schema-viewer">{{ schemaContent }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTemplateList, createTemplate, updateTemplate, deleteTemplate } from '@/api/template'

const loading = ref(false)
const dataList = ref<any[]>([])
const dialogVisible = ref(false)
const schemaVisible = ref(false)
const isEdit = ref(false)
const schemaContent = ref('')

const formData = reactive({
  id: null as number | null,
  code: '',
  name: '',
  format: 'XML',
  description: '',
  schemaData: '',
  sampleData: ''
})

const loadData = async () => {
  loading.value = true
  try {
    dataList.value = await getTemplateList() as any || []
  } finally {
    loading.value = false
  }
}

const showDialog = (row?: any) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(formData, row)
  } else {
    Object.assign(formData, { id: null, code: '', name: '', format: 'XML', description: '', schemaData: '', sampleData: '' })
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (isEdit.value) {
    await updateTemplate(formData)
  } else {
    await createTemplate(formData)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  loadData()
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定删除？', '提示')
  await deleteTemplate(row.id)
  ElMessage.success('删除成功')
  loadData()
}

const viewSchema = (row: any) => {
  schemaContent.value = row.schemaData || '(无结构定义)'
  schemaVisible.value = true
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.schema-viewer {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
