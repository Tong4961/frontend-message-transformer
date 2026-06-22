<template>
  <div class="template-edit-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="router.back()" icon="ArrowLeft">返回</el-button>
        <el-divider direction="vertical" />
        <h3>{{ template?.name || '编辑模板' }}</h3>
        <el-tag v-if="template?.format" :type="getFormatTagType(template.format)" size="small" style="margin-left: 8px">
          {{ getFormatLabel(template.format) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon>保存
        </el-button>
      </div>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="edit-tabs">
      <!-- Tab 1: Basic Info -->
      <el-tab-pane label="基础信息" name="basic">
        <el-card shadow="never">
          <el-form :model="formData" label-width="100px" style="max-width: 600px">
            <el-form-item label="模板编码">
              <el-input v-model="formData.code" disabled />
            </el-form-item>
            <el-form-item label="模板名称" required>
              <el-input v-model="formData.name" />
            </el-form-item>
            <el-form-item label="模板类型">
              <el-input :value="getFormatLabel(formData.format)" disabled />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="formData.description" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="formData.tags" placeholder="多个标签用逗号分隔" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: Sample Data -->
      <el-tab-pane label="示例数据" name="sample">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>示例数据</span>
              <el-button size="small" @click="refreshStructure" :loading="parsingStructure">
                <el-icon><Refresh /></el-icon>重新解析
              </el-button>
            </div>
          </template>
          <el-form label-width="100px">
            <el-form-item label="结构定义">
              <el-input v-model="formData.schemaData" type="textarea" :rows="10" placeholder="粘贴 XML 或 JSON 结构定义（XSD/Schema）" />
            </el-form-item>
            <el-form-item label="示例数据">
              <el-input v-model="formData.sampleData" type="textarea" :rows="10" placeholder="粘贴 XML 或 JSON 内容" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- Tab 3: Data Structure -->
      <el-tab-pane label="数据结构" name="structure">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>数据结构</span>
              <el-button size="small" @click="refreshStructure" :loading="parsingStructure">
                <el-icon><Refresh /></el-icon>刷新
              </el-button>
            </div>
          </template>
          <div v-if="structureTree.length > 0" class="structure-tree">
            <el-tree :data="structureTree" node-key="path" default-expand-all :props="{ label: 'name', children: 'children' }">
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
        </el-card>
      </el-tab-pane>

      <!-- Tab 4: Search Fields -->
      <el-tab-pane label="检索条件" name="searchFields">
        <div class="search-fields-container">
          <!-- Left: Structure Tree -->
          <el-card shadow="never" class="tree-card">
            <template #header>
              <div class="card-header">
                <span>模板结构</span>
                <el-button size="small" @click="refreshStructure" :loading="parsingStructure">
                  <el-icon><Refresh /></el-icon>刷新
                </el-button>
              </div>
            </template>
            <div v-if="structureTree.length > 0">
              <div class="panel-search">
                <el-input v-model="nodeSearch" placeholder="搜索节点" clearable size="small" />
              </div>
              <div class="tree-container">
                <el-tree
                  ref="searchTreeRef"
                  :data="structureTree"
                  node-key="path"
                  default-expand-all
                  :props="{ label: 'name', children: 'children' }"
                  highlight-current
                  :filter-node-method="filterNode"
                  @node-click="handleNodeClick"
                >
                  <template #default="{ data }">
                    <div class="tree-node">
                      <span class="node-name">{{ data.name }}</span>
                      <el-tag v-if="isFieldConfigured(data.path)" size="small" type="warning" style="margin-left: 4px">
                        <el-icon><Star /></el-icon>检索
                      </el-tag>
                    </div>
                  </template>
                </el-tree>
              </div>
            </div>
            <el-empty v-else description="暂无数据结构，请先添加示例数据" />
          </el-card>

          <!-- Right: Field Config -->
          <el-card shadow="never" class="config-card">
            <template #header>
              <span>节点属性配置</span>
            </template>
            <div v-if="selectedNode">
              <el-form :model="fieldForm" label-width="100px">
                <!-- Basic Info (Readonly) -->
                <el-form-item label="节点名称">
                  <el-input :model-value="selectedNode.name" disabled />
                </el-form-item>
                <el-form-item label="节点路径">
                  <el-input :model-value="selectedNode.path" disabled />
                </el-form-item>

                <el-divider />

                <!-- Search Config -->
                <el-form-item label="设为检索条件">
                  <el-switch v-model="fieldForm.enabled" @change="handleEnabledChange" />
                </el-form-item>

                <template v-if="fieldForm.enabled">
                  <el-form-item label="检索编码" required>
                    <el-input v-model="fieldForm.fieldCode" placeholder="如: idCard" />
                  </el-form-item>
                  <el-form-item label="检索名称" required>
                    <el-input v-model="fieldForm.fieldName" placeholder="如: 身份证号" />
                  </el-form-item>

                  <el-divider />

                  <el-form-item label="描述">
                    <el-input v-model="fieldForm.description" type="textarea" :rows="2" placeholder="字段描述" />
                  </el-form-item>
                </template>
              </el-form>
            </div>
            <el-empty v-else description="请从左侧选择一个节点" />
          </el-card>
        </div>

        <!-- Bottom: Configured Fields Table -->
        <el-card shadow="never" style="margin-top: 16px">
          <template #header>
            <span>已配置检索条件</span>
          </template>
          <el-table :data="searchFields" stripe style="width: 100%" @row-click="handleEditField" highlight-current-row>
            <el-table-column prop="fieldCode" label="编码" width="150" />
            <el-table-column prop="fieldName" label="名称" width="150" />
            <el-table-column prop="fieldPath" label="路径" min-width="250" show-overflow-tooltip />
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleEditField(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDeleteField(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Check, Refresh, Star } from '@element-plus/icons-vue'
import { getTemplateById, updateTemplate, getSearchFields, saveSearchFields } from '@/api/template'
import { parseStructure } from '@/api/transform'

const router = useRouter()
const route = useRoute()

const templateId = route.params.id as string
const template = ref<any>(null)
const activeTab = ref('basic')
const saving = ref(false)
const parsingStructure = ref(false)
const structureTree = ref<any[]>([])
const searchFields = ref<any[]>([])
const selectedNode = ref<any>(null)
const searchTreeRef = ref<any>(null)
const nodeSearch = ref('')

const formData = reactive({
  id: templateId as string | null,
  code: '',
  name: '',
  format: 'XML',
  description: '',
  tags: '',
  schemaData: '',
  sampleData: ''
})

const fieldForm = reactive({
  enabled: false,
  fieldCode: '',
  fieldName: '',
  fieldType: 'String',
  uniqueFlag: false,
  fuzzyFlag: false,
  description: ''
})

// Check if a field is configured
const isFieldConfigured = (path: string) => {
  return searchFields.value.some(f => f.fieldPath === path)
}

// Load template
const loadTemplate = async () => {
  try {
    const data = await getTemplateById(templateId) as any
    if (!data) {
      ElMessage.error('模板不存在')
      router.back()
      return
    }
    template.value = data
    Object.assign(formData, {
      id: data.id,
      code: data.code || '',
      name: data.name || '',
      format: data.format || 'XML',
      description: data.description || '',
      tags: data.tags || '',
      schemaData: data.schemaData || '',
      sampleData: data.sampleData || ''
    })
    // Auto load structure
    if (formData.schemaData || formData.sampleData) {
      await refreshStructure()
    }
    // Load search fields
    await loadSearchFields()
  } catch (e: any) {
    ElMessage.error('加载模板失败: ' + e.message)
  }
}

// Load search fields
const loadSearchFields = async () => {
  try {
    const data = await getSearchFields(templateId) as any
    searchFields.value = data || []
  } catch (e: any) {
    console.error('加载检索条件失败:', e)
  }
}

// Save template
const handleSave = async () => {
  if (!formData.name) {
    ElMessage.warning('请填写模板名称')
    return
  }
  saving.value = true
  try {
    await updateTemplate(formData)
    // 保存检索条件
    await saveSearchFields(templateId, searchFields.value)
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

// Refresh structure
const refreshStructure = async () => {
  const data = formData.schemaData || formData.sampleData
  if (!data) {
    structureTree.value = []
    return
  }
  parsingStructure.value = true
  try {
    const format = formData.format === 'HL7_V3' ? 'XML' : formData.format
    structureTree.value = await parseStructure({ data, format }) as any || []
  } catch (e: any) {
    ElMessage.error('解析结构失败: ' + e.message)
    structureTree.value = []
  } finally {
    parsingStructure.value = false
  }
}

// Handle node click
const handleNodeClick = (data: any) => {
  selectedNode.value = data
  // Check if this node already has a field config
  const existing = searchFields.value.find(f => f.fieldPath === data.path)
  if (existing) {
    Object.assign(fieldForm, {
      enabled: true,
      fieldCode: existing.fieldCode,
      fieldName: existing.fieldName,
      fieldType: existing.fieldType || 'String',
      uniqueFlag: existing.uniqueFlag || false,
      fuzzyFlag: existing.fuzzyFlag || false,
      description: existing.description || ''
    })
  } else {
    Object.assign(fieldForm, {
      enabled: false,
      fieldCode: '',
      fieldName: '',
      fieldType: guessFieldType(data),
      uniqueFlag: false,
      fuzzyFlag: false,
      description: ''
    })
  }
}

// Guess field type based on node name
const guessFieldType = (node: any) => {
  const name = node.name?.toLowerCase() || ''
  if (name.includes('date') || name.includes('time')) return 'Date'
  if (name.includes('id') || name.includes('count') || name.includes('num') || name.includes('age')) return 'Number'
  if (name.includes('flag') || name.includes('is') || name.includes('has')) return 'Boolean'
  return 'String'
}

// Handle enabled change - auto add/remove from searchFields
const handleEnabledChange = (val: boolean) => {
  if (!selectedNode.value) return

  if (val) {
    // Auto generate field code from node name
    fieldForm.fieldCode = selectedNode.value.name
    fieldForm.fieldName = selectedNode.value.name
    // Auto add to searchFields
    const fieldData = {
      fieldCode: fieldForm.fieldCode,
      fieldName: fieldForm.fieldName,
      fieldPath: selectedNode.value.path,
      fieldType: fieldForm.fieldType,
      uniqueFlag: fieldForm.uniqueFlag,
      fuzzyFlag: fieldForm.fuzzyFlag,
      description: fieldForm.description
    }
    const existingIndex = searchFields.value.findIndex(f => f.fieldPath === selectedNode.value.path)
    if (existingIndex >= 0) {
      searchFields.value[existingIndex] = fieldData
    } else {
      searchFields.value.push(fieldData)
    }
  } else {
    // Remove from searchFields
    searchFields.value = searchFields.value.filter(f => f.fieldPath !== selectedNode.value?.path)
  }
}

// Sync fieldForm changes to searchFields automatically
watch(() => [fieldForm.fieldCode, fieldForm.fieldName, fieldForm.description], () => {
  if (!fieldForm.enabled || !selectedNode.value) return

  const index = searchFields.value.findIndex(f => f.fieldPath === selectedNode.value.path)
  if (index >= 0) {
    searchFields.value[index] = {
      ...searchFields.value[index],
      fieldCode: fieldForm.fieldCode,
      fieldName: fieldForm.fieldName,
      description: fieldForm.description
    }
  }
})

// Tree search
watch(nodeSearch, (val) => {
  searchTreeRef.value?.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase()) ||
         data.path.toLowerCase().includes(value.toLowerCase())
}

// Reset field and remove from searchFields
const handleResetField = () => {
  if (selectedNode.value) {
    searchFields.value = searchFields.value.filter(f => f.fieldPath !== selectedNode.value.path)
  }
  Object.assign(fieldForm, {
    enabled: false,
    fieldCode: '',
    fieldName: '',
    fieldType: 'String',
    uniqueFlag: false,
    fuzzyFlag: false,
    description: ''
  })
}

// Edit field from table
const handleEditField = (row: any) => {
  // Find and select the node
  const node = findNodeByPath(structureTree.value, row.fieldPath)
  if (node) {
    selectedNode.value = node
    Object.assign(fieldForm, {
      enabled: true,
      fieldCode: row.fieldCode,
      fieldName: row.fieldName,
      fieldType: row.fieldType || 'String',
      uniqueFlag: row.uniqueFlag || false,
      fuzzyFlag: row.fuzzyFlag || false,
      description: row.description || ''
    })
  }
}

// Delete field (local only, save on top save button)
const handleDeleteField = async (row: any) => {
  await ElMessageBox.confirm('确定删除该检索条件？', '提示', { type: 'warning' })
  searchFields.value = searchFields.value.filter(f => f.fieldPath !== row.fieldPath)
  // Reset form if current node was deleted
  if (selectedNode.value?.path === row.fieldPath) {
    handleResetField()
  }
}

// Find node by path in tree
const findNodeByPath = (tree: any[], path: string): any => {
  for (const node of tree) {
    if (node.path === path) return node
    if (node.children) {
      const found = findNodeByPath(node.children, path)
      if (found) return found
    }
  }
  return null
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

// Watch selectedNode to highlight in tree
watch(selectedNode, (newNode) => {
  if (newNode) {
    setTimeout(() => {
      if (searchTreeRef.value) {
        searchTreeRef.value.setCurrentKey(newNode.path)
      }
    }, 100)
  }
})

onMounted(loadTemplate)
</script>

<style scoped>
.template-edit-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
}

.edit-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 0 20px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.structure-tree {
  max-height: 600px;
  overflow-y: auto;
}

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

/* Search Fields Layout */
.search-fields-container {
  display: flex;
  gap: 16px;
}

.tree-card {
  flex: 1;
  min-width: 0;
}

.panel-search {
  margin-bottom: 12px;
}

.tree-card .tree-container {
  max-height: 500px;
  overflow-y: auto;
}

.config-card {
  flex: 1;
  min-width: 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style>
