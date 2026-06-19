<template>
  <div class="mapping-editor">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button @click="router.back()" icon="ArrowLeft">返回</el-button>
        <el-divider direction="vertical" />
        <span class="converter-name">{{ converter?.name }}</span>
        <el-tag size="small" style="margin-left: 8px">{{ converter?.sourceFormat }} → {{ converter?.targetFormat }}</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon>保存规则
        </el-button>
        <el-button @click="handleAutoMap">
          <el-icon><MagicStick /></el-icon>自动映射
        </el-button>
        <el-button @click="handleAddRule">
          <el-icon><Plus /></el-icon>添加规则
        </el-button>
        <el-button @click="goTest">
          <el-icon><VideoPlay /></el-icon>测试
        </el-button>
      </div>
    </div>

    <!-- Three Column Layout -->
    <div class="three-columns">
      <!-- Source Tree -->
      <div class="panel source-panel">
        <div class="panel-header">
          <span>源结构</span>
          <div style="display: flex; gap: 6px; align-items: center">
            <el-select
              v-model="sourceTemplateId"
              placeholder="选择模板"
              size="small"
              clearable
              style="width: 150px"
              @change="onSourceTemplateChange"
            >
              <el-option
                v-for="t in sourceTemplates"
                :key="t.id"
                :label="t.name"
                :value="t.id"
              />
            </el-select>
            <el-button size="small" @click="showSourceInput = true">导入</el-button>
          </div>
        </div>
        <div class="panel-search">
          <el-input v-model="sourceSearch" placeholder="搜索字段" clearable size="small" />
        </div>
        <div class="panel-body">
          <el-tree
            :data="sourceTree"
            :props="{ children: 'children', label: 'name' }"
            :filter-node-method="filterNode"
            ref="sourceTreeRef"
            default-expand-all
            @node-click="onSourceNodeClick"
          >
            <template #default="{ data }">
              <div
                class="tree-node"
                draggable="true"
                @dragstart="onSourceDragStart($event, data)"
              >
                <el-icon v-if="data.nodeType === 'ATTRIBUTE'" color="#E6A23C" size="12"><Key /></el-icon>
                <el-icon v-else color="#409EFF" size="12"><Document /></el-icon>
                <span class="node-name">{{ data.name }}</span>
                <el-tag v-if="data.array" size="small" type="warning" style="margin-left: 4px">[]</el-tag>
                <span class="node-path">{{ data.path }}</span>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- Mapping Canvas -->
      <div class="panel canvas-panel">
        <div class="panel-header">
          <span>映射画布</span>
          <div>
            <el-button size="small" @click="zoomIn">+</el-button>
            <el-button size="small" @click="zoomOut">-</el-button>
            <el-button size="small" @click="zoomReset">重置</el-button>
          </div>
        </div>
        <div
          class="panel-body canvas-body"
          :class="{ 'drag-over': canvasDragOver }"
          ref="canvasRef"
          @dragover.prevent="canvasDragOver = true"
          @dragleave="canvasDragOver = false"
          @drop="onCanvasDrop"
        >
          <div class="canvas-content" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }">
            <div class="canvas-nodes">
              <div
                v-for="(rule, idx) in rules"
                :key="idx"
                class="mapping-node"
                :class="{ active: selectedRuleIndex === idx }"
                @click="selectedRuleIndex = idx"
              >
                <div class="node-source">{{ rule.sourceExpression || '(空)' }}</div>
                <el-icon><Right /></el-icon>
                <div class="node-target">{{ rule.targetExpression || '(空)' }}</div>
              </div>
              <div v-if="rules.length === 0" class="empty-canvas">
                <el-empty description="暂无映射规则，点击添加或拖拽源字段" :image-size="80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Target Tree -->
      <div class="panel target-panel">
        <div class="panel-header">
          <span>目标结构</span>
          <div style="display: flex; gap: 6px; align-items: center">
            <el-select
              v-model="targetTemplateId"
              placeholder="选择模板"
              size="small"
              clearable
              style="width: 150px"
              @change="onTargetTemplateChange"
            >
              <el-option
                v-for="t in targetTemplates"
                :key="t.id"
                :label="t.name"
                :value="t.id"
              />
            </el-select>
            <el-dropdown @command="handleTargetCommand">
              <el-button size="small">导入<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="json-schema">导入 JSON Schema</el-dropdown-item>
                  <el-dropdown-item command="xml-template">导入 XML 模板</el-dropdown-item>
                  <el-dropdown-item command="visual">可视化创建</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <div class="panel-search">
          <el-input v-model="targetSearch" placeholder="搜索字段" clearable size="small" />
        </div>
        <div class="panel-body">
          <el-tree
            :data="targetTree"
            :props="{ children: 'children', label: 'name' }"
            :filter-node-method="filterNode"
            ref="targetTreeRef"
            default-expand-all
            @node-click="onTargetNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <el-icon v-if="data.nodeType === 'ATTRIBUTE'" color="#E6A23C" size="12"><Key /></el-icon>
                <el-icon v-else color="#67C23A" size="12"><Document /></el-icon>
                <span class="node-name">{{ data.name }}</span>
                <el-tag v-if="data.array" size="small" type="warning" style="margin-left: 4px">[]</el-tag>
                <el-tag size="small" type="info" style="margin-left: 4px">{{ data.dataType }}</el-tag>
              </div>
            </template>
          </el-tree>
        </div>
      </div>
    </div>

    <!-- Mapping Table -->
    <div class="mapping-table">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>映射规则表</span>
            <el-button type="primary" size="small" @click="handleAddRule">
              <el-icon><Plus /></el-icon>添加
            </el-button>
          </div>
        </template>
        <el-table :data="rules" stripe border size="small" @row-click="onRowClick" highlight-current-row>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column label="源表达式" min-width="200">
            <template #default="{ row }">
              <el-input v-model="row.sourceExpression" size="small" placeholder="XPath/JsonPath" />
            </template>
          </el-table-column>
          <el-table-column label="目标表达式" min-width="200">
            <template #default="{ row }">
              <el-input v-model="row.targetExpression" size="small" placeholder="XPath/JsonPath" />
            </template>
          </el-table-column>
          <el-table-column label="转换函数" min-width="200">
            <template #default="{ row }">
              <el-popover placement="bottom" :width="400" trigger="click">
                <template #reference>
                  <el-input v-model="row.converterChain" size="small" placeholder="trim -> upper -> substring(0,10)" />
                </template>
                <div class="func-popover">
                  <div class="func-title">常用函数</div>
                  <div class="func-list">
                    <el-tooltip v-for="func in converterFunctions" :key="func.value" placement="top" :show-after="300">
                      <template #content>
                        <pre style="white-space: pre-wrap; margin: 0;">{{ func.hint }}</pre>
                      </template>
                      <span class="func-item" @click="insertConverter(row, func.value)">
                        {{ func.label }}
                      </span>
                    </el-tooltip>
                  </div>
                  <div class="func-title" style="margin-top: 12px;">插件函数 <span style="font-weight: 400; font-size: 11px; color: #909399;">（点击插入后修改参数）</span></div>
                  <div class="func-list">
                    <el-tooltip v-for="p in pluginFunctions" :key="p.value" placement="top">
                      <template #content>
                        <pre style="white-space: pre-wrap; margin: 0;">{{ p.hint }}</pre>
                      </template>
                      <span class="func-item plugin-item" @click="insertConverter(row, p.value + p.params)">
                        {{ p.label }}
                      </span>
                    </el-tooltip>
                  </div>
                  <div class="func-hint">点击插入，多函数用 -> 连接。插件格式: plugin:编码(参数)</div>
                </div>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column label="默认值" width="120">
            <template #default="{ row }">
              <el-input v-model="row.defaultValue" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="条件" min-width="180">
            <template #default="{ row }">
              <el-popover placement="bottom" :width="320" trigger="click">
                <template #reference>
                  <el-input v-model="row.conditionExpression" size="small" :placeholder="getConditionPlaceholder(row)" />
                </template>
                <div class="func-popover">
                  <div class="func-title">可用变量</div>
                  <div class="func-list">
                    <span v-for="varName in otherVariables(row)" :key="varName" class="func-item" @click="insertConditionVar(row, varName)">
                      {{ varName }}
                    </span>
                  </div>
                  <div class="func-hint">点击插入变量，支持 == != > < contains 等操作符</div>
                </div>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column label="条件值" width="120">
            <template #default="{ row }">
              <el-input v-model="row.conditionValue" size="small" placeholder="条件赋值" />
            </template>
          </el-table-column>
          <el-table-column label="空策略" width="90">
            <template #default="{ row }">
              <el-select v-model="row.nullPolicy" size="small">
                <el-option label="跳过" value="SKIP" />
                <el-option label="NULL" value="NULL" />
                <el-option label="空串" value="EMPTY" />
                <el-option label="默认值" value="DEFAULT" />
                <el-option label="报错" value="ERROR" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" fixed="right">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="rules.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- Source Input Dialog -->
    <el-dialog v-model="showSourceInput" title="导入源结构" width="700px">
      <el-input v-model="sourceInputData" type="textarea" :rows="15" placeholder="粘贴XML或JSON数据" />
      <template #footer>
        <el-button @click="showSourceInput = false">取消</el-button>
        <el-button type="primary" @click="parseSource">解析</el-button>
      </template>
    </el-dialog>

    <!-- Target Input Dialog -->
    <el-dialog v-model="showTargetInput" :title="targetInputTitle" width="700px">
      <el-input v-model="targetInputData" type="textarea" :rows="15" placeholder="粘贴JSON Schema或XML模板" />
      <template #footer>
        <el-button @click="showTargetInput = false">取消</el-button>
        <el-button type="primary" @click="parseTarget">解析</el-button>
      </template>
    </el-dialog>

    <!-- Visual Target Editor Dialog -->
    <el-dialog v-model="showVisualEditor" title="可视化创建目标结构" width="800px">
      <div class="visual-editor">
        <div class="ve-toolbar">
          <el-button size="small" @click="addTargetNode('field')">添加字段</el-button>
          <el-button size="small" @click="addTargetNode('object')">添加对象</el-button>
          <el-button size="small" @click="addTargetNode('array')">添加数组</el-button>
        </div>
        <el-table :data="flatTargetNodes" stripe size="small">
          <el-table-column label="名称" min-width="150">
            <template #default="{ row }">
              <span :style="{ paddingLeft: row._level * 20 + 'px' }">
                <el-icon v-if="row.dataType === 'OBJECT'"><Folder /></el-icon>
                <el-icon v-else-if="row.dataType === 'ARRAY'"><Menu /></el-icon>
                <el-icon v-else><Document /></el-icon>
              </span>
              <el-input v-model="row.name" size="small" style="width: 120px; margin-left: 4px" />
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-select v-model="row.dataType" size="small">
                <el-option label="String" value="STRING" />
                <el-option label="Integer" value="INTEGER" />
                <el-option label="Long" value="LONG" />
                <el-option label="Decimal" value="DECIMAL" />
                <el-option label="Boolean" value="BOOLEAN" />
                <el-option label="Date" value="DATE" />
                <el-option label="Object" value="OBJECT" />
                <el-option label="Array" value="ARRAY" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="flatTargetNodes.splice($index, 1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showVisualEditor = false">取消</el-button>
        <el-button type="primary" @click="applyVisualTarget">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getConverterById, updateConverter } from '@/api/converter'
