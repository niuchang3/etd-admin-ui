<template>
  <!-- 事件类型主页面：严格遵循 Dense Utility 规范与 34px 标准行高 -->
  <section class="management-page event-types-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <!-- 筛选过滤表单 -->
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索事件名称或编码"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-input
            v-model:value="query.sourceApplication"
            allow-clear
            class="search-input"
            placeholder="搜索来源应用"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-select
            v-model:value="query.enabled"
            allow-clear
            class="status-select"
            placeholder="启用状态"
            :options="[
              { label: '已启用', value: true },
              { label: '已停用', value: false },
            ]"
          />

          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="resetSearch()">
            <ReloadOutlined />重置
          </a-button>
        </div>

        <a-button v-if="canWrite" type="primary" @click="openCreate">
          <PlusOutlined />新增事件类型
        </a-button>
      </header>

      <!-- 事件类型数据表格：行高严格锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 事件名称 -->
          <span v-if="column.key === 'eventName'" class="entity-name-text">
            {{ record.eventName }}
          </span>

          <!-- 事件类型编码（点分格式，等宽字体） -->
          <code v-else-if="column.key === 'eventType'" class="code-value du-mono">
            {{ record.eventType }}
          </code>

          <!-- 来源应用 -->
          <span v-else-if="column.key === 'sourceApplication'" class="source-app-text">
            {{ record.sourceApplication || '—' }}
          </span>

          <!-- 最新协议版本 -->
          <code v-else-if="column.key === 'latestVersion'" class="code-value du-mono">
            {{ record.latestVersion || '—' }}
          </code>

          <!-- 描述 -->
          <EllipsisText
            v-else-if="column.key === 'description'"
            :text="record.description"
            max-width="200px"
          />

          <!-- 启用状态（标准 Switch 开关，严禁加 size="small"） -->
          <a-switch
            v-else-if="column.key === 'enabled'"
            :checked="record.enabled"
            :loading="statusChangingId === record.id"
            :disabled="!canWrite"
            checked-children="启用"
            un-checked-children="停用"
            @change="handleStatusChange(record, Boolean($event))"
          />

          <!-- 更新时间 -->
          <span v-else-if="column.key === 'updateTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.updateTime) }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <template v-if="canWrite">
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />编辑
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                :loading="deletingId === record.id"
                :disabled="deletingId === record.id"
                @click="confirmDelete(record)"
              >
                <DeleteOutlined />删除
              </a-button>
            </template>
            <span v-else class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无事件类型数据" />
        </template>
      </a-table>
    </div>

    <!-- 模块专属私有弹窗 -->
    <EventTypeModal
      v-model:open="editorOpen"
      :record="currentEditingRecord"
      @success="loadEventTypes"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type TableColumnsType } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  changeEventTypeEnabled,
  deleteEventType,
  getEventTypePage,
} from '@/apis/event/type'
import type { EventTypeQuery, EventTypeRecord } from '@/apis/event/type/type'
import { menusStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import EllipsisText from '@/components/EllipsisText.vue'
import EventTypeModal from './components/EventTypeModal.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 表格列定义（保证等宽、单行不换行与高度绝对齐平 34px）
const columns = computed<TableColumnsType<EventTypeRecord>>(() => [
  { title: '事件名称', dataIndex: 'eventName', key: 'eventName', width: 170 },
  { title: '事件类型编码', dataIndex: 'eventType', key: 'eventType', width: 220 },
  { title: '来源应用', dataIndex: 'sourceApplication', key: 'sourceApplication', width: 160 },
  { title: '最新协议版本', dataIndex: 'latestVersion', key: 'latestVersion', width: 110 },
  { title: '事件描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '启用状态', dataIndex: 'enabled', key: 'enabled', width: 85 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 150 },
  { title: '操作', key: 'actions', width: 120, align: 'right' },
])

// 异步操作状态
const statusChangingId = ref<string>('')
const deletingId = ref<string>('')

// 弹窗状态
const editorOpen = ref(false)
const currentEditingRecord = ref<EventTypeRecord | null>(null)

// 分页与筛选 Hook
const {
  loading,
  records,
  query,
  pagination,
  loadData: loadEventTypes,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<EventTypeRecord, EventTypeQuery>(
  getEventTypePage,
  {
    current: 1,
    size: 10,
    keyword: '',
    sourceApplication: '',
    enabled: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const openCreate = () => {
  if (!canWrite.value) return
  currentEditingRecord.value = null
  editorOpen.value = true
}

const openEdit = (record: EventTypeRecord) => {
  if (!canWrite.value) return
  currentEditingRecord.value = record
  editorOpen.value = true
}

const handleStatusChange = (record: EventTypeRecord, enabled: boolean) => {
  if (!canWrite.value) return
  const actionText = enabled ? '启用' : '停用'

  confirmAction({
    title: `确认${actionText}事件类型`,
    content: `确定要${actionText}事件类型【${record.eventName}】(${record.eventType}) 吗？${!enabled ? '停用后相关订阅将停止接收新消息。' : ''}`,
    okText: '确认',
    okType: enabled ? 'primary' : 'danger',
    onOk: async () => {
      statusChangingId.value = record.id
      try {
        await changeEventTypeEnabled(record.id, enabled)
        message.success(`事件类型已${actionText}`)
        await loadEventTypes()
      } finally {
        statusChangingId.value = ''
      }
    },
    onCancel: () => {
      // 取消时重新拉取刷新，确保 Switch 视图复位
      void loadEventTypes()
    },
  })
}

const confirmDelete = (record: EventTypeRecord) => {
  if (!canWrite.value) return
  confirmAction({
    title: '确认删除事件类型',
    content: `确定要删除事件类型【${record.eventName}】(${record.eventType}) 吗？如存在关联订阅，后端将拒绝删除。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteEventType(record.id)
        message.success('事件类型删除成功')
        await refreshAfterDelete()
      } finally {
        deletingId.value = ''
      }
    },
  })
}
</script>

<style scoped>
.event-types-page {
  display: flex;
  flex-direction: column;
}

.table-panel {
  overflow: hidden;
}

.page-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: var(--du-space-3, 12px);
  padding: var(--du-space-2, 8px) var(--du-space-3, 12px);
  border-bottom: 1px solid var(--du-border, #f0f0f0);
}

.filters,
.row-actions {
  display: flex;
  align-items: center;
  gap: var(--du-space-2, 8px);
}

.search-input {
  width: 180px;
}

.status-select {
  width: 105px;
}

.entity-name-text {
  font-size: var(--du-font-size-sm, 12px);
  font-weight: var(--du-font-weight-normal, 400);
}

.code-value {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.source-app-text {
  font-size: var(--du-font-size-sm, 12px);
}

.create-time-cell {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.readonly-label {
  color: var(--du-text-muted, #8c8c8c);
  font-size: var(--du-font-size-xs, 11px);
}
</style>
