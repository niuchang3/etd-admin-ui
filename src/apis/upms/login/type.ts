import type { Id } from '@/apis/types'

/** 账号密码登录参数 */
export interface LoginCredentials {
    username: string,
    password: string
}


/** 刷新访问令牌时提交的参数 */
export interface RefreshTokenParams {
    grant_type:string,
    refresh_token:string,
}

/** 单个令牌及其过期时间 */
export interface Token{
    expires: string,
    value:string,
}


/** 登录或刷新令牌的响应数据 */
export interface Oauth2Token{
    accessToken:Token,
    refreshToken: Token | any,
    tokenType:string
}


/** 当前登录用户的基本资料 */
export interface UserInfo {
    id:Id | null,
    userName:string | null,
    birthday:Date | null,
    gender:number | null,
    avatar:string | null,
    nickName:string | null,
    platformAdmin?: boolean
}



/** 租户基础信息 */
export interface Tenant{
    id:Id,
    createTime:string | null,
    dataStatus:0 | 1,
    logo:string | null,
    tenantName:string | null,
    description:string | null,
    creditCode:string | null,
    tenantType:string | null,
    tenantAdminUser:Id | null,
    adminUser:string | null,
    locked:boolean | null,
}

/** 当前租户下由后端完成权限计算的菜单。 */
export interface UserMenu{
    tenantId:Id,
    id:Id,
    createTime:string | null,
    parentId:Id | null,
    menuName:string | null,
    menuPath:string | null,
    menuRouter:string | null,
    menuIcon:string | null,
    sort:number | null,
    accessLevel:'READ_ONLY' | 'READ_WRITE' | null,
}

/** 当前用户角色仅用于身份判断，不参与菜单权限计算。 */
export interface UserRole {
    id:Id,
    tenantId:Id,
    userId:Id,
    roleId:Id,
    roleCode:string | null,
    roleName:string | null,
    permissionType:string | null,
}



/** 权限点定义 */
export interface Authority{
    id:string,
    parentId:string,
    authorityName:string,
    authority:string
}
