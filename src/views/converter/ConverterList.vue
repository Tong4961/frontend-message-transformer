<template>
  <div class="page-container">
    <!-- Search Bar -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="编码/名称" clearable @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="已发布" value="PUBLISHED" />
            <el-option label="已禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button type="success" @click="showCreateDialog">新建转换器</el-button>
          <el-button @click="handleImport">导入</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" style="margin-top: 12px">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="code" label="编码" width="180" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column label="格式" width="140">
          <template #default="{ row }">
            <el-tag size="small">{{ row.sourceFormat }}</el-tag>
            <el-icon style="margin: 0 4px"><Right /></el-icon>
            <el-tag size="small" type="success">{{ row.targetFormat }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goMapping(row)">映射</el-button>
            <el-button link type="primary" @click="goTest(row)">测试</el-button>
            <el-button link type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-button link type="success" v-if="row.status !== 'PUBLISHED'" @click="handlePublish(row)">发布</el-button>
            <el-button link type="warning" v-if="row.status === 'PUBLISHED'" @click="handleDisable(row)">禁用</el-button>
            <el-button link type="info" @click="handleClone(row)">克隆</el-button>
            <el-button link type="info" @click="handleExport(row)">导出</el-button>
            <el-button link type="info" @click="showVersions(row)">版本</el-button>
            <el-button link type="danger" v-if="row.status !== 'PUBLISHED'" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="loadData"
        style="margin-top: 12px; justify-content: flex-end"
      />
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑转换器' : '新建转换器'" width="600px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="编码" required>
          <el-input v-model="formData.code" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="源格式" required>
          <el-select v-model="formData.sourceFormat">
            <el-option label="XML" value="XML" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标格式" required>
          <el-select v-model="formData.targetFormat">
            <el-option label="XML" value="XML" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Versions Dialog -->
    <el-dialog v-model="versionsVisible" title="版本历史" width="700px">
      <el-table :data="versions" stripe>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column prop="createdBy" label="创建人" width="120" />
        <el-table-column prop="createdTime" label="创建时间" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleRollback(row)">回滚</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="importVisible" title="导入转换器" width="600px">
      <el-input v-model="importData" type="textarea" :rows="12" placeholder="粘贴导出的JSON数据" />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImportSubmit">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Right } from '@element-plus/icons-vue'
import {
  getConverterPage, createConverter, updateConverter, deleteConverter,
  publishConverter, disableConverter, cloneConverter, exportConverter,
  importConverter, getVersions, rollbackVersion
} from '@/api/converter'

const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const versionsVisible = ref(false)
const importVisible = ref(false)
const isEdit = ref(false)
const versions = ref<any[]>([])
const importData = ref('')

const searchForm = reactive({ keyword: '', status: '' })
const pagination = reactive({ page: 1, size: 10, total: 0 })
const formData = reactive({
  id: null as number | null,
  code: '',
  name: '',
  sourceFormat: 'XML',
  targetFormat: 'JSON',
  description: ''
})

const statusType = (s: string) => s === 'PUBLISHED' ? 'success' : s === 'DISABLED' ? 'danger' : 'info'
const statusLabel = (s: string) => ({ DRAFT: '草稿', PUBLISHED: '已发布', DISABLED: '已禁用' }[s] || s)

const loadData = async () => {
  loading.value = true
  try {
    const res: any = await getConverterPage({ page: pagination.page, size: pagination.size, ...searchForm })
    tableData.value = res.records
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(formData, { id: null, code: '', name: '', sourceFormat: 'XML', targetFormat: 'JSON', description: '' })
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (isEdit.value) {
    await updateConverter(formData)
  } else {
    await createConverter(formData)
  }
  ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
  dialogVisible.value = false
  loadData()
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定删除该转换器？', '提示')
  await deleteConverter(row.id)
  ElMessage.success('删除成功')
  loadData()
}

const handlePublish = async (row: any) => {
  await ElMessageBox.confirm('确定发布该转换器？', '提示')
  await publishConverter(row.id)
  ElMessage.success('发布成功')
  loadData()
}

const handleDisable = async (row: any) => {
  await disableConverter(row.id)
  ElMessage.success('已禁用')
  loadData()
}

const handleClone = async (row: any) => {
  await cloneConverter(row.id)
  ElMessage.success('克隆成功')
  loadData()
}

const handleExport = async (row: any) => {
  const data: any = await exportConverter(row.id)
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${row.code}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleImport = () => {
  importData.value = ''
  importVisible.value = true
}

const handleImportSubmit = async () => {
  await importConverter(importData.value)
  ElMessage.success('导入成功')
  importVisible.value = false
  loadData()
}

const showVersions = async (row: any) => {
  versions.value = await getVersions(row.id) as any
  versionsVisible.value = true
}

const handleRollback = async (row: any) => {
  await ElMessageBox.confirm(`确定回滚到版本 ${row.version}？`, '提示')
  await rollbackVersion(row.converterId, row.version)
  ElMessage.success('回滚成功')
  versionsVisible.value = false
  loadData()
}

const goMapping = (row: any) => router.push(`/converter/${row.id}/mapping`)
const goTest = (row: any) => router.push(`/converter/${row.id}/test`)

onMounted(loadData)
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}
.search-card :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