import { getRulesByConverter, saveRules } from '@/api/mappingRule'
import { parseStructure } from '@/api/transform'
import { getTemplateList, getTemplateById } from '@/api/template'

const router = useRouter()
const route = useRoute()
const converterId = Number(route.params.id)

const converter = ref<any>(null)
const sourceTree = ref<any[]>([])
const targetTree = ref<any[]>([])
const rules = ref<any[]>([])
const saving = ref(false)
const zoom = ref(1)
const selectedRuleIndex = ref(-1)
const mappingLines = ref<any[]>([])

const sourceSearch = ref('')
const targetSearch = ref('')
const showSourceInput = ref(false)
const showTargetInput = ref(false)
const showVisualEditor = ref(false)
const sourceInputData = ref('')
const targetInputData = ref('')
const targetInputTitle = ref('')
const flatTargetNodes = ref<any[]>([])

const sourceTreeRef = ref()
const targetTreeRef = ref()
const canvasRef = ref()
const canvasDragOver = ref(false)

// Template selection
const allTemplates = ref<any[]>([])
const sourceTemplateId = ref<number | null>(null)
const targetTemplateId = ref<number | null>(null)
const sourceTemplates = ref<any[]>([])
const targetTemplates = ref<any[]>([])

// Converter functions for chain selection
const castHint = `类型转换用法：cast(类型)
─────────────────────────────────
cast(INTEGER)         转整数    "123" → 123
cast(LONG)            转长整数  "123" → 123L
cast(DECIMAL)         转小数    "12.5" → 12.5
cast(BOOLEAN)         转布尔    "true" → true
cast(STRING)          转字符串  123 → "123"
cast(DATE)            转日期    "2024-01-01" → Date
cast(DATE,yyyy/MM/dd) 转日期    指定格式`

