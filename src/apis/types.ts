export enum LoginType{
    Account='Account',
    Sms='SMS',
}


export interface AccountData {
    loginType:LoginType,
    uuid: string,
    captcha: string,
    username: string,
    password: string,
}

export interface MobileData {
    loginType:LoginType,
    captcha: string,
    mobile: string
}

