<template>
  <a-modal
    :open="open"
    title="确认重播投递任务"
    :confirm-loading="submitting"
    width="540px"
    ok-text="确认重播"
    ok-type="primary"
    cancel-text="取消"
    @ok="handleConfirm"
    @update:open="onOpenChange"
  >
    <div class="replay-modal-body">
      <a-alert
        type="warning"
        show-icon
        class="replay-alert"
        message="定向重播提示"
        description="人工重播仅向当前失败的订阅重新投递，不会重播该消息的其他订阅，也不会影响其他消费组。"
      />

      <div class="replay-info-card">
        <div class="info-row">
          <span class="info-label">事件 ID：</span>
          <code class="info-value du-mono selectable">{{ record?.eventId || '—' }}</code>
        </div>
        <div class="info-row">
          <span class="info-label">订阅名称：</span>
          <span class="info-value">{{ record?.subscriptionName || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">订阅应用：</span>
          <span class="info-value">{{ record?.subscriberApplication || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">目标 Topic：</span>
          <code class="info-value du-mono">{{ record?.targetTopic || '—' }}</code>
        </div>
        <div class="info-row">
          <span class="info-label">当前状态：</span>
          <span class="info-value">
            <a-badge
              :status="getDeliveryBadgeStatus(record?.deliveryStatus ?? -1)"
              :text="getDeliveryStatusLabel(record?.deliveryStatus ?? -1)"
            />
          </span>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { replayEventDelivery } from '@/apis/event/delivery'
import type { EventDeliveryRecord } from '@/apis/event/delivery/type'
import {
  EVENT_DELIVERY_STATUS_BADGE,
  EVENT_DELIVERY_STATUS_LABEL,
} from '@/constant'

const props = defineProps<{
  open: boolean
  record: EventDeliveryRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const submitting = ref(false)

const getDeliveryStatusLabel = (status: number) => {
  return EVENT_DELIVERY_STATUS_LABEL[status] || `状态(${status})`
}

const getDeliveryBadgeStatus = (status: number) => {
  return EVENT_DELIVERY_STATUS_BADGE[status] || 'default'
}

const onOpenChange = (val: boolean) => {
  emit('update:open', val)
}

const handleConfirm = async () => {
  if (!props.record) return
  submitting.value = true
  try {
    // 严格按照分表路由契约传递 eventId 与 id
    await replayEventDelivery(props.record.eventId, props.record.id)
    message.success('已触发定向重播')
    emit('update:open', false)
    emit('success')
  } catch (err: any) {
    message.error(err?.message || '重播触发失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.replay-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-3, 12px);
  padding-top: var(--du-space-2, 8px);
}

.replay-alert {
  margin-bottom: var(--du-space-1, 4px);
}

.replay-info-card {
  background-color: var(--du-bg-tertiary, #f8fafc);
  border: 1px solid var(--du-border, #e2e8f0);
  border-radius: 4px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.info-label {
  color: var(--du-text-secondary, #64748b);
  width: 90px;
  min-width: 90px;
}

.info-value {
  color: var(--du-text, #1e293b);
  font-weight: 500;
  word-break: break-all;
}

.selectable {
  user-select: all;
}
</style>
