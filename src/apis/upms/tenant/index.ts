import request from "@/utils/Request";
import type { Id, PageResponse, Response } from "@/apis/types";
import type {
  PageTenantParams,
  TenantCreateForm,
  TenantRecord,
  TenantUpdateForm,
} from "./type";

/** 按分页条件查询租户列表 */
export const selectTenantPage = async (params: PageTenantParams) => {
  return await request.get<Response<PageResponse<TenantRecord>>>({
    url: '/upms/api/v1/tenant',
    params,
  });
};

/** 兼容查询租户方法 */
export const selectTenant = selectTenantPage;

/** 新增租户 */
export const createTenant = async (data: TenantCreateForm) => {
  return await request.post<Response<Id>>({
    url: '/upms/api/v1/tenant',
    data,
  });
};

/** 修改租户基本资料 */
export const updateTenant = async (id: Id, data: TenantUpdateForm) => {
  return await request.put<Response<boolean>>({
    url: `/upms/api/v1/tenant/${encodeURIComponent(id)}`,
    data,
  });
};

/** 修改租户启停状态 dataStatus (0: 停用, 1: 启用) */
export const changeTenantStatus = async (id: Id, status: 0 | 1) => {
  return await request.patch<Response<boolean>>({
    url: `/upms/api/v1/tenant/${encodeURIComponent(id)}/status/${status}`,
  });
};

/** 修改租户安全锁定状态 locked (true / false) */
export const changeTenantLocked = async (id: Id, locked: boolean) => {
  return await request.patch<Response<boolean>>({
    url: `/upms/api/v1/tenant/${encodeURIComponent(id)}/locked/${locked}`,
  });
};

/** 删除租户 */
export const deleteTenant = async (id: Id) => {
  return await request.delete<Response<boolean>>({
    url: `/upms/api/v1/tenant/${encodeURIComponent(id)}`,
  });
};
