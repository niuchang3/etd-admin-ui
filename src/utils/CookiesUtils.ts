import { inject } from "vue";
import { VueCookies } from "vue3-cookies/dist/interfaces";


const ACCESS_TOKEN = "accessToken";
const REFRESH_TOKEN = "refreshToken";


const setToken = (token:Authentication)=>{
    const $cookies = inject<VueCookies>('$cookies');
    if(token.accessToken !== undefined){
        $cookies?.set(ACCESS_TOKEN,JSON.stringify(token.accessToken),token.accessToken.expired);
    }
    if(token.refreshToken !== undefined){
        $cookies?.set(REFRESH_TOKEN,JSON.stringify(token.refreshToken),token.refreshToken?.expired);
    }
}

const getAccessToken = ():Token | undefined=>{
    const $cookies = inject<VueCookies>('$cookies');
    if($cookies?.isKey(ACCESS_TOKEN)){
        return JSON.parse($cookies.get(ACCESS_TOKEN))
    }
}

const getRefreshToken =():Token | undefined =>{
    const $cookies = inject<VueCookies>('$cookies');
    if($cookies?.isKey(REFRESH_TOKEN)){
        return JSON.parse($cookies.get(REFRESH_TOKEN))
    }
}

const setAccessToken = (token:Token) =>{
    const $cookies = inject<VueCookies>('$cookies');
    $cookies?.set(ACCESS_TOKEN,JSON.stringify(token),token.expired);
}

const setRefreshToken = (token:Token)  =>{
    const $cookies = inject<VueCookies>('$cookies');
    $cookies?.set(REFRESH_TOKEN,JSON.stringify(token),token.expired);
}



export default {setToken,getAccessToken,getRefreshToken,setAccessToken,setRefreshToken};