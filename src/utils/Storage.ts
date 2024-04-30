import { useCookies } from "vue3-cookies";
const {cookies} = useCookies();

/**
 * 本地缓存
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
 * 操作本地Session
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


const cacheClear = ()=>{
    Local.clear();
    Session.clear()
    Cookies.clear();
    return Promise.resolve(true)
}

export {Local,Session,Cookies,cacheClear}