const converterFunctions = [
  { value: 'trim', label: '去空格', hint: 'trim → 去除首尾空格' },
  { value: 'upper', label: '转大写', hint: 'upper → 转换为大写' },
  { value: 'lower', label: '转小写', hint: 'lower → 转换为小写' },
  { value: 'replace(旧,新)', label: '替换', hint: 'replace(旧值,新值) → 替换指定内容' },
  { value: 'concat(后缀)', label: '拼接', hint: 'concat(后缀) → 在末尾拼接内容' },
  { value: 'substring(0,10)', label: '截取', hint: 'substring(起始,结束) → 截取字符串' },
  { value: 'dateformat(原格式,目标格式)', label: '日期格式', hint: 'dateformat(yyyy-MM-dd,yyyyMMdd) → 日期格式转换' },
  { value: 'base64', label: 'Base64编码', hint: 'base64 → Base64编码' },
  { value: 'base64(decode)', label: 'Base64解码', hint: 'base64(decode) → Base64解码' },
  { value: 'uuid', label: '生成UUID', hint: 'uuid → 生成唯一标识' },
  { value: 'cast(类型)', label: '类型转换', hint: castHint }
]

// Plugin functions
const pluginFunctions = [
  { value: 'plugin:AES', label: 'AES加密', params: '', hint: 'plugin:AES(16字节密钥)' },
  { value: 'plugin:HASH', label: '哈希摘要', params: '(SHA256)', hint: 'plugin:HASH(SHA256/MD5)' },
  { value: 'plugin:SM4', label: 'SM4加密', params: '', hint: 'plugin:SM4(16字节密钥)' }
]

