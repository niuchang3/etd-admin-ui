<template>
  <!-- 投递管理主页面：标准 Dense Utility 规范，34px 行高与状态映射 -->
  <section class="management-page event-deliveries-page">
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
            v-model:value="query.subscriptionId"
            allow-clear
            show-search
            option-filter-prop="label"
            class="subscription-select"
            placeholder="所属事件订阅"
            :options="subscriptionSelectOptions"
          />

          <a-select
            v-model:value="query.deliveryStatus"
            allow-clear
            class="status-select"
            placeholder="投递状态"
            :options="EVENT_DELIVERY_STATUS_OPTIONS"
          />

          <!-- 带偏移量的 ISO-8601 时间选择器 -->
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

      <!-- 投递记录列表表格：行高严格锁定 34px -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1320 }"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 事件 ID（等宽显示） -->
          <code v-if="column.key === 'eventId'" class="code-value du-mono event-id-cell">
            {{ record.eventId }}
          </code>

          <!-- 订阅名称 -->
          <span v-else-if="column.key === 'subscriptionName'" class="entity-name-text">
            {{ record.subscriptionName || '—' }}
          </span>

          <!-- 订阅应用 -->
          <span v-else-if="column.key === 'subscriberApplication'">
            {{ record.subscriberApplication || '—' }}
          </span>

          <!-- Kafka Topic -->
          <code v-else-if="column.key === 'targetTopic'" class="code-value du-mono">
            {{ record.targetTopic || '—' }}
          </code>

          <!-- 投递状态（集中映射 Badge） -->
          <span v-else-if="column.key === 'deliveryStatus'">
            <a-badge
              :status="getDeliveryBadgeStatus(record.deliveryStatus)"
              :text="getDeliveryStatusLabel(record.deliveryStatus)"
            />
          </span>

          <!-- 尝试次数 -->
          <span v-else-if="column.key === 'attemptCount'" class="du-mono">
            {{ record.attemptCount ?? 0 }}
          </span>

          <!-- 更新时间 -->
          <span v-else-if="column.key === 'updateTime'" class="create-time-cell du-mono">
            {{ formatDateTime(record.updateTime) }}
          </span>

          <!-- 操作列 -->
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <!-- 详情（所有人可查看） -->
            <a-button type="link" size="small" @click="openDetail(record)">
              <EyeOutlined />详情
            </a-button>

            <!-- 定向重播：仅在状态 3（等待重试）与 4（死信）且具备写权限时可见 -->
            <template v-if="canWrite">
              <a-button
                v-if="isReplayable(record)"
                type="link"
                size="small"
                @click="openReplay(record)"
              >
                <RedoOutlined />重播
              </a-button>
            </template>
            <span v-else-if="isReplayable(record)" class="readonly-label">只读</span>
          </div>
        </template>

        <template #emptyText>
          <a-empty description="暂无投递记录" />
        </template>
      </a-table>
    </div>

    <!-- 投递详情抽屉 -->
    <DeliveryDetailDrawer
      v-model:open="detailDrawerOpen"
      :delivery-record="currentDeliveryRecord"
      :can-write="canWrite"
      @replay="handleDrawerReplay"
    />

    <!-- 重播二次确认弹窗 -->
    <DeliveryReplayModal
      v-model:open="replayModalOpen"
      :record="currentReplayRecord"
      @success="handleReplaySuccess"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TableColumnsType } from 'ant-design-vue'
