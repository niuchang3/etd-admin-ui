import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import qs from 'qs';
import { message } from 'ant-design-vue';
import { clear, getAccessToken, refreshToken } from '@/stores/modules/oauth';
import { tenantsStore } from '@/stores/modules/user';
import router from '@/router/index'



axios.defaults.withCredentials = false
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8'
axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*'


/**
 * 创建Axios实例
 */
const instance: AxiosInstance = axios.create({
    // 超时时间
    // baseURL: import.meta.env.VITE_SERVER_BASE_API,
    timeout: 5000,
    paramsSerializer: {
        serialize: (params: any) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });;
        }
    }

});

/**
 *  配置 Request 请求拦截器
 */
instance.interceptors.request.use((config:InternalAxiosRequestConfig) =>{
    const token = getAccessToken();
    if(token){
        config.headers['Authorization'] = 'Bearer '+ token;
    }
    let currentTenant = tenantsStore().userTenant.currentTenant;
    if(currentTenant){
        config.headers['TENANT-CODE'] = currentTenant.id
    }
    return config;
},(error:any) =>{
    return Promise.reject(error);
})


let isRefreshing = false;
/**
 * 增加Response 拦截器 对数据统一处理
 */
instance.interceptors.response.use((config:AxiosResponse)=>{

    
    return config;
}, async (error) =>{
    let config = error.config;
    // config._retry
    if(error.response.status === 401 && !isRefreshing && !config._retry ){
        config._retry = true;
        isRefreshing = true;

        return await refreshToken().then(_res =>{
            const token = getAccessToken();
            config.headers['Authorization'] = 'Bearer '+ token;
            instance(config);
        }).catch(_err =>{
            clear()
            message.error('令牌失效,请重新登录。')
            router.push({path:'/login'})
            return Promise.reject(error)
        }).finally(()=>{
            isRefreshing = false;
        })
        
    }

    if(error.response?.status === 500){
        message.error(`${error.response.data.message}`)
        return await Promise.reject(error)
    }
    // 请求已发出，但服务器响应的状态码不在 2xx 范围内
    if(error.response && error.response.data){
        console.log('异常逻辑',3)
        return Promise.reject(error.response.data)
    }

    message.error('请求出错')
    return Promise.reject(error);
})





const request = (options: any) => {
    const { url, method, params, data, contentType, responseType, ...config } = options
    return instance({
        url: url,
        method,
        params,
        data,
        ...config,
        responseType: responseType,
        headers: {
            'Content-Type': contentType || 'application/json;charset=UTF-8'
        }
    })

}





export default {
    get: async<T = any>(option: any) => {
        const response = await request({ method: 'GET', ...option });
        return response.data as unknown as T
    },
    post: async <T = any>(option: any) => {
        const response = await request({ method: 'POST', ...option })
        return response.data as unknown as T
    },
    delete: async <T = any>(option: any) => {
        const response = await request({ method: 'DELETE', ...option })
        return response.data as unknown as T
    },
    put: async <T = any>(option: any) => {
        const response = await request({ method: 'PUT', ...option })
        return response.data as unknown as T
    },
    download: async <T = any>(option: any) => {
        const response = await request({ method: 'GET', responseType: 'blob', ...option })
        return response as unknown as Promise<T>
    },
    upload: async <T = any>(option: any) => {
        option.contentType = 'multipart/form-data'
        const response = await request({ method: 'POST', ...option })
        return response as unknown as Promise<T>
    }

};