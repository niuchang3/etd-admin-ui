<template>
  <!-- Dashboard 任务表格负责业务筛选和任务专用单元格，不污染通用表格组件。 -->
  <DataTable
    title="运行任务"
    :columns="columns"
    :data-source="filteredTasks"
    :pagination="pagination"
    :row-selection="rowSelection"
    :scroll="{ x: 900 }"
    :size="tableSize"
    row-key="id"
  >
    <template #filters>
      <a-input v-model:value="keyword" allow-clear placeholder="搜索任务名称或编号" class="search-field">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-select v-model:value="statusFilter" :options="statusOptions" class="select-field" />
      <a-select v-model:value="ownerFilter" :options="ownerOptions" class="select-field" />
      <a-button>更多筛选 <DownOutlined /></a-button>
    </template>

    <template #filterActions>
      <span class="updated-at">更新于 10:32:18</span>
      <a-button aria-label="导出任务"><DownloadOutlined /></a-button>
      <a-button aria-label="表格设置"><SettingOutlined /></a-button>
    </template>

    <template #toolbar>
      <a-segmented v-model:value="density" :options="['紧凑', '标准']" size="small" />
    </template>

    <template #bodyCell="{ column, record }">
      <button v-if="column.key === 'id'" type="button" class="task-id">{{ record.id }}</button>
      <div v-else-if="column.key === 'name'" class="task-name">
        <strong>{{ record.name }}</strong>
        <span>{{ record.description }}</span>
      </div>
      <StatusBadge v-else-if="column.key === 'status'" :tone="statusTone(record.status)">{{ record.status }}</StatusBadge>
      <CompactProgress v-else-if="column.key === 'progress'" :value="record.progress" />
      <UserCell v-else-if="column.key === 'owner'" :name="record.owner" />
      <span v-else-if="column.key === 'updatedAt'" class="du-mono secondary-value">{{ record.updatedAt }}</span>
      <RowActions v-else-if="column.key === 'action'" :actions="rowActions" @select="handleAction(record, $event)" />
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType, TableProps } from 'ant-design-vue'
import { DownOutlined, DownloadOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons-vue'
import CompactProgress from '@/components/data/CompactProgress.vue'
import DataTable from '@/components/data/DataTable.vue'
import RowActions from '@/components/data/RowActions.vue'
import UserCell from '@/components/data/UserCell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { TaskRecord, TaskStatus } from '../dashboard.types'

const props = defineProps<{
  tasks: TaskRecord[]
}>()

const keyword = ref('')
const statusFilter = ref('all')
const ownerFilter = ref('all')
const density = ref('紧凑')
const selectedRowKeys = ref<string[]>([])

const columns: TableColumnsType<TaskRecord> = [
  { title: '任务编号', dataIndex: 'id', key: 'id', width: 104 },
  { title: '任务', dataIndex: 'name', key: 'name', width: 230 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 92 },
  { title: '进度', dataIndex: 'progress', key: 'progress', width: 150 },
  { title: '负责人', dataIndex: 'owner', key: 'owner', width: 110 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 104 },
  { title: '', key: 'action', width: 42, align: 'center' },
]

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: '运行中', label: '运行中' },
  { value: '待处理', label: '待处理' },
  { value: '已完成', label: '已完成' },
  { value: '异常', label: '异常' },
]

const ownerOptions = computed(() => [
  { value: 'all', label: '全部负责人' },
  ...Array.from(new Set(props.tasks.map((task) => task.owner))).map((owner) => ({ value: owner, label: owner })),
])

const filteredTasks = computed(() => props.tasks.filter((task) => {
  const matchesKeyword = !keyword.value || `${task.id}${task.name}${task.description}`.toLowerCase().includes(keyword.value.toLowerCase())
  const matchesStatus = statusFilter.value === 'all' || task.status === statusFilter.value
  const matchesOwner = ownerFilter.value === 'all' || task.owner === ownerFilter.value
  return matchesKeyword && matchesStatus && matchesOwner
}))

const rowSelection = computed<TableProps<TaskRecord>['rowSelection']>(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys as string[]
  },
}))

const pagination = {
  pageSize: 6,
  size: 'small' as const,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 条`,
}

const tableSize = computed(() => density.value === '紧凑' ? 'small' as const : 'middle' as const)
const rowActions = [
  { key: 'detail', label: '查看详情' },
  { key: 'retry', label: '重新执行' },
  { key: 'cancel', label: '取消任务', danger: true },
]

const statusTone = (status: TaskStatus) => ({
  运行中: 'info',
  待处理: 'warning',
  已完成: 'success',
  异常: 'danger',
} as const)[status]

const handleAction = (task: TaskRecord, action: string) => {
  message.info(`任务 ${task.id}：${action}`)
}
</script>

<style scoped>
.search-field {
  width: 230px;
}

.select-field {
  width: 118px;
}

.updated-at {
  color: var(--du-text-muted);
  font-family: var(--du-font-mono);
  font-size: 10px;
  white-space: nowrap;
}

.task-id {
  padding: 0;
  color: var(--du-accent);
  border: 0;
  background: transparent;
  cursor: pointer;
  font-family: var(--du-font-mono);
  font-size: 11px;
  font-weight: 600;
}

.task-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.2;
}

.task-name strong,
.task-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-name strong {
  font-size: 12px;
  font-weight: 600;
}

.task-name span {
  margin-top: 3px;
  color: var(--du-text-muted);
  font-family: var(--du-font-mono);
  font-size: 9px;
}

.secondary-value {
  color: var(--du-text-secondary);
  font-size: 10px;
}

@media (max-width: 1240px) {
  .updated-at {
    display: none;
  }
}
</style>
