<template>
  <div class="template-edit-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="router.back()" icon="ArrowLeft">返回</el-button>
        <el-divider direction="vertical" />
        <h3>{{ isCreate ? '新建模板' : (template?.name || '编辑模板') }}</h3>
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
            <el-form-item label="模板编码" required>
              <el-input v-model="formData.code" :disabled="!isCreate" placeholder="请输入模板编码" />
            </el-form-item>
            <el-form-item label="模板名称" required>
              <el-input v-model="formData.name" />
            </el-form-item>
            <el-form-item label="模板类型" required>
              <el-radio-group v-model="formData.format" :disabled="!isCreate">
                <el-radio-button label="HL7_V3">HL7 V3</el-radio-button>
                <el-radio-button label="XML">XML</el-radio-button>
                <el-radio-button label="JSON">JSON</el-radio-button>
              </el-radio-group>
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
        <div class="structure-container">
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
                <el-input v-model="structTreeSearch" placeholder="搜索节点" clearable size="small" />
              </div>
              <div class="tree-container">
                <el-tree
                  ref="structTreeRef"
                  :data="structureTree"
                  node-key="path"
                  default-expand-all
                  :props="{ label: 'name', children: 'children' }"
                  highlight-current
                  :filter-node-method="filterNode"
                  @node-click="handleStructNodeClick"
                >
                  <template #default="{ data }">
                    <div class="tree-node">
                      <span class="node-name">{{ data.name }}</span>
                      <el-tag v-if="isFieldConfigured(data.path)" size="small" type="primary" style="margin-left: 4px">Search</el-tag>
                      <el-tag v-if="isLoopNode(data.path)" size="small" type="success" style="margin-left: 4px">Loop</el-tag>
                      <el-tag v-if="getConstraintTag(data.path, 'Enum')" size="small" type="success" style="margin-left: 4px">Enum</el-tag>
                      <el-tag v-if="getConstraintTag(data.path, 'Boolean')" size="small" style="margin-left: 4px; --el-tag-bg-color: #e6f7ff; --el-tag-text-color: #1890ff; --el-tag-border-color: #91d5ff">Bool</el-tag>
                      <el-tag v-if="getConstraintTag(data.path, 'Date')" size="small" type="warning" style="margin-left: 4px">Date</el-tag>
                      <el-tag v-if="getConstraintTag(data.path, 'DateTime')" size="small" type="danger" style="margin-left: 4px">DateTime</el-tag>
                    </div>
                  </template>
                </el-tree>
              </div>
            </div>
            <el-empty v-else description="暂无数据结构，请先添加示例数据" />
          </el-card>

          <!-- Right: Node Config -->
          <el-card shadow="never" class="config-card">
            <template #header>
              <span>节点属性配置</span>
            </template>
            <div v-if="structSelectedNode">
              <el-scrollbar max-height="calc(100vh - 260px)">
                <el-form :model="constraintForm" label-width="100px">
                  <!-- Section 1: Basic Info -->
                  <div class="config-section-title">基础信息</div>
                  <el-form-item label="节点名称">
                    <el-input :model-value="structSelectedNode.name" disabled />
                  </el-form-item>
                  <el-form-item label="节点路径">
                    <el-input :model-value="structSelectedNode.path" disabled />
                  </el-form-item>
                  <el-form-item label="节点类型">
                    <el-input :model-value="structSelectedNode.dataType || 'String'" disabled />
                  </el-form-item>

                  <el-divider />

                  <!-- Section 2: Business Attributes -->
                  <div class="config-section-title">业务属性</div>
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
                    <el-form-item label="描述">
                      <el-input v-model="fieldForm.description" type="textarea" :rows="2" />
                    </el-form-item>
                  </template>
                  <el-form-item label="循环节点">
                    <el-switch v-model="loopForm.isLoop" @change="handleLoopChange" />
                  </el-form-item>
                  <template v-if="loopForm.isLoop">
                    <el-form-item label="循环编码" required>
                      <el-input v-model="loopForm.loopCode" placeholder="如: providerLoop" />
                    </el-form-item>
                    <el-form-item label="循环层级">
                      <el-input-number v-model="loopForm.loopLevel" :min="1" :max="10" />
                    </el-form-item>
                    <el-form-item label="父循环编码">
                      <el-select v-model="loopForm.parentLoopCode" clearable placeholder="选择父循环" style="width: 100%">
                        <el-option v-for="cfg in parentNodeConfigs" :key="cfg.loopCode" :label="`${cfg.loopCode} (${cfg.nodePath})`" :value="cfg.loopCode" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="条件过滤">
                      <el-switch v-model="loopForm.enableCondition" />
                    </el-form-item>
                    <el-form-item v-if="loopForm.enableCondition" label="条件表达式">
                      <el-input v-model="loopForm.conditionExpression" placeholder="如: @typeCode='PRN'" />
                    </el-form-item>
                    <el-form-item label="循环说明">
                      <el-input v-model="loopForm.loopDescription" type="textarea" :rows="2" />
                    </el-form-item>
                  </template>

                  <el-divider />

                  <!-- Section 3: Data Constraints -->
                  <div class="config-section-title">数据约束</div>
                  <el-form-item label="数据类型">
                    <el-select v-model="constraintForm.dataType" clearable placeholder="选择数据类型" style="width: 100%">
                      <el-option label="String" value="String" />
                      <el-option label="Number" value="Number" />
                      <el-option label="Boolean" value="Boolean" />
                      <el-option label="Enum" value="Enum" />
                      <el-option label="Date" value="Date" />
                      <el-option label="Time" value="Time" />
                      <el-option label="DateTime" value="DateTime" />
                      <el-option label="DT15" value="DT15" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="是否必填">
                    <el-switch v-model="constraintForm.requiredFlag" />
                  </el-form-item>
                  <el-form-item label="默认值">
                    <el-input v-model="constraintForm.defaultValue" placeholder="默认值" />
                  </el-form-item>

                  <!-- Boolean Format -->
                  <template v-if="constraintForm.dataType === 'Boolean'">
                    <el-form-item label="布尔格式">
                      <el-select v-model="constraintForm.booleanFormat" style="width: 100%">
                        <el-option label="true / false" value="true_false" />
                        <el-option label="Y / N" value="Y_N" />
                        <el-option label="1 / 0" value="1_0" />
                        <el-option label="是 / 否" value="是否" />
                      </el-select>
                    </el-form-item>
                  </template>

                  <!-- Date Format -->
                  <template v-if="constraintForm.dataType === 'Date'">
                    <el-form-item label="日期格式">
                      <el-select v-model="constraintForm.formatPattern" style="width: 100%">
                        <el-option label="yyyy-MM-dd" value="yyyy-MM-dd" />
                        <el-option label="yyyyMMdd" value="yyyyMMdd" />
                        <el-option label="yyyy/MM/dd" value="yyyy/MM/dd" />
                      </el-select>
                    </el-form-item>
                  </template>

                  <!-- Time Format -->
                  <template v-if="constraintForm.dataType === 'Time'">
                    <el-form-item label="时间格式">
                      <el-select v-model="constraintForm.formatPattern" style="width: 100%">
                        <el-option label="HH:mm:ss" value="HH:mm:ss" />
                        <el-option label="HHmmss" value="HHmmss" />
                      </el-select>
                    </el-form-item>
                  </template>

                  <!-- DateTime Format -->
                  <template v-if="constraintForm.dataType === 'DateTime'">
                    <el-form-item label="日期时间格式">
                      <el-select v-model="constraintForm.formatPattern" style="width: 100%">
                        <el-option label="yyyy-MM-dd HH:mm:ss" value="yyyy-MM-dd HH:mm:ss" />
                        <el-option label="yyyyMMddHHmmss" value="yyyyMMddHHmmss" />
                        <el-option label="yyyy-MM-dd'T'HH:mm:ss" value="yyyy-MM-dd'T'HH:mm:ss" />
                      </el-select>
                    </el-form-item>
                  </template>

                  <!-- DT15 Format -->
                  <template v-if="constraintForm.dataType === 'DT15'">
                    <el-form-item label="格式说明">
                      <el-tag type="info">yyyyMMddHHmmss（如 20260622143025）</el-tag>
                    </el-form-item>
                  </template>

                  <!-- Enum Config -->
                  <template v-if="constraintForm.dataType === 'Enum'">
                    <el-form-item label="枚举值">
                      <div style="width: 100%">
                        <el-button size="small" type="primary" @click="addEnumItem" style="margin-bottom: 8px">添加枚举值</el-button>
                        <el-table :data="constraintForm.enumConfig" border size="small" style="width: 100%">
                          <el-table-column label="值" min-width="120">
                            <template #default="{ row }">
                              <el-input v-model="row.value" size="small" placeholder="值" />
                            </template>
                          </el-table-column>
                          <el-table-column label="显示名称" min-width="120">
                            <template #default="{ row }">
                              <el-input v-model="row.label" size="small" placeholder="显示名称" />
                            </template>
                          </el-table-column>
                          <el-table-column label="操作" width="70">
                            <template #default="{ $index }">
                              <el-button link type="danger" size="small" @click="constraintForm.enumConfig.splice($index, 1)">删除</el-button>
                            </template>
                          </el-table-column>
                        </el-table>
                      </div>
                    </el-form-item>
                  </template>

                  <el-divider />

                  <!-- Section 4: Example Preview -->
                  <div class="config-section-title">示例预览</div>
                  <el-tabs v-model="previewTab" type="border-card" size="small">
                    <el-tab-pane label="JSON" name="json">
                      <pre class="preview-content">{{ previewJson }}</pre>
                    </el-tab-pane>
                    <el-tab-pane label="XML" name="xml">
                      <pre class="preview-content">{{ previewXml }}</pre>
                    </el-tab-pane>
                    <el-tab-pane label="原始值" name="raw">
                      <pre class="preview-content">{{ previewRaw }}</pre>
                    </el-tab-pane>
                  </el-tabs>
                </el-form>
              </el-scrollbar>
            </div>
            <el-empty v-else description="请从左侧选择一个节点" />
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue'
import { getTemplateById, createTemplate, updateTemplate, getSearchFields, saveSearchFields, getNodeConfigs, saveNodeConfigs, getNodeConstraints, saveNodeConstraints } from '@/api/template'
import { parseStructure } from '@/api/transform'

