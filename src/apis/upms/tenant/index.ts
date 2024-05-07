import request from "@/utils/request";
import {PageResponse, Response} from "@/apis/types"
import { PageTenantParams, TenantList } from "./type";





export const selectTenant = async (params:PageTenantParams) =>{
    return await request.get<Response<PageResponse<TenantList>>>({
        url:'/upms/api/v1/tenant',
        params
    })
}

export const switchLockedStatus = async (params:any) =>{
    return await request.patch<Response<any>>({
        url:`/upms/api/v1/tenant/${params.id}/${params.status}`,
    })
}