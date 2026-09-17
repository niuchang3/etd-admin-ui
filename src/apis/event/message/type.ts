import type { Id, PageRequest } from '@/apis/types'
import type { EventTypeRecord } from '@/apis/event/type/type'
import type { EventDeliveryRecord } from '@/apis/event/delivery/type'

/** 消息状态：正常 / 异常 */
export type EventMessageStatus = 'NORMAL' | 'ERROR'

/**
 * 事件消息分页查询参数
 * 注意：不要把空字符串、null 或 undefined 作为查询参数发送
 */
export interface EventMessageQuery extends PageRequest {
  eventId?: string
  eventType?: string
  eventTypeId?: Id | number
  messageStatus?: EventMessageStatus
  sourceApplication?: string
  startTime?: string
  endTime?: string
}

/** 事件消息单条记录（列表项 / 详情中的 message 实体） */
export interface EventMessageRecord {
  id: Id | number
  createTime: string
  version: number
  eventId: string
  eventType: string
  eventTypeId: Id | number | null
  eventVersion: number
  occurredAt: string
  sourceApplication: string
  partitionKey: string | null
  eventContext?: Record<string, any> | string | null
  eventPayload?: unknown
  messageStatus: EventMessageStatus
  failureReason: string | null
  eventName?: string
}

/**
 * 事件消息聚合详情响应
 * 注意：顶层 eventType 允许为 null（未在事件中心登记）；deliveryList 允许为空
 */
export interface EventMessageDetail {
  message: EventMessageRecord
  eventType: EventTypeRecord | null
  deliveryList: EventDeliveryRecord[]
}
