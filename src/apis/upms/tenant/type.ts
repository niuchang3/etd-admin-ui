import { PageRequest } from "@/apis/types";
import { Tenant } from "../login/type";


export interface PageTenantParams extends PageRequest{
    keyword?:string
    times?:[string,string],
}
/**
 * 租户列表
 */
export interface TenantList extends Tenant{
    tenantAdminUser:number,
    adminUser:string,
    menus:string,
}

/**
 * 新增或编辑租户
 */
export interface EditTenant extends Tenant{
    adminUser?:string,
    adminUserName?:string,


}