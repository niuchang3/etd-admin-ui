import request from "@/utils/Request";
import { LoginCredentials, Oauth2Token, RefreshTokenParams, Tenant, UserInfo, UserMenu, UserRole } from "./type";
import { Response } from '@/apis/types'

/**
 * 使用账号密码登录。
 * 登录成功后由 OAuth 状态模块负责持久化令牌。
 * @param data 
 * @returns 
 */
export const loginByUserName = async (data: LoginCredentials) => {
    return await request.post<Response<Oauth2Token>>({
        url: '/upms/api/internal/login',
        data
    });
}

/** 查询当前租户上下文中的登录用户资料 */
export const selectUserInfo = async () => {
    return await request.get<Response<UserInfo>>({
        url: '/upms/api/v1/user/me'
    });
}
/** 查询当前用户可访问的租户列表 */
export const selectUserTenant = async () => {
    return await request.get<Response<Tenant[]>>({
        url: '/upms/api/v1/user/tenant'
    })
}

/** 查询当前租户下的用户菜单 */
export const selectUserMenus = async () => {
    return await request.get<Response<UserMenu[]>>({
        url: '/upms/api/v1/user/menus'
    })
}

/** 查询当前用户角色；角色不再携带菜单字段。 */
export const selectUserRole = async () => {
    return await request.get<Response<UserRole[]>>({
        url: '/upms/api/v1/user/role'
    })
}

/** 使用 Refresh Token 换取新的访问令牌 */
export const updateToken = async (data: RefreshTokenParams) => {
    return await request.post({
        url: '/upms/api/oauth2/refresh',
        data
    })
}
