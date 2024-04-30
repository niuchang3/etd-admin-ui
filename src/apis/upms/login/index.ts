import request from "@/utils/request";
import { LonginRequestParams, Oauth2Token , RefreshTokenParams, Tenant, UserInfo, UserMenus } from "./type";
import {Response} from '@/apis/types'

/**
 * 根据用户名登录
 * @param data 
 * @returns 
 */
export const loginByUserName = async (data:LonginRequestParams) =>{
    return await request.post<Response<Oauth2Token>>({
        url: '/upms/api/oauth2/login',
        data,
        contentType: 'application/x-www-form-urlencoded'
    }); 
}

/**
 * 根据手机号码登录
 * @param data 
 * @returns 
 */
export const loginByMobile = async(data:LonginRequestParams) =>{
    return await request.post<Response<Oauth2Token>>({
        url: '/upms/api/oauth2/login',
        data,
        contentType: 'application/x-www-form-urlencoded'
    });
}

/**
 * 查询当前用户个人信息
 * @returns 
 */
export const selectUserInfo = async() =>{
    return await request.get<Response<UserInfo>>({
        url:'/upms/api/v1/user/me'
    });
}
/**
 * 查询当前用户所在租户
 * @returns 
 */
export const selectUserTenant = async() =>{
    return await request.get<Response<Tenant[]>>({
        url:'/upms/api/v1/user/tenant'
    })
}

/**
 * 查询用户当前租户下的菜单
 * @returns 
 */
export const selectUserMenus = async () =>{
    return await request.get<Response<UserMenus[]>>({
        url:'/upms/api/v1/user/menus'
    })
}

/**
 * 刷新Token
 * @param data 
 * @returns 
 */
export const updateToken  = async(data:RefreshTokenParams) =>{
    return await request.post({
        url:'/upms/api/oauth2/refresh',
        data,
        contentType: 'application/x-www-form-urlencoded'
    })
}