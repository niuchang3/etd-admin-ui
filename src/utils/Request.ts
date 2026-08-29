import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import qs from 'qs';
import { message } from 'ant-design-vue';
import { clear, getAccessToken, refreshToken } from '@/stores/modules/oauth';
import { tenantsStore } from '@/stores/modules/user';
import router from '@/router/index'



// 跨域请求不自动携带浏览器默认凭证。
axios.defaults.withCredentials = false
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8'
// axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*'


/**
 * 创建 Axios 实例，统一设置超时时间与数组参数序列化方式。
 */
const instance: AxiosInstance = axios.create({
    // 所有请求的默认超时时间为 5 秒。
    // baseURL: import.meta.env.VITE_SERVER_BASE_API,
    timeout: 5000,
    paramsSerializer: {
        serialize: (params: any) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });;
        }
    }

});

/**
 * 请求拦截器：向所有业务请求注入访问令牌和当前租户 ID。
 */
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 已登录请求统一使用 Bearer Token。
    const token = getAccessToken();
    if (token) {
        config.headers['Authorization'] = 'Bearer ' + token;
    }
    // 租户列表请求阶段可能尚未选定租户，因此只在 ID 存在时添加请求头。
    const tenantId = tenantsStore().userTenant.currentTenant?.id;
    if (tenantId) {
        config.headers['TENANT-CODE'] = tenantId
    }
    return config;
}, (error: any) => {
    return Promise.reject(error);
})


// 防止多个 401 响应同时触发重复刷新。
let isRefreshing = false;
/**
 * 响应拦截器：统一处理令牌刷新、错误提示和跳转登录页。
 */
instance.interceptors.response.use((config: AxiosResponse) => {


    return config;
}, async (error) => {
    let config = error.config;

    // 登录接口返回 401 时不应再尝试刷新令牌。
    const isLoginUrl = config.url && (config.url.includes('/login') || config.url.includes('/oauth2/login') || config.url.includes('/internal/login'));

    // 普通请求遇到 401 时，仅刷新一次令牌并重放原请求。
    if (error.response && error.response.status === 401 && !isLoginUrl && !isRefreshing && !config._retry) {
        config._retry = true;
        isRefreshing = true;

        return await refreshToken().then(_res => {
            const token = getAccessToken();
            config.headers['Authorization'] = 'Bearer ' + token;
            return instance(config);
        }).catch(_err => {
            clear()
            message.error('令牌失效,请重新登录。')
            router.push({ path: '/login' })
            return Promise.reject(error)
        }).finally(() => {
            isRefreshing = false;
        })

    }

    // 服务器内部错误优先展示后端返回的详细消息。
    if (error.response?.status === 500) {
        message.error(`${error.response.data.message || '服务器内部错误'}`)
        return await Promise.reject(error)
    }
    // 其他非 2xx 响应统一转换为可读的页面提示。
    if (error.response && error.response.data) {
        const errorMsg = error.response.data.message || '请求出错';
        message.error(errorMsg);
        return Promise.reject(error.response.data)
    }

    message.error('请求出错')
    return Promise.reject(error);
})





/** 将业务请求参数转换为 Axios 请求配置。 */
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





// 对外提供统一的 REST 请求方法，并直接返回后端业务数据。
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
    patch: async <T = any>(option: any) => {
        const response = await request({ method: 'PATCH', ...option })
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
