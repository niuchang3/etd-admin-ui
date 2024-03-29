import request from "@/utils/request";
import { LonginRequestParams, Oauth2Token, Response, UserInfo } from "../types";

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


export const selectUserInfo = async() =>{
    return await request.get<Response<UserInfo>>({
        url:'/upms/api/v1/user/me'
    });
}