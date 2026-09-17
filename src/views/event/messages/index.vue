<template>
  <!-- 事件消息只读查询页面：严格遵循 Dense Utility 规范与 34px 行高 -->
  <section class="management-page event-messages-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <!-- 筛选过滤区域 -->
        <div class="filters">
          <a-input
            v-model:value="query.eventId"
            allow-clear
            class="search-input event-id-input"
            placeholder="精确搜索事件 ID"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <!-- 原始事件类型输入框 -->
          <a-input
            v-model:value="query.eventType"
            allow-clear
            class="search-input"
            placeholder="原始事件类型"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <!-- 所属事件类型（已登记主键筛选） -->
          <a-select
            v-model:value="query.eventTypeId"
            allow-clear
            show-search
            option-filter-prop="label"
            class="event-type-select"
            placeholder="已登记事件类型"
            :options="eventTypeSelectOptions"
          />

          <!-- 消息状态下拉框 -->
          <a-select
            v-model:value="query.messageStatus"
            allow-clear
            class="status-select"
            placeholder="消息状态"
            :options="EVENT_MESSAGE_STATUS_OPTIONS"
          />

          <a-input
            v-model:value="query.sourceApplication"
            allow-clear
            class="search-input app-input"
            placeholder="来源应用"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>

          <!-- 带偏移量的 ISO-8601 时间范围选择器，原样传递 -->
          <a-range-picker
            v-model:value="dateRange"
            :show-time="{ format: 'HH:mm:ss' }"
            value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
            class="time-range-picker"
            :placeholder="['开始时间', '结束时间']"
            @change="handleDateRangeChange"
          />

          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />查询
          </a-button>
          <a-button @click="handleResetSearch">
            <ReloadOutlined />重置
          </a-button>
        </div>
      </header>

      <!-- 消息列表数据表格：只读查看，不展示大 JSON，无投递状态避免混淆 -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1125 }"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 事件 ID（等宽显示） -->
          <code v-if="column.key === 'eventId'" class="code-value du-mono event-id-cell">
            {{ record.eventId }}
          </code>

          <!-- 原始事件类型（直接显示 eventType，不依赖类型主键反查） -->
          <span v-else-if="column.key === 'eventType'" class="event-type-cell">
            <code class="code-value du-mono">{{ record.eventType || '—' }}</code>
            <span v-if="record.eventName" class="sub-label">({{ record.eventName }})</span>
          </span>

          <!-- 来源应用 -->
          <span v-else-if="column.key === 'sourceApplication'">
            {{ record.sourceApplication }}
          </span>

          <!-- 消息版本 -->
          <code v-else-if="column.key === 'version'" class="code-value du-mono">
            v{{ record.eventVersion }}
          </code>

          <!-- 消息状态：NORMAL 使用成功样式，ERROR 使用危险样式 -->
          <span v-else-if="column.key === 'messageStatus'">
            <a-badge
              :status="EVENT_MESSAGE_STATUS_BADGE[record.messageStatus] || 'default'"
              :text="EVENT_MESSAGE_STATUS_LABEL[record.messageStatus] || record.messageStatus"
            />
          </span>

          <!-- 失败原因：ERROR 消息展示原因（省略+Tooltip），NORMAL 消息为空不显示占位错误 -->
          <template v-else-if="column.key === 'failureReason'">
            <a-tooltip
              v-if="record.messageStatus === EVENT_MESSAGE_STATUS.ERROR && record.failureReason"
              :title="record.failureReason"
            >
              <span class="failure-reason-cell">{{ record.failureReason }}</span>
            </a-tooltip>
            <span v-else class="empty-cell">—</span>
          </template>

          <!-- 发生时间 -->
          <span v-else-if="column.key === 'createTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.occurredAt) }}
          </span>

          <!-- 操作列：仅只读查看详情，无修改/删除入口 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <a-button type="link" size="small" @click="openDetail(record)">
              <EyeOutlined />详情
            </a-button>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无事件消息数据" />
        </template>
      </a-table>
    </div>

    <!-- 聚合详情抽屉 -->
    <MessageDetailDrawer
      v-model:open="detailDrawerOpen"
      :message-record="currentMessageRecord"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { getEventMessagePage } from '@/apis/event/message'