import {
  EyeOutlined,
  RedoOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { getEventDeliveryPage } from '@/apis/event/delivery'
import type { EventDeliveryQuery, EventDeliveryRecord } from '@/apis/event/delivery/type'
import { getEventSubscriptionOptions } from '@/apis/event/subscription'
import type { EventSubscriptionOption } from '@/apis/event/subscription/type'
import {
  EVENT_DELIVERY_STATUS,
  EVENT_DELIVERY_STATUS_BADGE,
  EVENT_DELIVERY_STATUS_LABEL,
  EVENT_DELIVERY_STATUS_OPTIONS,
} from '@/constant'
import { menusStore } from '@/stores/modules/user'
import { useTablePagination } from '@/composables/useTablePagination'
import { formatDateTime } from '@/utils/format'
import DeliveryDetailDrawer from './components/DeliveryDetailDrawer.vue'
import DeliveryReplayModal from './components/DeliveryReplayModal.vue'

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

// 表格列定义
const columns = computed<TableColumnsType<EventDeliveryRecord>>(() => [
  { title: '事件 ID', dataIndex: 'eventId', key: 'eventId', width: 220 },
  { title: '订阅名称', dataIndex: 'subscriptionName', key: 'subscriptionName', width: 180 },
  { title: '订阅应用', dataIndex: 'subscriberApplication', key: 'subscriberApplication', width: 160 },
  { title: 'Kafka Topic', dataIndex: 'targetTopic', key: 'targetTopic', width: 200 },
  { title: '投递状态', dataIndex: 'deliveryStatus', key: 'deliveryStatus', width: 100 },
  { title: '尝试次数', dataIndex: 'attemptCount', key: 'attemptCount', width: 85 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 145 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right', align: 'right' },
])

const detailDrawerOpen = ref(false)
const replayModalOpen = ref(false)
const currentDeliveryRecord = ref<EventDeliveryRecord | null>(null)
const currentReplayRecord = ref<EventDeliveryRecord | null>(null)
const dateRange = ref<[string, string] | null>(null)

// 订阅选项
const subscriptionOptions = ref<EventSubscriptionOption[]>([])
const loadSubscriptionOptions = async () => {
  try {
    const res = await getEventSubscriptionOptions()
    subscriptionOptions.value = res.data || []
  } catch {
    subscriptionOptions.value = []
  }
}

const subscriptionSelectOptions = computed(() => {
  return subscriptionOptions.value.map((item) => {
    const val = item.id || item.value || ''
    const label = item.subscriptionName || item.label || val
    return {
      value: val,
      label,
    }
  })
})

onMounted(() => {
  void loadSubscriptionOptions()
})

// 分页与筛选 Hook
const {
  loading,
  records,
  query,
  pagination,
  loadData: loadDeliveries,
  handleSearch,
  resetSearch,
  handleTableChange,
} = useTablePagination<EventDeliveryRecord, EventDeliveryQuery>(
  getEventDeliveryPage,
  {
    current: 1,
    size: 10,
    eventId: '',
    subscriptionId: undefined,
    deliveryStatus: undefined,
    startTime: undefined,
    endTime: undefined,
  },
  { defaultSize: 10, immediate: true }
)

const isReplayable = (record: EventDeliveryRecord) => {
  return (
    record.deliveryStatus === EVENT_DELIVERY_STATUS.RETRYING ||
    record.deliveryStatus === EVENT_DELIVERY_STATUS.DEAD_LETTER
  )
}

const getDeliveryStatusLabel = (status: number) => {
  return EVENT_DELIVERY_STATUS_LABEL[status] || `状态(${status})`
}

const getDeliveryBadgeStatus = (status: number) => {
  return EVENT_DELIVERY_STATUS_BADGE[status] || 'default'
}

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

const openDetail = (record: EventDeliveryRecord) => {
  currentDeliveryRecord.value = record
  detailDrawerOpen.value = true
}

const openReplay = (record: EventDeliveryRecord) => {
  if (!canWrite.value) return
  currentReplayRecord.value = record
  replayModalOpen.value = true
}

const handleDrawerReplay = (record: EventDeliveryRecord) => {
  if (!canWrite.value) return
  currentReplayRecord.value = record
  replayModalOpen.value = true
}

const handleReplaySuccess = async () => {
  await loadDeliveries()
  if (detailDrawerOpen.value && currentDeliveryRecord.value) {
    // 刷新详情抽屉内数据
    currentDeliveryRecord.value = { ...currentDeliveryRecord.value }
  }
}
</script>

<style scoped>
.event-deliveries-page {
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
  width: 180px;
}

.subscription-select {
  width: 180px;
}

.status-select {
  width: 110px;
}

.time-range-picker {
  width: 320px;
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

.event-id-cell {
  user-select: all;
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
