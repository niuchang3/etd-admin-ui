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
        <!-- 异常消息醒目告警条：明确展示失败原因，提示未进入投递流程 -->
        <a-alert
          v-if="detail.message?.messageStatus === 'ERROR'"
          type="error"
          show-icon
          class="error-status-alert"
          message="消息处理异常（未进入后续投递流程）"
        >
          <template #description>
            <div class="failure-reason-box">
              <span class="failure-label">失败原因：</span>
              <span class="failure-content">{{ detail.message?.failureReason || '未提供具体失败原因' }}</span>
            </div>
            <div class="failure-hint">
              提示：该消息已标记为异常，未生成投递任务，系统不提供投递重试或重放操作。
            </div>
          </template>
        </a-alert>

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

            <!-- 原始事件类型（来自 message.eventType） -->
            <a-descriptions-item label="原始事件类型">
              <code class="code-value du-mono selectable">{{ detail.message?.eventType || '—' }}</code>
            </a-descriptions-item>

            <!-- 事件类型定义（顶层 eventType 允许为 null） -->
            <a-descriptions-item label="事件类型定义">
              <template v-if="detail.eventType">
                <span>{{ detail.eventType.eventName }}</span>
                <span class="sub-label du-mono">({{ detail.eventType.eventType }})</span>
              </template>
              <span v-else class="type-not-found-text">未找到对应的事件类型定义</span>
            </a-descriptions-item>

            <!-- 消息状态 -->
            <a-descriptions-item label="消息状态">
              <a-badge
                :status="detail.message?.messageStatus === 'NORMAL' ? 'success' : 'error'"
                :text="detail.message?.messageStatus === 'NORMAL' ? '正常' : '异常'"
              />
            </a-descriptions-item>

            <!-- 来源应用 -->
            <a-descriptions-item label="来源应用">
              {{ detail.message?.sourceApplication || '—' }}
            </a-descriptions-item>

            <!-- 协议版本 -->
            <a-descriptions-item label="协议版本">
              <code class="code-value du-mono">
                {{ detail.message?.eventVersion != null ? `v${detail.message.eventVersion}` : (detail.eventType?.latestVersion ? `v${detail.eventType.latestVersion}` : '—') }}
              </code>
            </a-descriptions-item>

            <!-- 分区键 -->
            <a-descriptions-item label="分区键 (PartitionKey)">
              <code class="code-value du-mono">{{ detail.message?.partitionKey || '—' }}</code>
            </a-descriptions-item>

            <!-- 事件发生时间 -->
            <a-descriptions-item label="事件发生时间 (occurredAt)">
              <span class="du-mono">{{ formatDateTime(detail.message?.occurredAt) }}</span>
            </a-descriptions-item>

            <!-- 消息入库时间 -->
            <a-descriptions-item label="消息入库时间 (createTime)">
              <span class="du-mono">{{ formatDateTime(detail.message?.createTime) }}</span>
            </a-descriptions-item>

            <!-- 异常消息失败原因详细展示 -->
            <a-descriptions-item
              v-if="detail.message?.messageStatus === 'ERROR'"
              label="失败原因"
              :span="2"
            >
              <span class="failure-reason-danger">{{ detail.message?.failureReason || '—' }}</span>
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

          <!-- ERROR 状态说明：未进入后续投递流程，不显示为接口异常 -->
          <div v-if="detail.message?.messageStatus === 'ERROR'" class="empty-delivery-box">
            <a-empty
              description="该消息状态为异常，未进入后续投递流程，无关联投递任务"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </div>

          <!-- NORMAL 消息：展示投递结果表格，并支持重试/死信任务的人工重播 -->
          <a-table
            v-else
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
                {{ delivery.subscriptionName || '—' }}
              </span>

              <!-- 订阅应用 -->
              <span v-else-if="column.key === 'subscriberApplication'">
                {{ delivery.subscriberApplication || '—' }}
              </span>

              <!-- Kafka Topic -->
              <code v-else-if="column.key === 'targetTopic'" class="code-value du-mono">
                {{ delivery.targetTopic || '—' }}
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

              <!-- 操作列：仅对可重播状态（3: 等待重试, 4: 死信）提供人工重播 -->
              <div v-else-if="column.key === 'actions'" class="row-actions">
                <template v-if="canWrite">
                  <a-button
                    v-if="isDeliveryReplayable(delivery)"
                    type="link"
                    size="small"
                    :loading="replayingId === String(delivery.id)"
                    @click="handleReplay(delivery)"
                  >
                    <RedoOutlined />重播
                  </a-button>
                  <span v-else class="empty-cell">—</span>
                </template>
                <span v-else-if="isDeliveryReplayable(delivery)" class="readonly-label">只读</span>
                <span v-else class="empty-cell">—</span>
              </div>
            </template>

            <template #emptyText>
              <a-empty description="暂无关联投递记录" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
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
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Empty, message as antMessage } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { RedoOutlined } from '@ant-design/icons-vue'
import { getEventMessageDetail } from '@/apis/event/message'
import type { EventMessageDetail, EventMessageRecord } from '@/apis/event/message/type'
import { replayEventDelivery } from '@/apis/event/delivery'
import type { EventDeliveryRecord } from '@/apis/event/delivery/type'
import {
  EVENT_DELIVERY_STATUS,
  EVENT_DELIVERY_STATUS_BADGE,
  EVENT_DELIVERY_STATUS_LABEL,
} from '@/constant'
import { menusStore } from '@/stores/modules/user'
import { formatDateTime } from '@/utils/format'
import { confirmAction } from '@/utils/confirm'
import JsonViewer from '@/components/JsonViewer.vue'

