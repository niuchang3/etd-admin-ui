import request from '@/utils/Request'
import type { Id, PageResult, ResultModel } from '@/apis/types'
import type {
  EventTypeCreateForm,
  EventTypeOption,
  EventTypeQuery,
  EventTypeRecord,
  EventTypeUpdateDTO,
} from './type'

/** 按分页条件查询事件类型列表 */
export const getEventTypePage = async (params: EventTypeQuery) => {
  return await request.get<ResultModel<PageResult<EventTypeRecord>>>({
    url: '/event/api/v1/event/types',
    params,
  })
}

/** 查询启用事件类型下拉选项 */
export const getEventTypeOptions = async () => {
  return await request.get<ResultModel<EventTypeOption[]>>({
    url: '/event/api/v1/event/types/options',
  })
}

/** 查询事件类型详情 */
export const getEventTypeDetail = async (id: Id) => {
  return await request.get<ResultModel<EventTypeRecord>>({
    url: `/event/api/v1/event/types/${encodeURIComponent(id)}`,
  })
}

/** 新增事件类型 */
export const createEventType = async (data: EventTypeCreateForm) => {
  return await request.post<ResultModel<Id>>({
    url: '/event/api/v1/event/types',
    data,
  })
}

/** 更新事件类型（乐观锁支持） */
export const updateEventType = async (id: Id, data: EventTypeUpdateDTO) => {
  return await request.put<ResultModel<boolean>>({
    url: `/event/api/v1/event/types/${encodeURIComponent(id)}`,
    data,
  })
}

/** 切换事件类型启用状态 */
export const changeEventTypeEnabled = async (id: Id, enabled: boolean) => {
  return await request.patch<ResultModel<boolean>>({
    url: `/event/api/v1/event/types/${encodeURIComponent(id)}/enabled/${enabled}`,
  })
}

/** 删除事件类型 */
export const deleteEventType = async (id: Id) => {
  return await request.delete<ResultModel<boolean>>({
    url: `/event/api/v1/event/types/${encodeURIComponent(id)}`,
  })
}
