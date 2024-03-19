import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import qs from 'qs';
import { Cookies } from './Storage'
import { message } from 'ant-design-vue';
import { BASIC_CONSTANT } from '@/constant/BasicConstant';


axios.defaults.withCredentials = false
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8'
axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*'



const service: AxiosInstance = axios.create({
    // 超时时间
    timeout: 5000,
    paramsSerializer: {
        serialize: (params: any) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });;
        }
    }

});

service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    let token = Cookies.get(BASIC_CONSTANT.ACCESS_TOKEN);
    if (token) {
        config.headers[BASIC_CONSTANT.AUTHORIZATION] = `Bearer ${token}`
    }
    return config;
}, (error) => {
    return Promise.reject(error);
})


service.interceptors.response.use((response: AxiosResponse) => {
    if(response.data.code !==200){
        return Promise.reject(new Error(response.data.message))
    }
    return response.data;
}, (error) => {
    message.error(error.response.data.message)
    return error.response.data;
})



const request = (options: any) => {
    const { url, method, params, data, headersType, responseType, ...config } = options
    return service({
        url: url,
        method,
        params,
        data,
        ...config,
        responseType: responseType,
        headers: {
            'Content-Type': headersType || 'application/json'
        }
    })

}





export default {
    get: async<T = any>(option: any) => {
        const res = await request({ method: 'GET', ...option })
        return res.data as unknown as T
    },
    post: async <T = any>(option: any) => {
        const res = await request({ method: 'POST', ...option })
        return res.data as unknown as T
    },
    delete: async <T = any>(option: any) => {
        const res = await request({ method: 'DELETE', ...option })
        return res.data as unknown as T
    },
    put: async <T = any>(option: any) => {
        const res = await request({ method: 'PUT', ...option })
        return res.data as unknown as T
    },
    download: async <T = any>(option: any) => {
        const res = await request({ method: 'GET', responseType: 'blob', ...option })
        return res as unknown as Promise<T>
    },
    upload: async <T = any>(option: any) => {
        option.headersType = 'multipart/form-data'
        const res = await request({ method: 'POST', ...option })
        return res as unknown as Promise<T>
    }

};