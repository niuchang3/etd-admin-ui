
// 统一处理请求体
export interface Response<T>{
    code:Number,
    data:T,
    devMessage:string,
    message:string,
    url:string
}


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


export interface Tenant{
    id:string,
    tenantName:string,
    authorities:Authority[]

}

export interface Authority{
    id:string,
    parentId:string,
    authorityName:string,
    authority:string
}


export interface UserInfo {
    id:string | null,
    userName:string | null,
    birthday:Date | null,
    gender:number | null,
    avatar:string | null,
    nickName:string | null,
    tenant:Tenant[] | null
}