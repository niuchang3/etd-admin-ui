
import { LonginRequestParams, Token } from '@/apis/upms/login/userTypes'
import { Cookies } from '@/utils/storage'
import { loginByUserName } from '@/apis/upms/login'
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



export const refreshToken = () =>{
    const refreshToken = getRefreshToken();
    if(!refreshToken){
        router.push({path:'/login'})
        return;
    }
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