const insertConverter = (row: any, funcName: string) => {
  const current = row.converterChain || ''
  if (!current.trim()) {
    row.converterChain = funcName
  } else {
    row.converterChain = current + ' -> ' + funcName
  }
}

// Available variable names from source expressions (for condition hints)
const availableVariables = computed(() => {
  const vars: string[] = []
  const simpleNameCount: Record<string, number> = {}

  // First pass: count how many rules share the same last-segment name
  for (const rule of rules.value) {
    if (rule.sourceExpression) {
      const parts = rule.sourceExpression.split('/').map((p: string) =>
        p.replace(/[@$.]/g, '').trim()
      ).filter(Boolean)
      if (parts.length > 0) {
        const simple = parts[parts.length - 1]
        simpleNameCount[simple] = (simpleNameCount[simple] || 0) + 1
      }
    }
  }

  // Second pass: build variable list
  for (const rule of rules.value) {
    if (rule.sourceExpression) {
      vars.push(rule.sourceExpression) // full path always available
      const parts = rule.sourceExpression.split('/').map((p: string) =>
        p.replace(/[@$.]/g, '').trim()
      ).filter(Boolean)
      if (parts.length >= 2) {
        const last = parts[parts.length - 1]
        const parent = parts[parts.length - 2]
        vars.push(parent + '_' + last) // e.g. gender_code
        // Only include simple name if no collision
        if (simpleNameCount[last] === 1) {
          vars.push(last)
        }
      } else if (parts.length === 1) {
        vars.push(parts[0])
      }
    }
  }
  return [...new Set(vars)]
})

watch(sourceSearch, (val) => {
  sourceTreeRef.value?.filter(val)
})

watch(targetSearch, (val) => {
  targetTreeRef.value?.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase()) ||
         data.path.toLowerCase().includes(value.toLowerCase())
}

