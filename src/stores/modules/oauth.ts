
import { LonginRequestParams, RefreshTokenParams, Token } from '@/apis/upms/login/type'
import { Cookies } from '@/utils/storage'
import { loginByUserName, updateToken } from '@/apis/upms/login'
import router from '@/router/index'


export const accountLogin =  async (formData: LonginRequestParams) => {
    return await loginByUserName(formData).then(resData =>{
        Cookies.set<Token>('accessToken',resData.data.accessToken,new Date(resData.data.accessToken.expires));
        if(resData.data.refreshToken){
            Cookies.set<Token>('refreshToken',resData.data.refreshToken,new Date(resData.data.refreshToken.expires));
        }
        return resData
    })
}

export const smsLogin =(formData : LonginRequestParams) =>{

}



export const refreshToken = async () =>{
    const params:RefreshTokenParams  = {
        grant_type: 'refresh_token',
        refresh_token: ''
    }
    let token = getRefreshToken();
    if(!token){
        router.push({path:'/login'})
        return;
    }
    params.refresh_token = token;

    return await updateToken(params).then(resData =>{
        Cookies.set<Token>('accessToken',resData.data.accessToken,new Date(resData.data.accessToken.expires));
        if(resData.data.refreshToken){
            Cookies.set<Token>('refreshToken',resData.data.refreshToken,new Date(resData.data.refreshToken.expires));
        }
        return resData;
    })
}



export const getAccessToken = ():string | null =>{
    const token = Cookies.get<Token>('accessToken');
    return token ? token.value : null;
}

export const getRefreshToken = ():string | null =>{
    const token = Cookies.get<Token>('refreshToken');
    return token ? token.value : null;
}


export const clear  = ()=>{
    Cookies.remove('accessToken')
    Cookies.remove('refreshToken')
}