import type { EventMessageQuery, EventMessageRecord } from '@/apis/event/message/type'
import { getEventTypeOptions } from '@/apis/event/type'
import type { EventTypeOption } from '@/apis/event/type/type'
import {
  EVENT_MESSAGE_STATUS,
  EVENT_MESSAGE_STATUS_BADGE,
  EVENT_MESSAGE_STATUS_LABEL,
  EVENT_MESSAGE_STATUS_OPTIONS,
} from '@/constant'
import { useTablePagination } from '@/composables/useTablePagination'
import { formatDateTime } from '@/utils/format'
import MessageDetailDrawer from './components/MessageDetailDrawer.vue'

// 表格列定义
const columns = computed<TableColumnsType<EventMessageRecord>>(() => [
  { title: '事件 ID', dataIndex: 'eventId', key: 'eventId', width: 200 },
  { title: '原始事件类型', dataIndex: 'eventType', key: 'eventType', width: 180, ellipsis: true },
  { title: '来源应用', dataIndex: 'sourceApplication', key: 'sourceApplication', width: 140 },
  { title: '协议版本', dataIndex: 'eventVersion', key: 'version', width: 85 },
  { title: '消息状态', dataIndex: 'messageStatus', key: 'messageStatus', width: 95 },
  { title: '失败原因', dataIndex: 'failureReason', key: 'failureReason', width: 200, ellipsis: true },
  { title: '发生时间', dataIndex: 'occurredAt', key: 'createTime', width: 155 },
  { title: '操作', key: 'actions', width: 70, fixed: 'right', align: 'right' },
])

const detailDrawerOpen = ref(false)
const currentMessageRecord = ref<EventMessageRecord | null>(null)
const dateRange = ref<[string, string] | null>(null)

// 事件类型下拉选项
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
  handleSearch,
  resetSearch,
  handleTableChange,
} = useTablePagination<EventMessageRecord, EventMessageQuery>(
  getEventMessagePage,
  {
    current: 1,
    size: 10,
    eventId: '',
    eventType: '',
    eventTypeId: undefined,
    messageStatus: undefined,
    sourceApplication: '',
    startTime: undefined,
    endTime: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const handleDateRangeChange = (dates: any) => {
  if (dates && dates.length === 2) {
    query.startTime = dates[0]
    query.endTime = dates[1]
  } else {
    query.startTime = undefined
    query.endTime = undefined
  }
}

const handleResetSearch = () => {
  dateRange.value = null
  resetSearch({
    eventId: '',
    eventType: '',
    eventTypeId: undefined,
    messageStatus: undefined,
    sourceApplication: '',
    startTime: undefined,
    endTime: undefined,
  })
}

const openDetail = (record: EventMessageRecord) => {
  currentMessageRecord.value = record
  detailDrawerOpen.value = true
}
</script>

<style scoped>
.event-messages-page {
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
  flex-wrap: wrap;
}

.search-input {
  width: 140px;
}

.event-id-input {
  width: 170px;
}

.event-type-select {
  width: 170px;
}

.status-select {
  width: 105px;
}

.app-input {
  width: 130px;
}

.time-range-picker {
  width: 300px;
}

.code-value {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.event-id-cell {
  user-select: all;
}

.event-type-cell {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.sub-label {
  color: var(--du-text-tertiary, #8c8c8c);
  font-size: var(--du-font-size-xs, 11px);
  margin-left: 4px;
}

.failure-reason-cell {
  color: var(--du-danger, #ff4d4f);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}

.empty-cell {
  color: var(--du-text-tertiary, #8c8c8c);
}

.create-time-cell {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}
</style>