const router = useRouter()
const route = useRoute()

const templateId = route.params.id as string || ''
const isCreate = !templateId
const template = ref<any>(null)
const activeTab = ref('basic')
const saving = ref(false)
const parsingStructure = ref(false)
const structureTree = ref<any[]>([])
const searchFields = ref<any[]>([])
const nodeConfigs = ref<any[]>([])
const structTreeRef = ref<any>(null)
const structTreeSearch = ref('')
const structSelectedNode = ref<any>(null)
const nodeConstraints = ref<any[]>([])
const previewTab = ref('json')

const constraintForm = reactive({
  dataType: '',
  requiredFlag: false,
  defaultValue: '',
  formatPattern: '',
  enumConfig: [] as { value: string; label: string }[],
  booleanFormat: ''
})

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

const loopForm = reactive({
  isLoop: false,
  loopCode: '',
  loopLevel: 1,
  parentLoopCode: '',
  enableCondition: false,
  conditionExpression: '',
  loopDescription: ''
})

// Check if a field is configured
const isFieldConfigured = (path: string) => {
  return searchFields.value.some(f => f.fieldPath === path)
}

// Check if a node is configured as loop
const isLoopNode = (path: string) => {
  return nodeConfigs.value.some(c => c.nodePath === path && c.isLoop)
}

