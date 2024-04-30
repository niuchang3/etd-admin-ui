import request from "@/utils/request";
import {PageResponse, Response} from "@/apis/types"
import { PageTenantParams, TenantList } from "./type";





export const selectTenant = async (params:PageTenantParams) =>{
    return await request.get<Response<PageResponse<TenantList>>>({
        url:'/upms/api/v1/tenant',
        params
    })
}