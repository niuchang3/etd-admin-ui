<template>
  <!-- 事件订阅主页面：高信息密度，标准 34px 行高与 Dense Utility 设计 -->
  <section class="management-page event-subscriptions-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <!-- 筛选过滤区域 -->
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索订阅名称或编码"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <a-select
            v-model:value="query.eventTypeId"
            allow-clear
            show-search
            option-filter-prop="label"
            class="event-type-select"
            placeholder="所属事件类型"
            :options="eventTypeSelectOptions"
          />

          <a-input
            v-model:value="query.subscriberApplication"
            allow-clear
            class="search-input"
            placeholder="订阅应用"
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
          <PlusOutlined />新增事件订阅
        </a-button>
      </header>

      <!-- 订阅列表表格：支持大横滚与固定列，行高齐平 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1280 }"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 订阅名称 -->
          <span v-if="column.key === 'subscriptionName'" class="entity-name-text">
            {{ record.subscriptionName }}
          </span>

          <!-- 订阅编码 -->
          <code v-else-if="column.key === 'subscriptionCode'" class="code-value du-mono">
            {{ record.subscriptionCode }}
          </code>

          <!-- 所属事件类型 -->
          <span v-else-if="column.key === 'eventType'" class="event-type-text">
            {{ record.eventName || record.eventTypeName || record.eventType || '—' }}
          </span>

          <!-- 订阅应用 -->
          <span v-else-if="column.key === 'subscriberApplication'">
            {{ record.subscriberApplication || '—' }}
          </span>

          <!-- Kafka Topic -->
          <code v-else-if="column.key === 'targetTopic'" class="code-value du-mono">
            {{ record.targetTopic || '—' }}
          </code>

          <!-- Consumer Group -->
          <code v-else-if="column.key === 'consumerGroup'" class="code-value du-mono">
            {{ record.consumerGroup || '—' }}
          </code>

          <!-- 启用状态（标准 Switch 开关） -->
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
          <a-empty description="暂无事件订阅数据" />
        </template>
      </a-table>
    </div>

    <!-- 模块专属私有弹窗 -->
    <SubscriptionModal
      v-model:open="editorOpen"
      :record="currentEditingRecord"
      @success="loadSubscriptions"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
  changeEventSubscriptionEnabled,
  deleteEventSubscription,
  getEventSubscriptionPage,
} from '@/apis/event/subscription'
import type {
  EventSubscriptionQuery,
  EventSubscriptionRecord,
} from '@/apis/event/subscription/type'
import { getEventTypeOptions } from '@/apis/event/type'
import type { EventTypeOption } from '@/apis/event/type/type'
import { menusStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import SubscriptionModal from './components/SubscriptionModal.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 表格列定义
const columns = computed<TableColumnsType<EventSubscriptionRecord>>(() => [
  { title: '订阅名称', dataIndex: 'subscriptionName', key: 'subscriptionName', width: 160 },
  { title: '订阅编码', dataIndex: 'subscriptionCode', key: 'subscriptionCode', width: 170 },
  { title: '事件类型', dataIndex: 'eventType', key: 'eventType', width: 180, ellipsis: true },
  { title: '订阅应用', dataIndex: 'subscriberApplication', key: 'subscriberApplication', width: 150 },
  { title: 'Kafka Topic', dataIndex: 'targetTopic', key: 'targetTopic', width: 180 },
  { title: 'Consumer Group', dataIndex: 'consumerGroup', key: 'consumerGroup', width: 180 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 85 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 145 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right', align: 'right' },
])

const statusChangingId = ref<string>('')
const deletingId = ref<string>('')
const editorOpen = ref(false)
const currentEditingRecord = ref<EventSubscriptionRecord | null>(null)

// 事件类型下拉项缓存
const eventTypeOptions = ref<EventTypeOption[]>([])
const loadEventTypeOptions = async () => {
  try {
    const res = await getEventTypeOptions()
    eventTypeOptions.value = res.data || []
  } catch {
    eventTypeOptions.value = []
  }
}

const eventTypeSelectOptions = computed(() => {
  return eventTypeOptions.value.map((item) => {
    const val = item.id || item.value || ''
    const label = item.eventName
      ? `${item.eventName} (${item.eventType})`
      : item.label || item.eventType || val
    return {
      value: val,
      label,
    }
  })
})

onMounted(() => {
  void loadEventTypeOptions()
})

// 分页与筛选 Hook
const {
  loading,
  records,
  query,
  pagination,
  loadData: loadSubscriptions,
  handleSearch,
  resetSearch,
  handleTableChange,
  refreshAfterDelete,
} = useTablePagination<EventSubscriptionRecord, EventSubscriptionQuery>(
  getEventSubscriptionPage,
  {
    current: 1,
    size: 10,
    keyword: '',
    eventTypeId: undefined,
    subscriberApplication: '',
    enabled: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const openCreate = () => {
  if (!canWrite.value) return
  currentEditingRecord.value = null
  editorOpen.value = true
}

const openEdit = (record: EventSubscriptionRecord) => {
  if (!canWrite.value) return
  currentEditingRecord.value = record
  editorOpen.value = true
}

const handleStatusChange = (record: EventSubscriptionRecord, enabled: boolean) => {
  if (!canWrite.value) return
  const actionText = enabled ? '启用' : '停用'

  confirmAction({
    title: `确认${actionText}事件订阅`,
    content: `确定要${actionText}订阅【${record.subscriptionName}】(${record.subscriptionCode}) 吗？${!enabled ? '停用后事件中心将停止向该消费组投递新消息。' : ''}`,
    okText: '确认',
    okType: enabled ? 'primary' : 'danger',
    onOk: async () => {
      statusChangingId.value = record.id
      try {
        await changeEventSubscriptionEnabled(record.id, enabled)
        message.success(`订阅已${actionText}`)
        await loadSubscriptions()
      } finally {
        statusChangingId.value = ''
      }
    },
    onCancel: () => {
      void loadSubscriptions()
    },
  })
}

const confirmDelete = (record: EventSubscriptionRecord) => {
  if (!canWrite.value) return
  confirmAction({
    title: '确认删除事件订阅',
    content: `确定要删除订阅【${record.subscriptionName}】(${record.subscriptionCode}) 吗？此操作将逻辑删除该订阅配置。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      deletingId.value = record.id
      try {
        await deleteEventSubscription(record.id)
        message.success('订阅删除成功')
        await refreshAfterDelete()
      } finally {
        deletingId.value = ''
      }
    },
  })
}
</script>

<style scoped>
.event-subscriptions-page {
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
  width: 170px;
}

.event-type-select {
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

.event-type-text {
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
