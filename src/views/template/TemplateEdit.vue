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
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue'
import { getTemplateById, updateTemplate } from '@/api/template'
import { parseStructure } from '@/api/transform'

const router = useRouter()
const route = useRoute()

const templateId = Number(route.params.id)
const template = ref<any>(null)
const activeTab = ref('basic')
const saving = ref(false)
const parsingStructure = ref(false)
const structureTree = ref<any[]>([])

const formData = reactive({
  id: templateId,
  code: '',
  name: '',
  format: 'XML',
  description: '',
  tags: '',
  schemaData: '',
  sampleData: ''
})

// Load template
const loadTemplate = async () => {
  try {
    const data = await getTemplateById(templateId) as any
    template.value = data
    Object.assign(formData, {
      id: data.id,
      code: data.code,
      name: data.name,
      format: data.format,
      description: data.description || '',
      tags: data.tags || '',
      schemaData: data.schemaData || '',
      sampleData: data.sampleData || ''
    })
    // Auto load structure
    if (formData.schemaData || formData.sampleData) {
      refreshStructure()
    }
  } catch (e: any) {
    ElMessage.error('加载模板失败: ' + e.message)
  }
}

// Save
const handleSave = async () => {
  if (!formData.name) {
    ElMessage.warning('请填写模板名称')
    return
  }
  saving.value = true
  try {
    await updateTemplate(formData)
    ElMessage.success('保存成功')
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
</style>