onMounted(async () => {
  converter.value = await getConverterById(converterId)
  rules.value = await getRulesByConverter(converterId) as any || []

  // Load all templates
  allTemplates.value = (await getTemplateList() as any) || []
  // HL7_V3 is also XML, so match both XML and HL7_V3 when source/target format is XML
  sourceTemplates.value = allTemplates.value.filter((t: any) => {
    if (converter.value?.sourceFormat === 'XML') {
      return t.format === 'XML' || t.format === 'HL7_V3'
    }
    return t.format === converter.value?.sourceFormat
  })
  targetTemplates.value = allTemplates.value.filter((t: any) => {
    if (converter.value?.targetFormat === 'XML') {
      return t.format === 'XML' || t.format === 'HL7_V3'
    }
    return t.format === converter.value?.targetFormat
  })

  // Restore saved template selections
  if (converter.value?.sourceTemplateId) {
    sourceTemplateId.value = converter.value.sourceTemplateId
  }
  if (converter.value?.targetTemplateId) {
    targetTemplateId.value = converter.value.targetTemplateId
  }

  // Load source tree: prefer template, then sample (no default fallback)
  if (sourceTemplateId.value) {
    await loadSourceFromTemplate(sourceTemplateId.value)
  } else if (converter.value?.sourceSample) {
    try {
      sourceTree.value = await parseStructure({
        data: converter.value.sourceSample,
        format: converter.value.sourceFormat
      }) as any
    } catch (e) { /* ignore */ }
  }

  // Load target tree: prefer template, then sample (no default fallback)
  if (targetTemplateId.value) {
    await loadTargetFromTemplate(targetTemplateId.value)
  } else if (converter.value?.targetSample) {
    try {
      targetTree.value = await parseStructure({
        data: converter.value.targetSample,
        format: converter.value.targetFormat
      }) as any
    } catch (e) { /* ignore */ }
  }
})

const loadSourceFromTemplate = async (templateId: number) => {
  try {
    const tpl: any = await getTemplateById(templateId)
    if (tpl?.schemaData) {
      sourceTree.value = await parseStructure({
        data: tpl.schemaData,
        format: tpl.format
      }) as any
    }
  } catch (e) { /* ignore */ }
}

const loadTargetFromTemplate = async (templateId: number) => {
  try {
    const tpl: any = await getTemplateById(templateId)
    if (tpl?.schemaData) {
      targetTree.value = await parseStructure({
        data: tpl.schemaData,
        format: tpl.format
      }) as any
    }
  } catch (e) { /* ignore */ }
}

const onSourceTemplateChange = async (val: number | null) => {
  if (val) {
    await loadSourceFromTemplate(val)
  } else {
    sourceTree.value = []
  }
}

const onTargetTemplateChange = async (val: number | null) => {
  if (val) {
    await loadTargetFromTemplate(val)
  } else {
    targetTree.value = []
  }
}

const parseSource = async () => {
  try {
    const format = sourceInputData.value.trim().startsWith('<') ? 'XML' : 'JSON'
    sourceTree.value = await parseStructure({ data: sourceInputData.value, format }) as any
    showSourceInput.value = false
    ElMessage.success('源结构解析成功')
  } catch (e: any) {
    ElMessage.error('解析失败: ' + e.message)
  }
}

const parseTarget = async () => {
  try {
    const format = targetInputData.value.trim().startsWith('<') ? 'XML' : 'JSON'
    targetTree.value = await parseStructure({ data: targetInputData.value, format }) as any
    showTargetInput.value = false
    ElMessage.success('目标结构解析成功')
  } catch (e: any) {
    ElMessage.error('解析失败: ' + e.message)
  }
}

const handleTargetCommand = (cmd: string) => {
  if (cmd === 'json-schema' || cmd === 'xml-template') {
    targetInputTitle.value = cmd === 'json-schema' ? '导入 JSON Schema' : '导入 XML 模板'
    targetInputData.value = ''
    showTargetInput.value = true
  } else if (cmd === 'visual') {
    flatTargetNodes.value = []
    showVisualEditor.value = true
  }
}

