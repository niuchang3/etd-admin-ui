import request from '@/utils/Request'
import type { Response } from '@/apis/types'
import type { MenuDetail, MenuSaveRequest } from './type'

// 菜单管理接口统一维护在此处，后端路径变化时只需要修改该常量。
const MENU_API = '/upms/api/v1/menu'

/** 查询菜单详情，不存在时 data 为 null。 */
export const selectSystemMenu = async (id: string) =>
  request.get<Response<MenuDetail | null>>({ url: `${MENU_API}/${id}` })

/** 新增菜单。 */
export const createSystemMenu = async (data: MenuSaveRequest) =>
  request.post<Response<string>>({ url: MENU_API, data })

/** 修改菜单。 */
export const updateSystemMenu = async (id: string, data: MenuSaveRequest) => {
  const response = await request.put<Response<boolean>>({ url: `${MENU_API}/${id}`, data })
  if (!response.data) throw new Error('菜单不存在，修改失败')
  return response
}

/** 删除指定菜单。 */
export const deleteSystemMenu = async (id: string) => {
  const response = await request.delete<Response<boolean>>({ url: `${MENU_API}/${id}` })
  if (!response.data) throw new Error('菜单不存在，删除失败')
  return response
}

/** 单独启用或禁用菜单。 */
export const changeSystemMenuStatus = async (id: string, status: 0 | 1) => {
  const response = await request.patch<Response<boolean>>({ url: `${MENU_API}/${id}/status/${status}` })
  if (!response.data) throw new Error('菜单不存在，状态修改失败')
  return response
}
