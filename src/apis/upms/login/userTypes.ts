

export enum LoginType{
    Account='Account',
    Sms='SMS',
}



export interface LonginRequestParams{
    longinType : LoginType,
    uuid: string,
    username: string,
    password: string,
    captcha: string,
    mobile:string
}

export interface Token{
    expires: string,
    value:string,
}


export interface Oauth2Token{
    accessToken:Token,
    refreshToken: Token | any,
    tokenType:string
}


export interface UserInfo {
    id:string | null,
    userName:string | null,
    birthday:Date | null,
    gender:number | null,
    avatar:string | null,
    nickName:string | null
}



export interface Tenant{
    id:string,
    parentId:string,
    createTime:string,
    logo:string,
    tenantName:string,
    creditCode:string,
    tenantType:string,
    locked:string,
    description:string

}

export interface UserMenus{
    id:string,
    createTime:string,
    parentId:string,
    menuName:string,
    menuPath:string,
    menuRouter:string,
    menuIcon:string,

}



export interface Authority{
    id:string,
    parentId:string,
    authorityName:string,
    authority:string
}

