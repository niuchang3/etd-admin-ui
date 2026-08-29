import { PageRequest } from "@/apis/types";
import { Tenant } from "../login/type";


/** 租户列表的分页筛选参数 */
export interface PageTenantParams extends PageRequest{
    keyword?:string
    times?:[string,string],
}
/**
 * 租户列表中的扩展字段
 */
export interface TenantList extends Tenant{
    tenantAdminUser:number,
    adminUser:string,
    menus:string,
}

/**
 * 新增或编辑租户时使用的表单数据
 */
export interface EditTenant extends Tenant{
    adminUser?:string,
    adminUserName?:string,


}
