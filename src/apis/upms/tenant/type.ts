import type { Id, PageRequest } from "@/apis/types"

/** 租户列表的分页筛选参数 */
export interface PageTenantParams extends PageRequest {
  keyword?: string
  times?: [string, string]
}

/** 租户分页查询单条记录 */
export interface TenantRecord {
  id: Id
  createTime?: string
  dataStatus: 0 | 1
  logo?: string
  tenantName: string
  description?: string
  creditCode?: string
  tenantType?: string
  tenantAdminUser?: Id
  adminUser?: string
  locked: boolean
}

/** 新增租户时的管理员创建表单 */
export interface TenantAdministratorCreateForm {
  account: string
  password: string
  userName: string
  mobile?: string
}

/** 新增租户请求体 */
export interface TenantCreateForm {
  logo?: string
  tenantName: string
  description?: string
  creditCode?: string
  tenantType?: string
  administrator: TenantAdministratorCreateForm
}

/** 修改租户请求体 */
export interface TenantUpdateForm {
  logo?: string
  tenantName: string
  description?: string
  creditCode?: string
  tenantType?: string
}
