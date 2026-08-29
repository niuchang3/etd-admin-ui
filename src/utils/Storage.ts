import { useCookies } from "vue3-cookies";
// 获取全局 Cookie 操作实例。
const {cookies} = useCookies();

/**
 * localStorage 封装：用于需要跨会话保留的数据。
 */
const Local = {

    set<T>(key:string,value:T){
        window.localStorage.setItem(key,JSON.stringify(value));
    },
    get(key:string){
        let json = <string>window.localStorage.getItem(key);
        return JSON.parse(json);
    },
    remove(key:string){
        window.localStorage.removeItem(key);
    },
    clear(){
        window.localStorage.clear();
    }
}
/**
 * sessionStorage 封装：数据只在当前浏览器会话中有效。
 */
const Session = {

    set<T>(key:string,value:T){
        window.sessionStorage.setItem(key,JSON.stringify(value));
    },
    get<T>(key:string){
        let json = <string>window.sessionStorage.getItem(key);
        return json as T;
    },
    remove(key:string){
        window.sessionStorage.removeItem(key);
    },
    clear(){
        window.sessionStorage.clear();
    }
}

/** Cookie 封装：主要用于存储访问令牌与刷新令牌。 */
const Cookies = {

    set<T>(key:string,value:T,expireTimes?: string | number | Date){
        cookies.set(key,JSON.stringify(value),expireTimes);
    },
    get<T>(key:string){
        let json=  <string>cookies.get(key);
        return json as T;
    },
    remove(key:string){
        cookies.remove(key);
    },
    clear(){
        let keys:string[] = cookies.keys();
        keys.forEach( item =>{
            cookies.remove(item)
        })
    }
}


/** 清空应用使用的所有本地缓存容器。 */
const cacheClear = ()=>{
    Local.clear();
    Session.clear()
    Cookies.clear();
    return Promise.resolve(true)
}

export {Local,Session,Cookies,cacheClear}
