import request from '@/utils/Request'
import type { Response } from '@/apis/types'
import type { SaveSystemMenu, SystemMenu } from './type'

// 菜单管理接口统一维护在此处，后端路径变化时只需要修改该常量。
const MENU_API = '/upms/api/v1/menu'

// HTTP 成功不代表业务成功，菜单接口还必须满足 code === 2000。
const assertBusinessSuccess = <T>(response: Response<T>): Response<T> => {
  if (Number(response.code) !== 2000) {
    throw new Error(response.message || response.devMessage || '菜单接口请求失败')
  }
  return response
}

/** 查询菜单详情，不存在时 data 为 null。 */
export const selectSystemMenu = async (id: string) => assertBusinessSuccess(
  await request.get<Response<SystemMenu | null>>({ url: `${MENU_API}/${id}` }),
)

/** 新增菜单。 */
export const createSystemMenu = async (data: SaveSystemMenu) => assertBusinessSuccess(
  await request.post<Response<string>>({ url: MENU_API, data }),
)

/** 修改菜单。 */
export const updateSystemMenu = async (id: string, data: SaveSystemMenu) => {
  const response = assertBusinessSuccess(
    await request.put<Response<boolean>>({ url: `${MENU_API}/${id}`, data }),
  )
  if (!response.data) throw new Error('菜单不存在，修改失败')
  return response
}

/** 删除指定菜单。 */
export const deleteSystemMenu = async (id: string) => {
  const response = assertBusinessSuccess(
    await request.delete<Response<boolean>>({ url: `${MENU_API}/${id}` }),
  )
  if (!response.data) throw new Error('菜单不存在，删除失败')
  return response
}

/** 单独启用或禁用菜单。 */
export const changeSystemMenuStatus = async (id: string, status: 0 | 1) => {
  const response = assertBusinessSuccess(
    await request.patch<Response<boolean>>({ url: `${MENU_API}/${id}/status/${status}` }),
  )
  if (!response.data) throw new Error('菜单不存在，状态修改失败')
  return response
}
