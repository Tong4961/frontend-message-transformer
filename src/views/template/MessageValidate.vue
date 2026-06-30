<template>
  <div class="validate-container">
    <!-- Top: three columns -->
    <div class="validate-main">
      <!-- Left: Template Structure Tree -->
      <div class="panel tree-panel">
        <div class="panel-header">
          <span>模板结构</span>
        </div>
        <div class="panel-search">
          <el-input v-model="treeSearch" placeholder="搜索节点" clearable size="small" />
        </div>
        <div class="panel-body">
          <el-tree
            ref="treeRef"
            :data="templateTree"
            node-key="path"
            default-expand-all
            :props="{ label: 'name', children: 'children' }"
            highlight-current
            :filter-node-method="filterNode"
            @node-click="onNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <el-icon v-if="getNodeStatus(data.path) === 'ERROR'" color="#F56C6C" size="12"><CircleCloseFilled /></el-icon>
                <el-icon v-else-if="getNodeStatus(data.path) === 'WARNING'" color="#E6A23C" size="12"><WarningFilled /></el-icon>
                <el-icon v-else-if="getNodeStatus(data.path) === 'PASS'" color="#67C23A" size="12"><SuccessFilled /></el-icon>
                <span class="node-name">{{ data.name }}</span>
                <el-tag v-if="data.array" size="small" type="warning" style="margin-left: 4px">[]</el-tag>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- Center: XML Editor -->
      <div class="panel editor-panel">
        <div class="panel-header">
          <span>XML 编辑器</span>
          <div class="editor-actions">
            <el-upload
              :show-file-list="false"
              :before-upload="handleFileUpload"
              :accept="templateFormat === 'JSON' ? '.json' : '.xml,.hl7'"
            >
              <el-button size="small">导入{{ templateFormat === 'JSON' ? 'JSON' : 'XML' }}</el-button>
            </el-upload>
            <el-button size="small" @click="formatXml">格式化</el-button>
            <el-button size="small" @click="clearEditor">清空</el-button>
            <el-button size="small" type="primary" @click="executeValidation" :loading="validating">
              <el-icon><VideoPlay /></el-icon>开始验证
            </el-button>
          </div>
        </div>
        <div class="editor-body" ref="editorRef"></div>
      </div>

      <!-- Right: Validation Results -->
      <div class="panel result-panel">
        <div class="panel-header">
          <span>验证结果</span>
        </div>
        <div class="panel-body">
          <div v-if="validationResult" class="result-summary">
            <div class="summary-title" :class="validationResult.success ? 'text-success' : 'text-error'">
              {{ validationResult.success ? '验证通过' : '验证不通过' }}
            </div>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">检查</span>
                <span class="stat-value">{{ totalChecks }} 项</span>
              </div>
              <div class="stat-item stat-pass">
                <span class="stat-label">通过</span>
                <span class="stat-value">{{ validationResult.summary.pass }}</span>
              </div>
              <div class="stat-item stat-warn">
                <span class="stat-label">警告</span>
                <span class="stat-value">{{ validationResult.summary.warning }}</span>
              </div>
              <div class="stat-item stat-error">
                <span class="stat-label">错误</span>
                <span class="stat-value">{{ validationResult.summary.error }}</span>
              </div>
            </div>
          </div>
          <el-divider v-if="validationResult" />

          <div class="error-list">
            <div
              v-for="(msg, idx) in errorMessages"
              :key="idx"
              class="error-item"
              :class="{ active: selectedMessage === idx }"
              @click="selectMessage(idx)"
            >
              <el-icon v-if="msg.severity === 'ERROR'" color="#F56C6C"><CircleCloseFilled /></el-icon>
              <el-icon v-else color="#E6A23C"><WarningFilled /></el-icon>
              <div class="error-info">
                <div class="error-text">{{ msg.message }}</div>
                <div class="error-path">路径: {{ msg.path }}</div>
              </div>
            </div>
            <el-empty v-if="!validationResult" description="请粘贴XML并点击开始验证" />
            <el-empty v-else-if="validationResult && errorMessages.length === 0" description="验证通过，无错误或警告" />
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: detail panels -->
    <div class="validate-detail" v-if="selectedMsg">
      <div class="detail-section">
        <div class="detail-title">问题详情</div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="节点">{{ selectedMsg.path }}</el-descriptions-item>
          <el-descriptions-item label="错误类型">{{ selectedMsg.rule }}</el-descriptions-item>
          <el-descriptions-item label="错误说明">{{ selectedMsg.message }}</el-descriptions-item>
          <el-descriptions-item label="严重级别">
            <el-tag :type="selectedMsg.severity === 'ERROR' ? 'danger' : 'warning'" size="small">
              {{ selectedMsg.severity }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="期望值" :span="1">{{ selectedMsg.expected || '-' }}</el-descriptions-item>
          <el-descriptions-item label="实际值" :span="1">{{ selectedMsg.actual || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="detail-section">
        <div class="detail-title">节点约束</div>
        <el-descriptions :column="2" border size="small" v-if="selectedConstraint">
          <el-descriptions-item label="节点名称">{{ selectedConstraint.nodeName }}</el-descriptions-item>
          <el-descriptions-item label="数据类型">{{ selectedConstraint.dataType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否必填">{{ selectedConstraint.requiredFlag ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="格式模式">{{ selectedConstraint.formatPattern || '-' }}</el-descriptions-item>
          <el-descriptions-item label="枚举值" :span="2">{{ formatEnumConfig(selectedConstraint.enumConfig) }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="该节点无约束配置" :image-size="40" />
      </div>

      <div class="detail-section">
        <div class="detail-title">{{ templateFormat === 'JSON' ? 'JSON' : 'XML' }} 内容</div>
        <pre class="xml-content">{{ selectedXmlContent || '-' }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, CircleCloseFilled, WarningFilled, SuccessFilled } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { parseStructure } from '@/api/transform'
import { getNodeConstraints } from '@/api/template'
import request from '@/api/request'

const props = defineProps<{ templateId: string }>()

const templateFormat = ref('XML')
const templateTree = ref<any[]>([])
const treeSearch = ref('')
const treeRef = ref()
const editorRef = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const validating = ref(false)
const validationResult = ref<any>(null)
const selectedMessage = ref<number>(-1)

const selectedMsg = computed(() => {
  if (!validationResult.value || selectedMessage.value < 0) return null
  return errorMessages.value[selectedMessage.value] || null
})

const errorMessages = computed(() => {
  if (!validationResult.value) return []
  return validationResult.value.results.filter((r: any) => r.severity === 'ERROR' || r.severity === 'WARNING')
})

const totalChecks = computed(() => {
  if (!validationResult.value) return 0
  const s = validationResult.value.summary
  return s.pass + s.warning + s.error
})

const selectedConstraint = computed(() => {
  if (!selectedMsg.value) return null
  const path = selectedMsg.value.path
  // Find constraint by matching path (exact or prefix)
  return constraints.value.find((c: any) => {
    const cp = c.nodePath
    return cp === path || path.startsWith(cp + '/') || cp.startsWith(path)
  })
})

const selectedXmlContent = computed(() => {
  if (!selectedMsg.value || !editor) return ''
  const path = selectedMsg.value.path
  // Try to find the XML element by path and return its content
  return findXmlByPath(path)
})

const constraints = ref<any[]>([])

onMounted(async () => {
  // Load template structure
  try {
    const { data } = await request.get(`/template/${props.templateId}`)
    if (data) {
      templateFormat.value = data.format || 'XML'
      if (data.schemaData) {
        templateTree.value = await parseStructure({ data: data.schemaData, format: data.format || 'XML' }) as any
      }
    }
  } catch (e) { /* ignore */ }

  // Load constraints
  try {
    const res: any = await getNodeConstraints(props.templateId)
    constraints.value = res || []
  } catch (e) { /* ignore */ }

  await nextTick()
  if (editorRef.value) {
    const lang = templateFormat.value === 'JSON' ? 'json' : 'xml'
    editor = monaco.editor.create(editorRef.value, {
      value: '',
      language: lang,
      theme: 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true
    })
  }
})

onBeforeUnmount(() => {
  editor?.dispose()
})

watch(treeSearch, (val) => {
  treeRef.value?.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  const lower = value.toLowerCase()
  return (data.name && data.name.toLowerCase().includes(lower)) ||
         (data.path && data.path.toLowerCase().includes(lower))
}

const getNodeStatus = (path: string): string => {
  if (!validationResult.value) return ''
  const msgs = validationResult.value.results
  // Check if this exact path has errors
  const hasError = msgs.some((m: any) => m.path === path && m.severity === 'ERROR')
  if (hasError) return 'ERROR'
  const hasWarning = msgs.some((m: any) => m.path === path && m.severity === 'WARNING')
  if (hasWarning) return 'WARNING'
  // Check if this path is a parent of any checked path
  const hasChildResult = msgs.some((m: any) => m.path.startsWith(path + '/') || m.path.startsWith(path + '['))
  if (hasChildResult) return 'PASS'
  // Check if this node was validated (pass)
  const summary = validationResult.value.summary
  if (summary.pass > 0) return 'PASS'
  return ''
}

const onNodeClick = (data: any) => {
  // Find matching error message
  const idx = errorMessages.value.findIndex((m: any) =>
    m.path === data.path || m.path.startsWith(data.path + '/') || data.path.startsWith(m.path)
  )
  if (idx >= 0) {
    selectMessage(idx)
  }
}

const selectMessage = (idx: number) => {
  selectedMessage.value = idx
  const msg = errorMessages.value[idx]
  if (!msg || !editor) return

  // Try to find and highlight the line in the editor
  const content = editor.getValue()
  const path = msg.path
  const lastName = path.split('/').pop()?.replace(/\[\d+\]/, '') || ''
  if (lastName) {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<' + lastName + '>') || lines[i].includes('<' + lastName + ' ')) {
        editor.revealLineInCenter(i + 1)
        editor.setPosition({ lineNumber: i + 1, column: 1 })
        break
      }
    }
  }

  // Highlight in tree
  treeRef.value?.setCurrentKey(msg.path)
}

const handleFileUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    if (editor) {
      editor.setValue(e.target?.result as string || '')
    }
  }
  reader.readAsText(file)
  return false
}

const formatXml = () => {
  if (!editor) return
  const value = editor.getValue()

  if (templateFormat.value === 'JSON') {
    try {
      editor.setValue(JSON.stringify(JSON.parse(value), null, 2))
    } catch (e) {
      ElMessage.warning('格式化失败，请检查JSON语法')
    }
    return
  }

  try {
    const trimmed = value.trim()
    const declMatch = trimmed.match(/^<\?xml\s[^?]*\?>/i)
    const decl = declMatch ? declMatch[0] : ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(trimmed, 'text/xml')

    const formatNode = (node: Node, indent: number): string => {
      const pad = '  '.repeat(indent)
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() || ''
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return ''
      const el = node as Element
      const tag = el.tagName
      const attrs = Array.from(el.attributes).map(a => ` ${a.name}="${a.value}"`).join('')
      const children = Array.from(el.childNodes).map(c => formatNode(c, indent + 1)).filter(Boolean)
      if (children.length === 0) {
        return `${pad}<${tag}${attrs}/>`
      }
      const hasElementChild = Array.from(el.childNodes).some(c => c.nodeType === Node.ELEMENT_NODE)
      if (!hasElementChild && children.length === 1 && children[0].length < 80) {
        return `${pad}<${tag}${attrs}>${children[0]}</${tag}>`
      }
      const inner = children.map(c => {
        if (c.startsWith('  ') || c.startsWith('<')) return c
        return '  '.repeat(indent + 1) + c
      }).join('\n')
      return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`
    }

    const elements = Array.from(doc.childNodes)
      .filter(n => n.nodeType === Node.ELEMENT_NODE)
      .map(n => formatNode(n, 0))
    editor.setValue((decl ? decl + '\n' : '') + elements.join('\n'))
  } catch (e) {
    ElMessage.warning('格式化失败，请检查XML语法')
  }
}

const clearEditor = () => {
  editor?.setValue('')
  validationResult.value = null
  selectedMessage.value = -1
}

const executeValidation = async () => {
  if (!editor) return
  const content = editor.getValue()
  if (!content.trim()) {
    ElMessage.warning('请先输入XML内容')
    return
  }

  validating.value = true
  try {
    const res: any = await request.post('/template/validate', {
      templateId: String(props.templateId),
      messageType: templateFormat.value,
      content
    })
    validationResult.value = res
    selectedMessage.value = -1

    if (res.success) {
      ElMessage.success(`验证通过，共检查 ${totalChecks.value} 项`)
    } else {
      ElMessage.error(`验证不通过：${res.summary.error} 个错误，${res.summary.warning} 个警告`)
    }
  } catch (e: any) {
    ElMessage.error('验证失败: ' + (e.message || '未知错误'))
  } finally {
    validating.value = false
  }
}

const findXmlByPath = (path: string): string => {
  if (!editor) return ''
  const content = editor.getValue()

  if (templateFormat.value === 'JSON') {
    try {
      const obj = JSON.parse(content)
      const parts = path.replace(/^\$\.?/, '').split(/[.[\]]/).filter(Boolean)
      let current: any = obj
      for (const part of parts) {
        if (current == null) break
        current = current[part]
      }
      if (current != null) {
        const str = typeof current === 'object' ? JSON.stringify(current, null, 2) : String(current)
        return str.substring(0, 500) + (str.length > 500 ? '...' : '')
      }
    } catch { /* ignore */ }
    return ''
  }

  const lastName = path.split('/').pop()?.replace(/\[\d+\]/, '') || ''
  if (!lastName) return ''

  const regex = new RegExp(`<${lastName}[^>]*>([\\s\\S]*?)</${lastName}>`, 'i')
  const match = content.match(regex)
  if (match) return match[0].substring(0, 500) + (match[0].length > 500 ? '...' : '')

  const selfCloseRegex = new RegExp(`<${lastName}[^>]*/>`, 'i')
  const selfMatch = content.match(selfCloseRegex)
  return selfMatch ? selfMatch[0] : ''
}

const formatEnumConfig = (config: string): string => {
  if (!config) return '-'
  try {
    const list = JSON.parse(config)
    return list.map((item: any) => item.value || item.label || item).join(', ')
  } catch {
    return config
  }
}
</script>

<style scoped>
.validate-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  gap: 8px;
}

.validate-main {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.panel {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-search {
  padding: 6px 8px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Tree panel */
.tree-panel {
  width: 240px;
  flex-shrink: 0;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

/* Editor panel */
.editor-panel {
  flex: 1;
}

.editor-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.editor-body {
  flex: 1;
  min-height: 300px;
}

/* Result panel */
.result-panel {
  width: 320px;
  flex-shrink: 0;
}

.result-summary {
  padding: 12px;
}

.summary-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.text-success {
  color: #67C23A;
}

.text-error {
  color: #F56C6C;
}

.summary-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-pass .stat-value { color: #67C23A; }
.stat-warn .stat-value { color: #E6A23C; }
.stat-error .stat-value { color: #F56C6C; }

.error-list {
  padding: 0 8px;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-item:hover {
  background: #f5f7fa;
}

.error-item.active {
  background: #ecf5ff;
}

.error-info {
  flex: 1;
  min-width: 0;
}

.error-text {
  font-size: 13px;
  color: #303133;
}

.error-path {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* Detail panel */
.validate-detail {
  display: flex;
  gap: 8px;
  border-top: 1px solid #e4e7ed;
  padding-top: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.detail-section {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  color: #303133;
}

.xml-content {
  background: #1d1e2c;
  color: #d4d4d4;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 150px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
