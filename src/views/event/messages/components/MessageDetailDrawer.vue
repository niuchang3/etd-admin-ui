<template>
  <a-drawer
    :open="open"
    title="事件消息详情"
    width="860px"
    placement="right"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="message-detail-content">
        <!-- 基础元数据信息 -->
        <div class="section-card">
          <div class="section-title">消息基本信息</div>
          <a-descriptions size="small" :column="2" bordered class="dense-descriptions">
            <a-descriptions-item label="事件 ID">
              <code class="code-value du-mono selectable">{{ detail.message?.eventId || '—' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="消息记录 ID">
              <code class="code-value du-mono">{{ detail.message?.id || '—' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="事件类型">
              {{ detail.eventType?.eventName || detail.message?.eventName || detail.message?.eventType || '—' }}
              <span v-if="detail.eventType?.eventType" class="sub-label du-mono">
                ({{ detail.eventType.eventType }})
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="来源应用">
              {{ detail.message?.sourceApplication || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="协议版本">
              <code class="code-value du-mono">
                {{ detail.message?.eventVersion != null ? `v${detail.message.eventVersion}` : (detail.eventType?.latestVersion ? `v${detail.eventType.latestVersion}` : '—') }}
              </code>
            </a-descriptions-item>
            <a-descriptions-item label="分区键 (PartitionKey)">
              <code class="code-value du-mono">{{ detail.message?.partitionKey || '—' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="事件发生时间 (occurredAt)">
              <span class="du-mono">{{ formatDateTime(detail.message?.occurredAt) }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="消息入库时间 (createTime)">
              <span class="du-mono">{{ formatDateTime(detail.message?.createTime) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 消息上下文 (eventContext) -->
        <div class="section-card">
          <div class="section-title">消息上下文 (eventContext)</div>
          <JsonViewer
            :data="detail.message?.eventContext"
            title="上下文环境变量 / 追踪元数据"
            max-height="240px"
            empty-text="（无上下文数据）"
          />
        </div>

        <!-- 消息业务载荷 (eventPayload) -->
        <div class="section-card">
          <div class="section-title">业务载荷数据 (eventPayload)</div>
          <JsonViewer
            :data="detail.message?.eventPayload"
            title="原始 Payload 载荷"
            max-height="360px"
            empty-text="（无业务载荷数据）"
          />
        </div>

        <!-- 订阅投递结果列表 -->
        <div class="section-card">
          <div class="section-title">面向各订阅的独立投递结果</div>
          <a-table
            :columns="deliveryColumns"
            :data-source="detail.deliveryList || []"
            :pagination="false"
            row-key="id"
            size="small"
            class="delivery-table"
          >
            <template #bodyCell="{ column, record: delivery }">
              <!-- 订阅名称 -->
              <span v-if="column.key === 'subscriptionName'">
                {{ delivery.subscriptionName || delivery.subscriptionCode || '—' }}
              </span>

              <!-- 订阅应用 -->
              <span v-else-if="column.key === 'subscriberApplication'">
                {{ delivery.subscriberApplication || '—' }}
              </span>

              <!-- Kafka Topic -->
              <code v-else-if="column.key === 'targetTopic'" class="code-value du-mono">
                {{ delivery.targetTopic || '—' }}
              </code>

              <!-- Consumer Group -->
              <code v-else-if="column.key === 'consumerGroup'" class="code-value du-mono">
                {{ delivery.consumerGroup || '—' }}
              </code>

              <!-- 投递状态 -->
              <span v-else-if="column.key === 'deliveryStatus'">
                <a-badge
                  :status="getDeliveryBadgeStatus(delivery.deliveryStatus)"
                  :text="getDeliveryStatusLabel(delivery.deliveryStatus)"
                />
              </span>

              <!-- 尝试次数 -->
              <span v-else-if="column.key === 'attemptCount'" class="du-mono">
                {{ delivery.attemptCount ?? 0 }}
              </span>

              <!-- 发布时间 -->
              <span v-else-if="column.key === 'publishedAt'" class="create-time-cell du-mono">
                {{ formatDateTime(delivery.publishedAt || delivery.updateTime) }}
              </span>
            </template>

            <template #emptyText>
              <a-empty description="暂无关联投递记录" />
            </template>
          </a-table>
        </div>
      </div>
    </a-spin>

    <template #footer>
      <div class="drawer-footer">
        <a-button @click="handleClose">关闭</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { getEventMessageDetail } from '@/apis/event/message'
import type { EventMessageDetail, EventMessageRecord } from '@/apis/event/message/type'
import type { EventDeliveryRecord } from '@/apis/event/delivery/type'
import {
  EVENT_DELIVERY_STATUS_BADGE,
  EVENT_DELIVERY_STATUS_LABEL,
} from '@/constant'
import { formatDateTime } from '@/utils/format'
import JsonViewer from '@/components/JsonViewer.vue'

const props = defineProps<{
  open: boolean
  messageRecord: EventMessageRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const loading = ref(false)
const detail = ref<EventMessageDetail | null>(null)

const deliveryColumns: TableColumnsType<EventDeliveryRecord> = [
  { title: '订阅名称', dataIndex: 'subscriptionName', key: 'subscriptionName', width: 140 },
  { title: '订阅应用', dataIndex: 'subscriberApplication', key: 'subscriberApplication', width: 130 },
  { title: 'Kafka Topic', dataIndex: 'targetTopic', key: 'targetTopic', width: 160 },
  { title: 'Consumer Group', dataIndex: 'consumerGroup', key: 'consumerGroup', width: 160 },
  { title: '投递状态', dataIndex: 'deliveryStatus', key: 'deliveryStatus', width: 95 },
  { title: '尝试次数', dataIndex: 'attemptCount', key: 'attemptCount', width: 85 },
  { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', width: 140 },
]

const getDeliveryStatusLabel = (status: number) => {
  return EVENT_DELIVERY_STATUS_LABEL[status] || `状态(${status})`
}

const getDeliveryBadgeStatus = (status: number) => {
  return EVENT_DELIVERY_STATUS_BADGE[status] || 'default'
}

const loadDetail = async () => {
  if (!props.messageRecord) return
  loading.value = true
  try {
    // 严格按后端契约同时传递 eventId 和 id，用于分表路由
    const res = await getEventMessageDetail(props.messageRecord.eventId, props.messageRecord.id)
    detail.value = res.data
  } catch (err: any) {
    antMessage.error(err?.message || '获取事件消息详情失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val && props.messageRecord) {
      void loadDetail()
    } else {
      detail.value = null
    }
  }
)

const handleClose = () => {
  emit('update:open', false)
}
</script>

<style scoped>
.message-detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-3, 12px);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-2, 8px);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--du-text, #1f2937);
  padding-left: 6px;
  border-left: 3px solid var(--du-primary, #1890ff);
  line-height: 14px;
}

.code-value {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.selectable {
  user-select: all;
}

.sub-label {
  color: var(--du-text-tertiary, #8c8c8c);
  font-size: var(--du-font-size-xs, 11px);
  margin-left: 4px;
}

.create-time-cell {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
