<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑转换器' : '创建转换器' }}</span>
          <div>
            <el-button @click="router.back()">返回</el-button>
            <el-button type="primary" @click="handleSave">保存</el-button>
          </div>
        </div>
      </template>
      <el-form :model="formData" label-width="120px" style="max-width: 800px">
        <el-form-item label="编码" required>
          <el-input v-model="formData.code" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="源类型" required>
          <el-select v-model="formData.sourceFormat">
            <el-option label="HL7 V3" value="HL7_V3" />
            <el-option label="XML" value="XML" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标类型" required>
          <el-select v-model="formData.targetFormat">
            <el-option label="HL7 V3" value="HL7_V3" />
            <el-option label="XML" value="XML" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-divider />
        <el-form-item label="源模板">
          <el-select v-model="formData.sourceTemplateId" clearable placeholder="选择源模板" style="width: 100%">
            <el-option v-for="t in sourceTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标模板">
          <el-select v-model="formData.targetTemplateId" clearable placeholder="选择目标模板" style="width: 100%">
            <el-option v-for="t in targetTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-divider />
        <el-form-item label="源示例数据">
          <el-input v-model="formData.sourceSample" type="textarea" :rows="8" placeholder="粘贴XML或JSON示例数据" />
        </el-form-item>
        <el-form-item label="目标示例数据">
          <el-input v-model="formData.targetSample" type="textarea" :rows="8" placeholder="粘贴XML或JSON示例数据" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getConverterById, createConverter, updateConverter } from '@/api/converter'
import { getTemplateList } from '@/api/template'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const allTemplates = ref<any[]>([])
const formData = reactive({
  id: null as number | null,
  code: '',
  name: '',
  sourceFormat: 'XML',
  targetFormat: 'JSON',
  description: '',
  sourceSample: '',
  targetSample: '',
  sourceTemplateId: null as number | null,
  targetTemplateId: null as number | null
})

const sourceTemplates = computed(() =>
  allTemplates.value.filter((t: any) => {
    if (formData.sourceFormat === 'XML') {
      return t.format === 'XML' || t.format === 'HL7_V3'
    }
    return t.format === formData.sourceFormat
  })
)
const targetTemplates = computed(() =>
  allTemplates.value.filter((t: any) => {
    if (formData.targetFormat === 'XML') {
      return t.format === 'XML' || t.format === 'HL7_V3'
    }
    return t.format === formData.targetFormat
  })
)

onMounted(async () => {
  allTemplates.value = (await getTemplateList() as any) || []
  if (route.params.id) {
    const data: any = await getConverterById(route.params.id as string)
    Object.assign(formData, data)
  }
})

const handleSave = async () => {
  if (isEdit.value) {
    await updateConverter(formData)
  } else {
    await createConverter(formData)
  }
  ElMessage.success('保存成功')
  router.push('/converter')
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
