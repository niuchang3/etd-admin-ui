import request from "@/utils/Request";
import {PageResponse, Response} from "@/apis/types"
import { PageTenantParams, TenantList } from "./type";





/** 按分页条件查询租户列表 */
export const selectTenant = async (params:PageTenantParams) =>{
    return await request.get<Response<PageResponse<TenantList>>>({
        url:'/upms/api/v1/tenant',
        params
    })
}

/** 切换指定租户的锁定状态 */
export const switchLockedStatus = async (params:any) =>{
    return await request.patch<Response<any>>({
        url:`/upms/api/v1/tenant/${params.id}/${params.status}`,
    })
}
