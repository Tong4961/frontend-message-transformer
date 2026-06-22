<template>
  <div class="template-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2>模板管理</h2>
        <span class="header-desc">管理 HL7 V3、XML、JSON 消息模板</span>
      </div>
      <div class="header-right">
        <el-input v-model="searchKey" placeholder="搜索模板..." clearable style="width: 240px" @clear="loadData" @keyup.enter="handleSearch">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>搜索
        </el-button>
        <el-button type="primary" @click="showDialog()">
          <el-icon><Plus /></el-icon>新建模板
        </el-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div v-for="stat in statsCards" :key="stat.key" class="stat-card" :class="{ active: activeFormat === stat.key }" @click="filterByFormat(stat.key)">
        <div class="stat-icon" :style="{ background: stat.color }">
          <el-icon :size="20"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Filter Tabs & Actions -->
    <div class="filter-bar">
      <el-radio-group v-model="activeFormat" @change="loadData">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="HL7_V3">HL7 V3</el-radio-button>
        <el-radio-button label="XML">XML</el-radio-button>
        <el-radio-button label="JSON">JSON</el-radio-button>
      </el-radio-group>
      <div class="filter-actions">
        <el-button @click="handleImport">
          <el-icon><Upload /></el-icon>导入
        </el-button>
        <el-button @click="handleExportSelected" :disabled="selectedRows.length === 0">
          <el-icon><Download /></el-icon>导出 ({{ selectedRows.length }})
        </el-button>
      </div>
    </div>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table :data="dataList" stripe v-loading="loading" style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getFormatTagType(row.format)" size="small">
              {{ getFormatLabel(row.format) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Root" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="root-text">{{ extractRoot(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <template v-if="row.tags">
              <el-tag v-for="tag in parseTags(row.tags)" :key="tag" size="small" style="margin: 2px" type="info">{{ tag }}</el-tag>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="updatedTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editTemplate(row)">编辑</el-button>
            <el-button link type="primary" @click="viewStructure(row)">查看结构</el-button>
            <el-button link type="primary" @click="copyTemplate(row)">复制</el-button>
            <el-button link type="success" @click="handleExport(row)">导出</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <span class="pagination-info">共 {{ pagination.total }} 条</span>
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="sizes, prev, pager, next, jumper"
          background
          @current-change="(val: number) => { pagination.page = val; loadData() }"
          @size-change="(val: number) => { pagination.size = val; pagination.page = 1; loadData() }"
        />
      </div>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '新建模板'" width="700px">
      <el-tabs v-model="dialogTab">
        <!-- Tab 1: Basic Info -->
        <el-tab-pane label="基础信息" name="basic">
          <el-form :model="formData" label-width="100px">
            <el-form-item label="模板编码" required>
              <el-input v-model="formData.code" :disabled="isEdit" placeholder="请输入模板编码" />
            </el-form-item>
            <el-form-item label="模板名称" required>
              <el-input v-model="formData.name" placeholder="请输入模板名称" />
            </el-form-item>
            <el-form-item label="模板类型" required>
              <el-radio-group v-model="formData.format" :disabled="isEdit">
                <el-radio-button label="HL7_V3">HL7 V3</el-radio-button>
                <el-radio-button label="XML">XML</el-radio-button>
                <el-radio-button label="JSON">JSON</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入描述" />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="formData.tags" placeholder="多个标签用逗号分隔" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab 2: Sample Data -->
        <el-tab-pane label="示例数据" name="sample">
          <el-form :model="formData" label-width="100px">
            <el-form-item label="结构定义">
              <el-input v-model="formData.schemaData" type="textarea" :rows="8" placeholder="粘贴 XML 或 JSON 结构定义（XSD/Schema）" />
            </el-form-item>
            <el-form-item label="示例数据">
              <el-input v-model="formData.sampleData" type="textarea" :rows="8" placeholder="粘贴 XML 或 JSON 内容" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab 3: Data Structure -->
        <el-tab-pane label="数据结构" name="structure">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span>数据结构</span>
            <el-button size="small" @click="refreshDialogStructure" :loading="parsingStructure">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
          </div>
          <div v-if="dialogStructureTree.length > 0" style="height: 400px; overflow-y: auto;">
            <el-tree :data="dialogStructureTree" node-key="path" default-expand-all :props="{ label: 'name', children: 'children' }">
              <template #default="{ data }">
                <div class="tree-node">
                  <span class="node-name">{{ data.name }}</span>
                  <span class="node-path">{{ data.path }}</span>
                  <el-tag v-if="data.dataType" size="small" type="info">{{ data.dataType }}</el-tag>
                  <el-tag v-if="data.array" size="small" type="warning">数组</el-tag>
                </div>
              </template>
            </el-tree>
          </div>
          <el-empty v-else description="暂无数据结构，请先添加示例数据" />
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Structure Viewer Dialog -->
    <el-dialog v-model="structureVisible" title="数据结构" width="500px">
      <div style="height: 500px; overflow-y: auto;">
        <el-tree :data="structureTree" node-key="path" default-expand-all :props="{ label: 'name', children: 'children' }">
          <template #default="{ data }">
            <div class="tree-node">
              <span class="node-name">{{ data.name }}</span>
              <span class="node-type">{{ data.dataType || data.nodeType }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="importVisible" title="导入模板" width="700px">
      <el-tabs v-model="importTab">
        <el-tab-pane label="粘贴数据" name="paste">
          <el-input v-model="importData" type="textarea" :rows="10" placeholder="粘贴导出的JSON数据" @input="parseImportData" />
        </el-tab-pane>
        <el-tab-pane label="选择文件" name="file">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".json"
            :on-change="handleFileChange"
            :on-exceed="() => ElMessage.warning('只能上传一个文件')"
            drag
          >
            <el-icon style="font-size: 40px; color: #909399"><Upload /></el-icon>
            <div style="margin-top: 8px">将 JSON 文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div style="color: #909399; font-size: 12px">仅支持 .json 文件</div>
            </template>
          </el-upload>
        </el-tab-pane>
      </el-tabs>

      <!-- Preview -->
      <div v-if="importPreviewList.length > 0" style="margin-top: 16px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
          <span style="font-weight: 500">预览（{{ importPreviewList.length }} 个模板）</span>
          <el-checkbox v-model="importSelectAll" @change="handleSelectAll">全选</el-checkbox>
        </div>
        <el-table :data="importPreviewList" stripe max-height="250" style="width: 100%" @selection-change="handleImportSelectionChange">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="code" label="编码" width="120" />
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="format" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="getFormatTagType(row.format)" size="small">{{ getFormatLabel(row.format) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImportSubmit" :disabled="importSelectedRows.length === 0">
          导入 ({{ importSelectedRows.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Upload, Download, Document, Folder, List, Refresh } from '@element-plus/icons-vue'
import { getTemplateList, getTemplatePage, getTemplateStats, getTemplateById, createTemplate, updateTemplate, deleteTemplate, exportTemplate, importTemplate } from '@/api/template'
import { parseStructure } from '@/api/transform'
import request from '@/api/request'

const router = useRouter()

const loading = ref(false)
const dataList = ref<any[]>([])
const searchKey = ref('')
const activeFormat = ref('')
const dialogVisible = ref(false)
const structureVisible = ref(false)
const isEdit = ref(false)
const structureTree = ref<any[]>([])
const dialogTab = ref('basic')
const parsingStructure = ref(false)
const dialogStructureTree = ref<any[]>([])
const selectedRows = ref<any[]>([])
const pagination = reactive({ page: 1, size: 10, total: 0 })

// Stats
const stats = reactive({
  total: 0,
  HL7_V3: 0,
  XML: 0,
  JSON: 0
})

const statsCards = computed(() => [
  { key: '', label: '总模板', value: stats.total, icon: 'List', color: '#409eff' },
  { key: 'HL7_V3', label: 'HL7 V3', value: stats.HL7_V3, icon: 'Document', color: '#7c3aed' },
  { key: 'XML', label: 'XML', value: stats.XML, icon: 'Document', color: '#10b981' },
  { key: 'JSON', label: 'JSON', value: stats.JSON, icon: 'Document', color: '#3b82f6' }
])

const formData = reactive({
  id: null as number | null,
  code: '',
  name: '',
  format: 'XML',
  description: '',
  tags: '',
  schemaData: '',
  sampleData: ''
})

// Selection change
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// Load data
const loadData = async () => {
  loading.value = true
  try {
    const res: any = await getTemplatePage({
      page: pagination.page,
      size: pagination.size,
      format: activeFormat.value || undefined,
      keyword: searchKey.value || undefined
    })
    dataList.value = res.records || []
    pagination.total = Number(res.total) || 0
    updateStats()
  } finally {
    loading.value = false
  }
}

// Search
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// Filter by format
const filterByFormat = (format: string) => {
  activeFormat.value = activeFormat.value === format ? '' : format
  pagination.page = 1
  loadData()
}

const updateStats = async () => {
  try {
    const res: any = await getTemplateStats()
    Object.assign(stats, res)
  } catch (e) {
    // ignore
  }
}

// Parse tags
const parseTags = (tags: string) => {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(t => t)
}

// Refresh dialog structure
const refreshDialogStructure = async () => {
  const data = formData.schemaData || formData.sampleData
  if (!data) {
    dialogStructureTree.value = []
    return
  }
  parsingStructure.value = true
  try {
    const format = formData.format === 'HL7_V3' ? 'XML' : formData.format
    dialogStructureTree.value = await parseStructure({ data, format }) as any || []
  } catch (e: any) {
    ElMessage.error('解析结构失败: ' + e.message)
    dialogStructureTree.value = []
  } finally {
    parsingStructure.value = false
  }
}

// Format helpers
const getFormatTagType = (format: string) => {
  if (format === 'HL7_V3') return 'danger'
  if (format === 'XML') return 'success'
  if (format === 'JSON') return 'primary'
  return 'info'
}

const getFormatLabel = (format: string) => {
  if (format === 'HL7_V3') return 'HL7 V3'
  return format
}

// Extract root element name
const extractRoot = (row: any) => {
  if (!row.schemaData) return '-'
  try {
    if (row.format === 'JSON') {
      const json = JSON.parse(row.schemaData)
      return Object.keys(json)[0] || '-'
    } else {
      // XML: extract root element
      const match = row.schemaData.match(/<([a-zA-Z_][\w.-]*)/)
      return match ? match[1] : '-'
    }
  } catch {
    return '-'
  }
}

// Show dialog
const showDialog = (row?: any) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(formData, {
      id: row.id,
      code: row.code,
      name: row.name,
      format: row.format,
      description: row.description || '',
      tags: row.tags || '',
      schemaData: row.schemaData || '',
      sampleData: row.sampleData || ''
    })
  } else {
    Object.assign(formData, {
      id: null,
      code: '',
      name: '',
      format: 'XML',
      description: '',
      tags: '',
      schemaData: '',
      sampleData: ''
    })
  }
  dialogTab.value = 'basic'
  dialogStructureTree.value = []
  dialogVisible.value = true
}

// Submit
const handleSubmit = async () => {
  if (!formData.name || !formData.code) {
    ElMessage.warning('请填写必填项')
    return
  }

  // Auto generate schemaData from sampleData
  if (formData.sampleData && !formData.schemaData) {
    formData.schemaData = formData.sampleData
  }

  if (isEdit.value) {
    await updateTemplate(formData)
  } else {
    await createTemplate(formData)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  loadData()
}

// Edit template
const editTemplate = (row: any) => {
  router.push(`/template/${row.id}/edit`)
}

// View structure
const viewStructure = async (row: any) => {
  try {
    const data = await request.get(`/template/${row.id}/structure`)
    structureTree.value = data as any || []
    structureVisible.value = true
  } catch (e: any) {
    ElMessage.error('获取结构失败: ' + e.message)
  }
}

// Copy template
const copyTemplate = (row: any) => {
  Object.assign(formData, {
    id: null,
    code: row.code + '_copy',
    name: row.name + '(副本)',
    format: row.format,
    description: row.description || '',
    tags: row.tags || '',
    schemaData: row.schemaData || '',
    sampleData: row.sampleData || ''
  })
  isEdit.value = false
  dialogVisible.value = true
}

// Delete
const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定删除该模板？', '提示', { type: 'warning' })
  await deleteTemplate(row.id)
  ElMessage.success('删除成功')
  loadData()
}

// Import
const importVisible = ref(false)
const importTab = ref('paste')
const importData = ref('')
const uploadRef = ref()
const importPreviewList = ref<any[]>([])
const importSelectedRows = ref<any[]>([])
const importSelectAll = ref(true)

const handleImport = () => {
  importData.value = ''
  importTab.value = 'paste'
  importPreviewList.value = []
  importSelectedRows.value = []
  importSelectAll.value = true
  importVisible.value = true
  nextTick(() => {
    uploadRef.value?.clearFiles()
  })
}

const parseImportData = () => {
  try {
    const parsed = JSON.parse(importData.value)
    importPreviewList.value = Array.isArray(parsed) ? parsed : [parsed]
    importSelectedRows.value = [...importPreviewList.value]
    importSelectAll.value = true
  } catch {
    importPreviewList.value = []
    importSelectedRows.value = []
  }
}

const handleFileChange = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    importData.value = e.target?.result as string
    parseImportData()
    importTab.value = 'paste'
  }
  reader.readAsText(file.raw)
}

const handleSelectAll = (val: boolean) => {
  importSelectedRows.value = val ? [...importPreviewList.value] : []
}

const handleImportSelectionChange = (rows: any[]) => {
  importSelectedRows.value = rows
  importSelectAll.value = rows.length === importPreviewList.value.length
}

const handleImportSubmit = async () => {
  if (importSelectedRows.value.length === 0) {
    ElMessage.warning('请选择要导入的模板')
    return
  }
  try {
    let successCount = 0
    let failCount = 0
    for (const item of importSelectedRows.value) {
      try {
        await importTemplate(item)
        successCount++
      } catch {
        failCount++
      }
    }
    if (failCount === 0) {
      ElMessage.success(`导入成功，共 ${successCount} 个模板`)
      importVisible.value = false
      loadData()
    } else {
      ElMessage.warning(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    }
  } catch (e: any) {
    ElMessage.error('导入失败: ' + (e.message || '数据格式错误'))
  }
}

// Export single template
const handleExport = async (row: any) => {
  try {
    const data: any = await exportTemplate(row.id)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template_${row.code}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error('导出失败: ' + e.message)
  }
}

// Export selected templates
const handleExportSelected = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要导出的模板')
    return
  }
  try {
    const list = selectedRows.value.map(t => ({
      code: t.code,
      name: t.name,
      format: t.format,
      description: t.description,
      tags: t.tags,
      schemaData: t.schemaData,
      sampleData: t.sampleData
    }))
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `templates_export.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功，共 ' + list.length + ' 个模板')
  } catch (e: any) {
    ElMessage.error('导出失败: ' + e.message)
  }
}

onMounted(loadData)
</script>

<style scoped>
.template-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 80px);
  overflow: visible;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.header-desc {
  font-size: 13px;
  color: #909399;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

/* Table Card */
.table-card {
  border-radius: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0 0;
  margin-top: 16px;
  border-top: 1px solid #ebeef5;
}
.pagination-info {
  font-size: 13px;
  color: #606266;
}

.root-text {
  font-family: monospace;
  color: #606266;
}

/* Tree Node */
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.node-name {
  font-weight: 500;
}

.node-path {
  font-size: 11px;
  color: #909399;
  margin-left: auto;
  margin-right: 8px;
}

.node-type {
  font-size: 11px;
  color: #909399;
  background: #f0f2f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.text-muted {
  color: #909399;
}
</style>
