

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
    id:string | null,
    userName:string | null,
    birthday:Date | null,
    gender:number | null,
    avatar:string | null,
    nickName:string | null
}



/** 租户基础信息 */
export interface Tenant{
    id?:string,
    parentId?:string,
    createTime?:string,
    logo?:string,
    tenantName?:string,
    creditCode?:string,
    tenantType?:string,
    locked?:string,
    description?:string

}

/** 后端返回的树形菜单节点 */
export interface UserMenus{
    tenantId?:string,
    id:string,
    createTime:string | null,
    parentId?:string | null,
    menuName:string,
    menuPath:string,
    menuRouter:string,
    menuIcon:string,
    sort?:number | null,
    children?:UserMenus[]

}



/** 权限点定义 */
export interface Authority{
    id:string,
    parentId:string,
    authorityName:string,
    authority:string
}
