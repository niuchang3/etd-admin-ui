import type { Id, PageRequest } from '@/apis/types'

/** 事件订阅分页查询参数（keyword 仅匹配订阅名称） */
export interface EventSubscriptionQuery extends PageRequest {
  keyword?: string
  eventTypeId?: Id
  subscriberApplication?: string
  enabled?: boolean
}

/** 事件订阅单条记录（列表项 / 详情） */
export interface EventSubscriptionRecord {
  id: Id
  subscriptionName: string
  eventTypeId: Id
  eventType?: string
  eventName?: string
  subscriberApplication: string
  targetTopic: string
  description?: string | null
  enabled: boolean
  version: number
  createTime?: string
  updateTime?: string
}

/** 新增事件订阅请求体 */
export interface EventSubscriptionCreateForm {
  subscriptionName: string
  eventTypeId: Id
  subscriberApplication: string
  targetTopic: string
  description?: string | null
}

/** 更新事件订阅请求体（乐观锁包装） */
export interface EventSubscriptionUpdateDTO {
  content: {
    subscriptionName: string
    eventTypeId: Id
    subscriberApplication: string
    targetTopic: string
    description?: string | null
  }
  version: number
}

/** 事件订阅下拉选项 */
export interface EventSubscriptionOption {
  id?: Id
  value?: Id
  subscriptionName: string
  label?: string
  subscriberApplication?: string
  targetTopic?: string
}
