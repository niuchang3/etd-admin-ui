import type { Id, PageRequest } from '@/apis/types'

/** 事件订阅分页查询参数 */
export interface EventSubscriptionQuery extends PageRequest {
  keyword?: string
  eventTypeId?: Id
  subscriberApplication?: string
  enabled?: boolean
}

/** 事件订阅单条记录 */
export interface EventSubscriptionRecord {
  id: Id
  subscriptionCode: string
  subscriptionName: string
  eventTypeId: Id
  eventType?: string
  eventName?: string
  eventTypeName?: string
  subscriberApplication: string
  targetTopic: string
  consumerGroup: string
  description?: string | null
  enabled: boolean
  version: number
  createTime?: string
  updateTime?: string
}

/** 新增事件订阅请求体 */
export interface EventSubscriptionCreateForm {
  subscriptionCode: string
  subscriptionName: string
  eventTypeId: Id
  subscriberApplication: string
  targetTopic: string
  consumerGroup: string
  description?: string | null
}

/** 更新事件订阅请求体（乐观锁包装） */
export interface EventSubscriptionUpdateDTO {
  content: {
    subscriptionCode: string
    subscriptionName: string
    eventTypeId: Id
    subscriberApplication: string
    targetTopic: string
    consumerGroup: string
    description?: string | null
  }
  version: number
}

/** 事件订阅下拉选项 */
export interface EventSubscriptionOption {
  id?: Id
  value?: Id
  subscriptionCode: string
  subscriptionName: string
  label?: string
  subscriberApplication?: string
  targetTopic?: string
}
