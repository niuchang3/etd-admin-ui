import type { Id, PageRequest } from '@/apis/types'
import type { EventTypeRecord } from '@/apis/event/type/type'
import type { EventDeliveryRecord } from '@/apis/event/delivery/type'

/** 事件消息分页查询参数 */
export interface EventMessageQuery extends PageRequest {
  eventId?: string
  eventTypeId?: Id
  sourceApplication?: string
  startTime?: string
  endTime?: string
}

/** 事件消息单条记录（列表项，对齐后端 EventMessageVO） */
export interface EventMessageRecord {
  id: Id
  eventId: string
  eventTypeId: Id
  eventType: string
  eventName?: string
  sourceApplication: string
  eventVersion: number
  occurredAt: string
  createTime: string
  partitionKey?: string | null
  // 列表一般不含大 JSON，但在详情中存在
  eventContext?: string | Record<string, any> | null
  eventPayload?: string | Record<string, any> | null
}

/** 事件消息聚合详情 */
export interface EventMessageDetail {
  message: EventMessageRecord
  eventType: EventTypeRecord
  deliveryList: EventDeliveryRecord[]
}
