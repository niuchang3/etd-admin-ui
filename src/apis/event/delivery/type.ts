import type { Id, PageRequest } from '@/apis/types'
import type { EventDeliveryStatusValue } from '@/constant'

/** 投递管理分页查询参数 */
export interface EventDeliveryQuery extends PageRequest {
  eventId?: string
  subscriptionId?: Id
  deliveryStatus?: EventDeliveryStatusValue
  startTime?: string
  endTime?: string
}

/** 投递管理单条记录模型（对齐后端 EventDeliveryVO） */
export interface EventDeliveryRecord {
  id: Id
  eventId: string
  eventMessageId?: Id
  subscriptionId: Id
  subscriptionName?: string
  subscriberApplication?: string
  targetTopic?: string
  deliveryStatus: number
  attemptCount: number
  nextRetryAt?: string | null
  lastError?: string | null
  kafkaPartition?: number | null
  kafkaOffset?: number | string | null
  publishedAt?: string | null
  version?: number
  createTime?: string
  updateTime?: string
}