const props = defineProps<{
  open: boolean
  messageRecord: EventMessageRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))

const loading = ref(false)
const replayingId = ref('')
const detail = ref<EventMessageDetail | null>(null)

// 投递结果表格列：仅 NORMAL 消息附带操作列
const deliveryColumns = computed<TableColumnsType<EventDeliveryRecord>>(() => {
  const cols: TableColumnsType<EventDeliveryRecord> = [
    { title: '订阅名称', dataIndex: 'subscriptionName', key: 'subscriptionName', width: 150 },
    { title: '订阅应用', dataIndex: 'subscriberApplication', key: 'subscriberApplication', width: 140 },
    { title: 'Kafka Topic', dataIndex: 'targetTopic', key: 'targetTopic', width: 180 },
    { title: '投递状态', dataIndex: 'deliveryStatus', key: 'deliveryStatus', width: 95 },
    { title: '尝试次数', dataIndex: 'attemptCount', key: 'attemptCount', width: 85 },
    { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', width: 140 },
  ]
  if (detail.value?.message?.messageStatus === 'NORMAL') {
    cols.push({ title: '操作', key: 'actions', width: 75, fixed: 'right', align: 'right' })
  }
  return cols
})

const getDeliveryStatusLabel = (status: number) => {
  return EVENT_DELIVERY_STATUS_LABEL[status] || `状态(${status})`
}

const getDeliveryBadgeStatus = (status: number) => {
  return EVENT_DELIVERY_STATUS_BADGE[status] || 'default'
}

/** 仅状态 3（等待重试）与 4（死信）具备重播资格 */
const isDeliveryReplayable = (record: EventDeliveryRecord) => {
  return (
    record.deliveryStatus === EVENT_DELIVERY_STATUS.RETRYING ||
    record.deliveryStatus === EVENT_DELIVERY_STATUS.DEAD_LETTER
  )
}

/** 加载消息聚合详情（严格同时传 eventId 和 id 用于分表路由） */
const loadDetail = async () => {
  if (!props.messageRecord) return
  loading.value = true
  try {
    const res = await getEventMessageDetail(props.messageRecord.eventId, props.messageRecord.id)
    detail.value = res.data
  } catch (err: any) {
    antMessage.error(err?.message || '获取事件消息详情失败')
  } finally {
    loading.value = false
  }
}

/** 针对 NORMAL 消息的失败投递执行人工定向重播 */
const handleReplay = (delivery: EventDeliveryRecord) => {
  if (!canWrite.value) return
  if (detail.value?.message?.messageStatus === 'ERROR') return

  confirmAction({
    title: '确认重播投递任务',
    content: `确定要重播投递任务【${delivery.subscriptionName || '—'}】吗？该操作仅重新投递当前失败记录。`,
    okText: '确认重播',
    onOk: async () => {
      replayingId.value = String(delivery.id)
      try {
        await replayEventDelivery(props.messageRecord!.eventId, delivery.id)
        antMessage.success('重播任务已提交')
        await loadDetail()
      } catch (err: any) {
        antMessage.error(err?.message || '重播任务提交失败')
      } finally {
        replayingId.value = ''
      }
    },
  })
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

.error-status-alert {
  border-radius: var(--du-radius, 4px);
}

.failure-reason-box {
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
}

.failure-label {
  font-weight: 600;
  color: var(--du-danger, #ff4d4f);
}

.failure-content {
  color: var(--du-text, #1f2937);
  word-break: break-all;
}

.failure-hint {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #595959);
  margin-top: 4px;
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

.type-not-found-text {
  color: var(--du-text-tertiary, #8c8c8c);
  font-style: italic;
  font-size: var(--du-font-size-xs, 11px);
}

.failure-reason-danger {
  color: var(--du-danger, #ff4d4f);
  font-weight: 500;
  word-break: break-all;
}

.empty-delivery-box {
  padding: var(--du-space-3, 12px) 0;
  background: var(--du-bg-secondary, #fafafa);
  border: 1px dashed var(--du-border, #f0f0f0);
  border-radius: var(--du-radius, 4px);
}

.empty-cell {
  color: var(--du-text-tertiary, #8c8c8c);
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
