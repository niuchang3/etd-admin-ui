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

          <a-select
            v-model:value="query.eventTypeId"
            allow-clear
            show-search
            option-filter-prop="label"
            class="event-type-select"
            placeholder="事件类型"
            :options="eventTypeSelectOptions"
          />

          <a-input
            v-model:value="query.sourceApplication"
            allow-clear
            class="search-input"
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

      <!-- 消息列表数据表格：只读查看，不展示大 JSON -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1080 }"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 事件 ID（等宽显示） -->
          <code v-if="column.key === 'eventId'" class="code-value du-mono event-id-cell">
            {{ record.eventId }}
          </code>

          <!-- 事件类型 -->
          <span v-else-if="column.key === 'eventType'">
            {{ record.eventName || record.eventType }}
          </span>

          <!-- 来源应用 -->
          <span v-else-if="column.key === 'sourceApplication'">
            {{ record.sourceApplication }}
          </span>

          <!-- 消息版本 -->
          <code v-else-if="column.key === 'version'" class="code-value du-mono">
            v{{ record.eventVersion }}
          </code>

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
import { useTablePagination } from '@/composables/useTablePagination'
import { formatDateTime } from '@/utils/format'
import MessageDetailDrawer from './components/MessageDetailDrawer.vue'

// 表格列定义
const columns = computed<TableColumnsType<EventMessageRecord>>(() => [
  { title: '事件 ID', dataIndex: 'eventId', key: 'eventId', width: 220 },
  { title: '事件类型', dataIndex: 'eventType', key: 'eventType', width: 200, ellipsis: true },
  { title: '来源应用', dataIndex: 'sourceApplication', key: 'sourceApplication', width: 170 },
  { title: '协议版本', dataIndex: 'eventVersion', key: 'version', width: 90 },
  { title: '发生时间', dataIndex: 'occurredAt', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right', align: 'right' },
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
    eventTypeId: undefined,
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
}

.search-input {
  width: 160px;
}

.event-id-input {
  width: 190px;
}

.event-type-select {
  width: 180px;
}

.time-range-picker {
  width: 320px;
}

.code-value {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.event-id-cell {
  user-select: all;
}

.create-time-cell {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}
</style>