const addTargetNode = (type: string) => {
  const node: any = {
    name: type === 'array' ? 'items' : 'newField',
    dataType: type === 'field' ? 'STRING' : type.toUpperCase(),
    path: '',
    nodeType: 'ELEMENT',
    array: type === 'array',
    children: [],
    _level: 0
  }
  flatTargetNodes.value.push(node)
}

const applyVisualTarget = () => {
  // Build tree from flat nodes
  const buildTree = (nodes: any[]) => {
    return nodes.map(n => ({
      name: n.name,
      path: '$.' + n.name,
      nodeType: n.nodeType,
      dataType: n.dataType,
      array: n.array,
      children: n.children || []
    }))
  }
  targetTree.value = buildTree(flatTargetNodes.value)
  showVisualEditor.value = false
  ElMessage.success('目标结构已更新')
}

const onSourceDragStart = (e: DragEvent, data: any) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('source-path', data.path)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

const onCanvasDrop = (e: DragEvent) => {
  canvasDragOver.value = false
  if (!e.dataTransfer) return
  const sourcePath = e.dataTransfer.getData('source-path')
  if (!sourcePath) return
  rules.value.push({
    sourceExpression: sourcePath,
    targetExpression: '',
    sourceType: 'STRING',
    targetType: 'STRING',
    converterChain: '',
    defaultValue: '',
    nullPolicy: 'SKIP',
    conditionExpression: '',
    conditionValue: ''
  })
  selectedRuleIndex.value = rules.value.length - 1
  ElMessage.success('已添加映射规则')
}

const onSourceNodeClick = (data: any) => {
  if (selectedRuleIndex.value >= 0 && selectedRuleIndex.value < rules.value.length) {
    rules.value[selectedRuleIndex.value].sourceExpression = data.path
  }
}

const onTargetNodeClick = (data: any) => {
  if (selectedRuleIndex.value >= 0 && selectedRuleIndex.value < rules.value.length) {
    rules.value[selectedRuleIndex.value].targetExpression = data.path
  }
}

const onRowClick = (row: any) => {
  selectedRuleIndex.value = rules.value.indexOf(row)
}

// Extract simplified variable name from source expression
// /patient/gender/@code -> "code"
const getSourceVarName = (row: any): string => {
  if (!row.sourceExpression) return ''
  const parts = row.sourceExpression.split('/').map((p: string) =>
    p.replace(/[@$.]/g, '').trim()
  ).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : ''
}

// Extract parent_last specific name
// /patient/gender/@code -> "gender_code"
const getSourceVarSpecific = (row: any): string => {
  if (!row.sourceExpression) return ''
  const parts = row.sourceExpression.split('/').map((p: string) =>
    p.replace(/[@$.]/g, '').trim()
  ).filter(Boolean)
  if (parts.length >= 2) {
    return parts[parts.length - 2] + '_' + parts[parts.length - 1]
  }
  return parts.length > 0 ? parts[0] : ''
}

// Generate placeholder from current source expression
const getConditionPlaceholder = (row: any): string => {
  const varName = getSourceVarName(row)
  if (!varName) return 'code == "M"'
  return varName + ' == "value"'
}

// Get variables from OTHER rules (not the current one)
const otherVariables = (currentRow: any): string[] => {
  const vars: string[] = []
  const simpleNameCount: Record<string, number> = {}
  for (const rule of rules.value) {
    if (rule.sourceExpression) {
      const parts = rule.sourceExpression.split('/').map((p: string) =>
        p.replace(/[@$.]/g, '').trim()
      ).filter(Boolean)
      if (parts.length > 0) {
        const s = parts[parts.length - 1]
        simpleNameCount[s] = (simpleNameCount[s] || 0) + 1
      }
    }
  }
  for (const rule of rules.value) {
    if (rule === currentRow || !rule.sourceExpression) continue
    vars.push(rule.sourceExpression)
    const parts = rule.sourceExpression.split('/').map((p: string) =>
      p.replace(/[@$.]/g, '').trim()
    ).filter(Boolean)
    if (parts.length >= 2) {
      vars.push(parts[parts.length - 2] + '_' + parts[parts.length - 1])
      if (simpleNameCount[parts[parts.length - 1]] === 1) {
        vars.push(parts[parts.length - 1])
      }
    } else if (parts.length === 1) {
      vars.push(parts[0])
    }
  }
  return [...new Set(vars)]
}