// Get parent loop configs (for parent loop code dropdown)
const parentNodeConfigs = computed(() => {
  return nodeConfigs.value.filter(c => c.isLoop && c.nodePath !== structSelectedNode.value?.path)
})

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
    // Load search fields, node configs, and constraints
    await loadSearchFields()
    await loadNodeConfigs()
    await loadNodeConstraints()
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

// Load node configs
const loadNodeConfigs = async () => {
  try {
    const data = await getNodeConfigs(templateId) as any
    nodeConfigs.value = data || []
  } catch (e: any) {
    console.error('加载节点配置失败:', e)
  }
}

// Load node constraints
const loadNodeConstraints = async () => {
  try {
    const data = await getNodeConstraints(templateId) as any
    nodeConstraints.value = data || []
  } catch (e: any) {
    console.error('加载节点约束失败:', e)
  }
}

// Save template
const handleSave = async () => {
  if (!formData.name) {
    ElMessage.warning('请填写模板名称')
    return
  }
  if (!formData.code) {
    ElMessage.warning('请填写模板编码')
    return
  }
  saving.value = true
  try {
    if (isCreate) {
      const result = await createTemplate(formData) as any
      formData.id = result.id
      ElMessage.success('创建成功')
      router.replace(`/template/${result.id}/edit`)
      return
    } else {
      await updateTemplate(formData)
    }
    // 保存检索条件
    await saveSearchFields(templateId, searchFields.value)
    // 保存节点配置
    await saveNodeConfigs(templateId, nodeConfigs.value)
    // 保存节点约束
    await saveNodeConstraints(templateId, nodeConstraints.value)
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

// Guess field type based on node name
const guessFieldType = (node: any) => {
  const name = node.name?.toLowerCase() || ''
  if (name.includes('date') || name.includes('time')) return 'Date'
  if (name.includes('id') || name.includes('count') || name.includes('num') || name.includes('age')) return 'Number'
  if (name.includes('flag') || name.includes('is') || name.includes('has')) return 'Boolean'
  return 'String'
}

// Handle loop change - auto add/remove from nodeConfigs
const handleLoopChange = (val: boolean) => {
  if (!structSelectedNode.value) return

  if (val) {
    // Auto generate loop code from node name
    loopForm.loopCode = structSelectedNode.value.name + 'Loop'
    // Add to nodeConfigs
    const configData = {
      nodePath: structSelectedNode.value.path,
      nodeName: structSelectedNode.value.name,
      isLoop: true,
      loopCode: loopForm.loopCode,
      loopLevel: loopForm.loopLevel,
      parentLoopCode: loopForm.parentLoopCode,
      enableCondition: loopForm.enableCondition,
      conditionExpression: loopForm.conditionExpression,
      loopDescription: loopForm.loopDescription
    }
    const existingIndex = nodeConfigs.value.findIndex(c => c.nodePath === structSelectedNode.value.path)
    if (existingIndex >= 0) {
      nodeConfigs.value[existingIndex] = configData
    } else {
      nodeConfigs.value.push(configData)
    }
  } else {
    // Remove from nodeConfigs
    nodeConfigs.value = nodeConfigs.value.filter(c => c.nodePath !== structSelectedNode.value?.path)
  }
}

// Handle enabled change - auto add/remove from searchFields
const handleEnabledChange = (val: boolean) => {
  if (!structSelectedNode.value) return

  if (val) {
    // Auto generate field code from node name
    fieldForm.fieldCode = structSelectedNode.value.name
    fieldForm.fieldName = structSelectedNode.value.name
    // Auto add to searchFields
    const fieldData = {
      fieldCode: fieldForm.fieldCode,
      fieldName: fieldForm.fieldName,
      fieldPath: structSelectedNode.value.path,
      fieldType: fieldForm.fieldType,
      uniqueFlag: fieldForm.uniqueFlag,
      fuzzyFlag: fieldForm.fuzzyFlag,
      description: fieldForm.description
    }
    const existingIndex = searchFields.value.findIndex(f => f.fieldPath === structSelectedNode.value.path)
    if (existingIndex >= 0) {
      searchFields.value[existingIndex] = fieldData
    } else {
      searchFields.value.push(fieldData)
    }
  } else {
    // Remove from searchFields
    searchFields.value = searchFields.value.filter(f => f.fieldPath !== structSelectedNode.value?.path)
  }
}

// Sync fieldForm changes to searchFields automatically
watch(() => [fieldForm.fieldCode, fieldForm.fieldName, fieldForm.description], () => {
  if (!fieldForm.enabled || !structSelectedNode.value) return

  const index = searchFields.value.findIndex(f => f.fieldPath === structSelectedNode.value.path)
  if (index >= 0) {
    searchFields.value[index] = {
      ...searchFields.value[index],
      fieldCode: fieldForm.fieldCode,
      fieldName: fieldForm.fieldName,
      description: fieldForm.description
    }
  }
})

// Sync loopForm changes to nodeConfigs automatically
watch(() => [loopForm.loopCode, loopForm.loopLevel, loopForm.parentLoopCode, loopForm.enableCondition, loopForm.conditionExpression, loopForm.loopDescription], () => {
  if (!loopForm.isLoop || !structSelectedNode.value) return

  const index = nodeConfigs.value.findIndex(c => c.nodePath === structSelectedNode.value.path)
  if (index >= 0) {
    nodeConfigs.value[index] = {
      ...nodeConfigs.value[index],
      loopCode: loopForm.loopCode,
      loopLevel: loopForm.loopLevel,
      parentLoopCode: loopForm.parentLoopCode,
      enableCondition: loopForm.enableCondition,
      conditionExpression: loopForm.conditionExpression,
      loopDescription: loopForm.loopDescription
    }
  }
})

// Tree search
watch(structTreeSearch, (val) => {
  structTreeRef.value?.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase()) ||
         data.path.toLowerCase().includes(value.toLowerCase())
}


// Handle structure tree node click
const handleStructNodeClick = (data: any) => {
  structSelectedNode.value = data
  // Load search field config
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
  // Load loop config
  const existingLoop = nodeConfigs.value.find(c => c.nodePath === data.path)
  if (existingLoop) {
    Object.assign(loopForm, {
      isLoop: existingLoop.isLoop || false,
      loopCode: existingLoop.loopCode || '',
      loopLevel: existingLoop.loopLevel || 1,
      parentLoopCode: existingLoop.parentLoopCode || '',
      enableCondition: existingLoop.enableCondition || false,
      conditionExpression: existingLoop.conditionExpression || '',
      loopDescription: existingLoop.loopDescription || ''
    })
  } else {
    Object.assign(loopForm, {
      isLoop: false,
      loopCode: '',
      loopLevel: 1,
      parentLoopCode: '',
      enableCondition: false,
      conditionExpression: '',
      loopDescription: ''
    })
  }
  // Load constraint config
  const existingConstraint = nodeConstraints.value.find(c => c.nodePath === data.path)
  if (existingConstraint) {
    Object.assign(constraintForm, {
      dataType: existingConstraint.dataType || '',
      requiredFlag: existingConstraint.requiredFlag || false,
      defaultValue: existingConstraint.defaultValue || '',
      formatPattern: existingConstraint.formatPattern || '',
      enumConfig: existingConstraint.enumConfig ? JSON.parse(existingConstraint.enumConfig) : [],
      booleanFormat: existingConstraint.booleanFormat || ''
    })
  } else {
    Object.assign(constraintForm, {
      dataType: '',
      requiredFlag: false,
      defaultValue: '',
      formatPattern: '',
      enumConfig: [],
      booleanFormat: ''
    })
  }
}

// Get constraint tag for tree display
const getConstraintTag = (path: string, type: string) => {
  const c = nodeConstraints.value.find(c => c.nodePath === path)
  return c && c.dataType === type
}

// Add enum item
const addEnumItem = () => {
  constraintForm.enumConfig.push({ value: '', label: '' })
}

// Preview: compute sample value based on constraint config
const getSampleValue = (): string => {
  const dt = constraintForm.dataType
  const dv = constraintForm.defaultValue
  if (dv) return dv
  switch (dt) {
    case 'Boolean': {
      const fmt = constraintForm.booleanFormat || 'true_false'
      if (fmt === 'Y_N') return 'Y'
      if (fmt === '1_0') return '1'
      if (fmt === '是否') return '是'
      return 'true'
    }
    case 'Date': {
      const fp = constraintForm.formatPattern || 'yyyy-MM-dd'
      if (fp === 'yyyyMMdd') return '20260622'
      if (fp === 'yyyy/MM/dd') return '2026/06/22'
      return '2026-06-22'
    }
    case 'Time': {
      const fp = constraintForm.formatPattern || 'HH:mm:ss'
      if (fp === 'HHmmss') return '143025'
      return '14:30:25'
    }
    case 'DateTime': {
      const fp = constraintForm.formatPattern || 'yyyy-MM-dd HH:mm:ss'
      if (fp === 'yyyyMMddHHmmss') return '20260622143025'
      if (fp === "yyyy-MM-dd'T'HH:mm:ss") return "2026-06-22T14:30:25"
      return '2026-06-22 14:30:25'
    }
    case 'DT15': return '20260622143025'
    case 'Number': return '30'
    case 'Enum': {
      if (constraintForm.enumConfig.length > 0) return constraintForm.enumConfig[0].value
      return 'M'
    }
    default: return '示例值'
  }
}

const previewJson = computed(() => {
  if (!structSelectedNode.value) return ''
  const name = structSelectedNode.value.name
  const val = getSampleValue()
  return JSON.stringify({ [name]: val }, null, 2)
})

const previewXml = computed(() => {
  if (!structSelectedNode.value) return ''
  const name = structSelectedNode.value.name
  const val = getSampleValue()
  return `<${name}>${val}</${name}>`
})

const previewRaw = computed(() => {
  return getSampleValue()
})

// Sync constraintForm changes to nodeConstraints automatically
watch(() => [constraintForm.dataType, constraintForm.requiredFlag, constraintForm.defaultValue, constraintForm.formatPattern, constraintForm.booleanFormat, JSON.stringify(constraintForm.enumConfig)], () => {
  if (!structSelectedNode.value) return
  const path = structSelectedNode.value.path
  const index = nodeConstraints.value.findIndex(c => c.nodePath === path)
  const constraintData = {
    nodePath: path,
    nodeName: structSelectedNode.value.name,
    dataType: constraintForm.dataType,
    requiredFlag: constraintForm.requiredFlag,
    defaultValue: constraintForm.defaultValue,
    formatPattern: constraintForm.formatPattern,
    booleanFormat: constraintForm.booleanFormat,
    enumConfig: constraintForm.enumConfig.length > 0 ? JSON.stringify(constraintForm.enumConfig) : null
  }
  // Only save if there's meaningful data
  if (constraintData.dataType || constraintData.requiredFlag || constraintData.defaultValue) {
    if (index >= 0) {
      nodeConstraints.value[index] = { ...nodeConstraints.value[index], ...constraintData }
    } else {
      nodeConstraints.value.push(constraintData)
    }
  } else {
    // Remove if all fields are empty
    if (index >= 0) {
      nodeConstraints.value.splice(index, 1)
    }
  }
})

// Tree search for structure tree
watch(structTreeSearch, (val) => {
  structTreeRef.value?.filter(val)
})

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

onMounted(async () => {
  if (!isCreate) {
    await loadTemplate()
  } else {
    // 检查是否有复制数据
    const copyData = sessionStorage.getItem('templateCopyData')
    if (copyData) {
      try {
        const data = JSON.parse(copyData)
        Object.assign(formData, data)
        sessionStorage.removeItem('templateCopyData')
        // 自动刷新结构
        if (formData.schemaData || formData.sampleData) {
          await refreshStructure()
        }
      } catch (e) {
        console.error('解析复制数据失败:', e)
      }
    }
  }
})
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

.panel-search {
  margin-bottom: 12px;
}

.tree-container {
  max-height: 500px;
  overflow-y: auto;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

/* Structure Tab Layout */
.structure-container {
  display: flex;
  gap: 16px;
}

.structure-container .tree-card {
  flex: 1;
  min-width: 0;
}

.structure-container .config-card {
  flex: 2;
  min-width: 0;
}

.config-section-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.preview-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
