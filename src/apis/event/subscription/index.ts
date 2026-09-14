import request from '@/utils/Request'
import type { Id, PageResult, ResultModel } from '@/apis/types'
import type {
  EventSubscriptionCreateForm,
  EventSubscriptionOption,
  EventSubscriptionQuery,
  EventSubscriptionRecord,
  EventSubscriptionUpdateDTO,
} from './type'

/** 按分页条件查询事件订阅列表 */
export const getEventSubscriptionPage = async (params: EventSubscriptionQuery) => {
  return await request.get<ResultModel<PageResult<EventSubscriptionRecord>>>({
    url: '/event/api/v1/event/subscriptions',
    params,
  })
}

/** 查询启用订阅筛选选项 */
export const getEventSubscriptionOptions = async () => {
  return await request.get<ResultModel<EventSubscriptionOption[]>>({
    url: '/event/api/v1/event/subscriptions/options',
  })
}

/** 查询事件订阅详情 */
export const getEventSubscriptionDetail = async (id: Id) => {
  return await request.get<ResultModel<EventSubscriptionRecord>>({
    url: `/event/api/v1/event/subscriptions/${encodeURIComponent(id)}`,
  })
}

/** 新增事件订阅 */
export const createEventSubscription = async (data: EventSubscriptionCreateForm) => {
  return await request.post<ResultModel<Id>>({
    url: '/event/api/v1/event/subscriptions',
    data,
  })
}

/** 更新事件订阅（乐观锁支持） */
export const updateEventSubscription = async (id: Id, data: EventSubscriptionUpdateDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `/event/api/v1/event/subscriptions/${encodeURIComponent(id)}`,
    data,
  })
}

/** 切换事件订阅启用状态 */
export const changeEventSubscriptionEnabled = async (id: Id, enabled: boolean) => {
  return await request.patch<ResultModel<boolean>>({
    url: `/event/api/v1/event/subscriptions/${encodeURIComponent(id)}/enabled/${enabled}`,
  })
}

/** 删除事件订阅（逻辑删除） */
export const deleteEventSubscription = async (id: Id) => {
  return await request.delete<ResultModel<boolean>>({
    url: `/event/api/v1/event/subscriptions/${encodeURIComponent(id)}`,
  })
}