const insertConditionVar = (row: any, varName: string) => {
  const current = row.conditionExpression || ''
  if (!current.trim()) {
    // Pre-fill: varName + operator
    row.conditionExpression = varName + ' == "'
  } else {
    // Append
    row.conditionExpression = current + ' ' + varName
  }
}

const handleAddRule = () => {
  rules.value.push({
    sourceExpression: '',
    targetExpression: '',
    sourceType: 'STRING',
    targetType: 'STRING',
    converterChain: '',
    defaultValue: '',
    nullPolicy: 'SKIP',
    conditionExpression: '',
    conditionValue: ''
  })
  selectedRuleIndex.value = rules.value.length - 1
}

const handleAutoMap = () => {
  // Auto-map by matching field names
  const flatten = (nodes: any[], prefix = ''): any[] => {
    let result: any[] = []
    for (const node of nodes) {
      result.push(node)
      if (node.children) {
        result = result.concat(flatten(node.children, node.path + '.'))
      }
    }
    return result
  }

  const sourceNodes = flatten(sourceTree.value)
  const targetNodes = flatten(targetTree.value)

  let mapped = 0
  for (const target of targetNodes) {
    const match = sourceNodes.find(s =>
      s.name.toLowerCase() === target.name.toLowerCase()
    )
    if (match) {
      const existing = rules.value.find(r => r.targetExpression === target.path)
      if (!existing) {
        rules.value.push({
          sourceExpression: match.path,
          targetExpression: target.path,
          sourceType: match.dataType || 'STRING',
          targetType: target.dataType || 'STRING',
          converterChain: '',
          defaultValue: '',
          nullPolicy: 'SKIP',
          conditionExpression: '',
          conditionValue: ''
        })
        mapped++
      }
    }
  }
  ElMessage.success(`自动映射完成，新增 ${mapped} 条规则`)
}

const handleSave = async () => {
  saving.value = true
  try {
    // Save mapping rules
    await saveRules(converterId, rules.value)
    // Persist template selections to converter (without audit log)
    await updateConverter({
      id: converterId,
      sourceTemplateId: sourceTemplateId.value || null,
      targetTemplateId: targetTemplateId.value || null
    }, false)
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

const goTest = () => {
  router.push(`/converter/${converterId}/test`)
}

const zoomIn = () => { zoom.value = Math.min(2, zoom.value + 0.1) }
const zoomOut = () => { zoom.value = Math.max(0.5, zoom.value - 0.1) }
const zoomReset = () => { zoom.value = 1 }
</script>

<style scoped>
.mapping-editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  gap: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.converter-name {
  font-weight: 600;
  font-size: 15px;
}

.three-columns {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.panel {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.panel-search {
  padding: 8px 8px 0;
  flex-shrink: 0;
}

.panel-body {
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.canvas-panel {
  flex: 1.5;
}

.canvas-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.canvas-content {
  min-height: 100%;
  padding: 4px;
}

.canvas-body.drag-over {
  background: #ecf5ff;
  outline: 2px dashed #409eff;
  outline-offset: -2px;
}

.mapping-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin: 4px 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.mapping-node:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.mapping-node.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.node-source {
  flex: 1;
  color: #409eff;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-target {
  flex: 1;
  color: #67c23a;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
}

.node-name {
  font-weight: 500;
}

.node-path {
  color: #909399;
  font-size: 11px;
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mapping-table {
  flex-shrink: 0;
  height: 300px;
  overflow: hidden;
}

.mapping-table :deep(.el-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mapping-table :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.visual-editor {
  max-height: 400px;
  overflow-y: auto;
}

.ve-toolbar {
  margin-bottom: 8px;
}

.func-popover {
  padding: 4px 0;
}

.func-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.func-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.func-item {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.func-item:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.plugin-item {
  color: #e6a23c;
  background: #fdf6ec;
  border-color: #faecd8;
}

.plugin-item:hover {
  background: #e6a23c;
  color: #fff;
  border-color: #e6a23c;
}

.func-hint {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  font-size: 11px;
  color: #909399;
}
</style>
