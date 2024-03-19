import { loginByAccount } from "@/apis/login"

import { AccountData,MobileData,LoginType } from "@/apis/types";

import { Cookies } from '@/utils/Storage'


export interface Token {
    tokenType: string,
    tokenValue: string,
    expired: number
}


export const accountLogin = (formData: AccountData) => {
    loginByAccount(formData).then(resData =>{
        Cookies.set<Token>('accessToken',resData.accessToken,resData.expires)
        Cookies.set<Token>('refreshToken',resData.refreshToken,resData.expires)
        console.log(resData.accessToken,'resData')
    })
 
}

export const smsLogin =(formData : MobileData) =>{

}




export const getAccessToken = ():string =>{
    return Cookies.get('accessToken')
}


export const getRefreshToken = ():string =>{

    return Cookies.get('refreshToken')
}
