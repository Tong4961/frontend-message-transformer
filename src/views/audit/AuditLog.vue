<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>审计日志</span>
        </div>
      </template>
      <el-form :inline="true" :model="searchForm" style="margin-bottom: 12px">
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" clearable placeholder="全部" style="width: 120px">
            <el-option label="配置变更" value="CONFIG" />
            <el-option label="转换执行" value="TRANSFORM" />
          </el-select>
        </el-form-item>
        <el-form-item label="转换器编码">
          <el-input v-model="searchForm.converterCode" clearable placeholder="编码" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部" style="width: 100px">
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column prop="requestTime" label="时间" width="170" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'CONFIG' ? 'warning' : ''" size="small">
              {{ row.type === 'CONFIG' ? '配置变更' : '转换执行' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.operation" size="small" :type="getOperationType(row.operation)">
              {{ getOperationLabel(row.operation) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="对象类型" width="100" align="center">
          <template #default="{ row }">
            {{ getTargetTypeLabel(row.targetType) }}
          </template>
        </el-table-column>
        <el-table-column prop="targetName" label="对象名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="converterCode" label="转换器" width="150" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'" size="small">
              {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.changeDetail" link type="primary" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <span class="pagination-info">共 {{ pagination.total }} 条</span>
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="sizes, prev, pager, next, jumper"
          background
          @current-change="(val: number) => { pagination.page = val; loadData() }"
          @size-change="(val: number) => { pagination.size = val; pagination.page = 1; loadData() }"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="变更详情" width="800px">
      <div v-if="detailData">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="时间">{{ detailData.requestTime }}</el-descriptions-item>
          <el-descriptions-item label="转换器">{{ detailData.converterCode }}</el-descriptions-item>
          <el-descriptions-item label="操作">{{ getOperationLabel(detailData.operation) }}</el-descriptions-item>
          <el-descriptions-item label="对象">{{ detailData.targetName }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="parsedDetail">
          <!-- Added rules -->
          <div v-if="parsedDetail.added?.length" class="change-section">
            <h4 class="change-title added">+ 新增规则 ({{ parsedDetail.added.length }}条)</h4>
            <el-table :data="parsedDetail.added" stripe size="small">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="source" label="源表达式" min-width="200" show-overflow-tooltip />
              <el-table-column prop="target" label="目标表达式" min-width="200" show-overflow-tooltip />
              <el-table-column prop="converter" label="转换函数" width="150" show-overflow-tooltip />
            </el-table>
          </div>

          <!-- Deleted rules -->
          <div v-if="parsedDetail.deleted?.length" class="change-section">
            <h4 class="change-title deleted">- 删除规则 ({{ parsedDetail.deleted.length }}条)</h4>
            <el-table :data="parsedDetail.deleted" stripe size="small">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="source" label="源表达式" min-width="200" show-overflow-tooltip />
              <el-table-column prop="target" label="目标表达式" min-width="200" show-overflow-tooltip />
              <el-table-column prop="converter" label="转换函数" width="150" show-overflow-tooltip />
            </el-table>
          </div>

          <!-- Modified rules -->
          <div v-if="parsedDetail.modified?.length" class="change-section">
            <h4 class="change-title modified">~ 修改规则 ({{ parsedDetail.modified.length }}条)</h4>
            <el-table :data="parsedDetail.modified" stripe size="small">
              <el-table-column type="index" label="#" width="50" />
              <el-table-column prop="rule" label="规则" min-width="250" show-overflow-tooltip />
              <el-table-column label="变更内容" min-width="400">
                <template #default="{ row }">
                  <div v-for="(val, key) in row.changes" :key="key" class="change-item">
                    <span class="change-key">{{ key }}:</span> {{ val }}
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- No changes -->
          <el-empty v-if="!parsedDetail.added?.length && !parsedDetail.deleted?.length && !parsedDetail.modified?.length"
            description="无变更" :image-size="60" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getAuditPage } from '@/api/audit'

const loading = ref(false)
const tableData = ref<any[]>([])
const detailVisible = ref(false)
const detailData = ref<any>(null)

const searchForm = reactive({ type: '', converterCode: '', status: '' })
const pagination = reactive({ page: 1, size: 10, total: 0 })

const parsedDetail = computed(() => {
  if (!detailData.value?.changeDetail) return null
  try {
    return JSON.parse(detailData.value.changeDetail)
  } catch {
    return null
  }
})

const loadData = async () => {
  loading.value = true
  try {
    const res: any = await getAuditPage({ page: pagination.page, size: pagination.size, ...searchForm })
    tableData.value = res.records || []
    pagination.total = Number(res.total) || 0
  } finally {
    loading.value = false
  }
}

const showDetail = (row: any) => {
  detailData.value = row
  detailVisible.value = true
}

const getOperationType = (op: string) => {
  if (op === 'CREATE') return 'success'
  if (op === 'UPDATE') return 'warning'
  if (op === 'DELETE') return 'danger'
  return ''
}

const getOperationLabel = (op: string) => {
  if (op === 'CREATE') return '新建'
  if (op === 'UPDATE') return '修改'
  if (op === 'DELETE') return '删除'
  return op
}

const getTargetTypeLabel = (type: string) => {
  if (type === 'CONVERTER') return '转换器'
  if (type === 'RULE') return '映射规则'
  if (type === 'TEMPLATE') return '模板'
  return type || '-'
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.change-section {
  margin-bottom: 16px;
}
.change-title {
  font-size: 14px;
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 4px;
}
.change-title.added {
  background: #f0f9eb;
  color: #67c23a;
}
.change-title.deleted {
  background: #fef0f0;
  color: #f56c6c;
}
.change-title.modified {
  background: #fdf6ec;
  color: #e6a23c;
}
.change-item {
  font-size: 12px;
  line-height: 1.8;
}
.change-key {
  color: #909399;
  margin-right: 4px;
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
</style>
