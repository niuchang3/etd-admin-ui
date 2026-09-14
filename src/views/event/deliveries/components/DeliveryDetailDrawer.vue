<template>
  <a-drawer
    :open="open"
    title="投递任务详情"
    width="720px"
    placement="right"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="delivery-detail-content">
        <!-- 基础元数据 -->
        <div class="section-card">
          <div class="section-title">任务基本信息</div>
          <a-descriptions size="small" :column="2" bordered class="dense-descriptions">
            <a-descriptions-item label="投递记录 ID">
              <code class="code-value du-mono">{{ detail.id }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="事件 ID">
              <code class="code-value du-mono selectable">{{ detail.eventId }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="订阅名称">
              {{ detail.subscriptionName || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="订阅编码">
              <code class="code-value du-mono">{{ detail.subscriptionCode || '—' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="订阅应用">
              {{ detail.subscriberApplication || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="Kafka Topic">
              <code class="code-value du-mono">{{ detail.targetTopic || '—' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Consumer Group">
              <code class="code-value du-mono">{{ detail.consumerGroup || '—' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="当前投递状态">
              <a-badge
                :status="getDeliveryBadgeStatus(detail.deliveryStatus)"
                :text="getDeliveryStatusLabel(detail.deliveryStatus)"
              />
            </a-descriptions-item>
            <a-descriptions-item label="尝试投递次数">
              <span class="du-mono">{{ detail.attemptCount ?? 0 }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="Kafka 分区 / 位移">
              <span class="du-mono">
                分区: {{ detail.kafkaPartition ?? '—' }} / 位移: {{ detail.kafkaOffset ?? '—' }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="下次重试时间">
              <span class="du-mono">{{ formatDateTime(detail.nextRetryAt) }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="发布成功时间">
              <span class="du-mono">{{ formatDateTime(detail.publishedAt) }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              <span class="du-mono">{{ formatDateTime(detail.createTime) }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="最后更新时间">
              <span class="du-mono">{{ formatDateTime(detail.updateTime) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 异常失败日志（如有） -->
        <div v-if="detail.lastError" class="section-card">
          <div class="section-title error-title">异常失败日志 (lastError)</div>
          <div class="error-msg-box">
            <div class="box-header">
              <span class="box-label">最后一次投递错误记录：</span>
              <a-button type="link" size="small" @click="copyLastError">复制错误</a-button>
            </div>
            <pre class="stack-pre du-mono"><code>{{ detail.lastError }}</code></pre>
          </div>
        </div>
      </div>
    </a-spin>

    <template #footer>
      <div class="drawer-footer">
        <a-button @click="handleClose">关闭</a-button>
        <a-button
          v-if="canWrite && canReplay"
          type="primary"
          @click="openReplay"
        >
          定向重播
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getEventDeliveryDetail } from '@/apis/event/delivery'
import type { EventDeliveryRecord } from '@/apis/event/delivery/type'
import {
  EVENT_DELIVERY_STATUS,
  EVENT_DELIVERY_STATUS_BADGE,
  EVENT_DELIVERY_STATUS_LABEL,
} from '@/constant'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  open: boolean
  deliveryRecord: EventDeliveryRecord | null
  canWrite: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'replay', record: EventDeliveryRecord): void
}>()

const loading = ref(false)
const detail = ref<EventDeliveryRecord | null>(null)

const canReplay = computed(() => {
  if (!detail.value) return false
  return (
    detail.value.deliveryStatus === EVENT_DELIVERY_STATUS.RETRYING ||
    detail.value.deliveryStatus === EVENT_DELIVERY_STATUS.DEAD_LETTER
  )
})

const getDeliveryStatusLabel = (status: number) => {
  return EVENT_DELIVERY_STATUS_LABEL[status] || `状态(${status})`
}

const getDeliveryBadgeStatus = (status: number) => {
  return EVENT_DELIVERY_STATUS_BADGE[status] || 'default'
}

const loadDetail = async () => {
  if (!props.deliveryRecord) return
  loading.value = true
  try {
    // 严格按后端契约同时传递 eventId 和 id，用于分表路由
    const res = await getEventDeliveryDetail(props.deliveryRecord.eventId, props.deliveryRecord.id)
    detail.value = res.data || props.deliveryRecord
  } catch (err: any) {
    message.error(err?.message || '获取投递任务详情失败')
    detail.value = props.deliveryRecord
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val && props.deliveryRecord) {
      void loadDetail()
    } else {
      detail.value = null
    }
  }
)

const handleClose = () => {
  emit('update:open', false)
}

const openReplay = () => {
  if (!detail.value) return
  emit('replay', detail.value)
}

const copyLastError = async () => {
  if (!detail.value?.lastError) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(detail.value.lastError)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = detail.value.lastError
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    message.success('错误信息已复制')
  } catch {
    message.error('复制失败')
  }
}
</script>

<style scoped>
.delivery-detail-content {
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

.error-title {
  border-left-color: var(--du-error, #ff4d4f);
}

.code-value {
  color: var(--du-text-secondary, #595959);
  font-family: var(--du-font-mono, monospace);
  font-size: var(--du-font-size-xs, 11px);
}

.selectable {
  user-select: all;
}

.error-msg-box {
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
}

.box-label {
  font-weight: 600;
  color: #cf1322;
  margin-bottom: 4px;
}

.box-content {
  color: #434343;
  word-break: break-all;
}

.error-stack-box {
  border: 1px solid var(--du-border, #d9d9d9);
  border-radius: 4px;
  background-color: #1e1e1e;
  overflow: hidden;
}

.box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.box-header .box-label {
  color: #ff7875;
  font-size: 11px;
  margin-bottom: 0;
}

.stack-pre {
  margin: 0;
  padding: 10px;
  max-height: 280px;
  overflow: auto;
  color: #f87171;
  font-size: 11.5px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--du-space-2, 8px);
}
</style>
