<template>
  <div class="test-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>在线测试 - {{ converter?.name }}</span>
          <div>
            <el-button @click="router.back()">返回</el-button>
            <el-button type="primary" @click="executeTest" :loading="testing">
              <el-icon><VideoPlay /></el-icon>执行测试
            </el-button>
          </div>
        </div>
      </template>

      <div class="test-content">
        <!-- Input -->
        <div class="test-panel">
          <div class="panel-title">
            输入 ({{ converter?.sourceFormat }})
            <div>
              <el-button size="small" @click="loadSample">加载示例</el-button>
              <el-button size="small" @click="formatInput">格式化</el-button>
            </div>
          </div>
          <div class="editor-container" ref="inputEditorRef"></div>
        </div>

        <!-- Output -->
        <div class="test-panel">
          <div class="panel-title">
            输出 ({{ converter?.targetFormat }})
            <el-button size="small" @click="formatOutput">格式化</el-button>
          </div>
          <div class="editor-container" ref="outputEditorRef"></div>
        </div>
      </div>

      <!-- Result Info -->
      <div v-if="result" class="result-info">
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="状态">
            <el-tag :type="result.success ? 'success' : 'danger'">
              {{ result.success ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="耗时">{{ result.duration }}ms</el-descriptions-item>
          <el-descriptions-item label="TraceId">{{ result.traceId }}</el-descriptions-item>
          <el-descriptions-item label="错误信息">{{ result.errorMessage || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- Logs -->
        <el-collapse style="margin-top: 12px">
          <el-collapse-item title="执行日志" name="logs">
            <pre class="log-content">{{ result.logs }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as monaco from 'monaco-editor'
import { getConverterById } from '@/api/converter'
import { testTransform } from '@/api/transform'
import { getTemplateById } from '@/api/template'

const router = useRouter()
const route = useRoute()
const converterId = route.params.id as string

const converter = ref<any>(null)
const testing = ref(false)
const result = ref<any>(null)
const templateSampleData = ref('')

const inputEditorRef = ref<HTMLElement>()
const outputEditorRef = ref<HTMLElement>()
let inputEditor: monaco.editor.IStandaloneCodeEditor | null = null
let outputEditor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(async () => {
  converter.value = await getConverterById(converterId)

  // Load source template sample data as default input
  let defaultInput = converter.value?.sourceSample || ''
  if (converter.value?.sourceTemplateId) {
    try {
      const tpl: any = await getTemplateById(converter.value.sourceTemplateId)
      if (tpl?.sampleData) {
        defaultInput = tpl.sampleData
        templateSampleData.value = tpl.sampleData
      }
    } catch (e) { /* ignore */ }
  }

  await nextTick()

  if (inputEditorRef.value) {
    inputEditor = monaco.editor.create(inputEditorRef.value, {
      value: defaultInput,
      language: converter.value?.sourceFormat === 'XML' ? 'xml' : 'json',
      theme: 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true
    })
  }

  if (outputEditorRef.value) {
    outputEditor = monaco.editor.create(outputEditorRef.value, {
      value: '',
      language: converter.value?.targetFormat === 'XML' ? 'xml' : 'json',
      theme: 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      readOnly: true,
      scrollBeyondLastLine: false,
      automaticLayout: true
    })
  }
})

onBeforeUnmount(() => {
  inputEditor?.dispose()
  outputEditor?.dispose()
})

const loadSample = () => {
  if (!inputEditor) return
  const sample = templateSampleData.value || converter.value?.sourceSample
  if (sample) {
    inputEditor.setValue(sample)
  } else {
    ElMessage.warning('无示例数据')
  }
}

const formatXml = (xml: string): string => {
  const trimmed = xml.trim()
  const declMatch = trimmed.match(/^<\?xml\s[^?]*\?>/i)
  const decl = declMatch ? declMatch[0] : ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(trimmed, 'text/xml')

  const formatNode = (node: Node, indent: number): string => {
    const pad = '  '.repeat(indent)
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      return text || ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    const tag = el.tagName
    const attrs = Array.from(el.attributes).map(a => ` ${a.name}="${a.value}"`).join('')
    const children = Array.from(el.childNodes).map(c => formatNode(c, indent + 1)).filter(Boolean)
    if (children.length === 0) {
      return `${pad}<${tag}${attrs}/>`
    }
    // Always use multi-line format for elements with child elements
    const hasElementChild = Array.from(el.childNodes).some(c => c.nodeType === Node.ELEMENT_NODE)
    if (!hasElementChild && children.length === 1 && children[0].length < 80) {
      // Single text content, can be on same line
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

  return (decl ? decl + '\n' : '') + elements.join('\n')
}

const formatEditor = (editor: monaco.editor.IStandaloneCodeEditor | null, format: string) => {
  if (!editor) return
  const value = editor.getValue()
  try {
    if (format === 'JSON') {
      editor.setValue(JSON.stringify(JSON.parse(value), null, 2))
    } else if (format === 'XML' || format === 'HL7_V3') {
      editor.setValue(formatXml(value))
    }
  } catch (e) {
    ElMessage.warning('格式化失败，请检查语法')
  }
}

const formatInput = () => formatEditor(inputEditor, converter.value?.sourceFormat || 'JSON')
const formatOutput = () => formatEditor(outputEditor, converter.value?.targetFormat || 'JSON')

const executeTest = async () => {
  if (!inputEditor) return
  const inputData = inputEditor.getValue()
  if (!inputData.trim()) {
    ElMessage.warning('请输入测试数据')
    return
  }

  testing.value = true
  try {
    const res: any = await testTransform({ converterId, inputData })
    result.value = res
    if (outputEditor) {
      outputEditor.setValue(res.outputData || res.errorMessage || '')
    }
  } catch (e: any) {
    ElMessage.error('测试失败: ' + e.message)
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.test-page {
  height: calc(100vh - 80px);
}

.test-page :deep(.el-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.test-page :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-content {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.test-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.panel-title {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-container {
  flex: 1;
  min-height: 300px;
}

.result-info {
  margin-top: 12px;
  flex-shrink: 0;
}

.log-content {
  background: #1d1e2c;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
