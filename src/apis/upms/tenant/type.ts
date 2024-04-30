import { PageRequest } from "@/apis/types";
import { Tenant } from "../login/type";



export interface PageTenantParams extends PageRequest{
    keyword?:string
    startTime?:string,
    endTime?:string,
}

export interface TenantList extends Tenant{
    tenantAdminUser:number,
    adminUser:string,
    menus:string,
}