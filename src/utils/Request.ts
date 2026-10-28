import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import qs from 'qs';
import { message } from 'ant-design-vue';
import { clear, getAccessToken, refreshToken } from '@/stores/modules/oauth';
import { clearStore, tenantsStore } from '@/stores/modules/user';
import { useSystemConfigStore } from '@/stores/modules/config';
import router from '@/router/index';
import { AUTH_TOKEN_PREFIX, HTTP_HEADER, RESULT_CODE } from '@/constant';
import { APP_NAME, APP_VERSION, getDeviceId, getDeviceFingerprint } from './device';



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
 * 请求拦截器：向所有业务请求注入访问令牌、租户、应用元数据与设备指纹。
 */
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 注入应用名称与版本标识
    config.headers[HTTP_HEADER.APPLICATION] = APP_NAME;
    config.headers[HTTP_HEADER.VERSION] = APP_VERSION;

    // 注入客户端设备唯一标识 ID 与指纹
    config.headers[HTTP_HEADER.DEVICE_ID] = getDeviceId();
    config.headers[HTTP_HEADER.DEVICE_FINGERPRINT] = getDeviceFingerprint();

    // 默认请求应用全局网络策略；显式长超时（如资料合并、解析、索引）优先。
    try {
        const timeoutMs = useSystemConfigStore().network?.request?.timeoutMs;
        if (typeof timeoutMs === 'number' && timeoutMs > 0 && config.timeout === instance.defaults.timeout) {
            config.timeout = timeoutMs;
        }
    } catch {
        // Pinia 尚未初始化挂载时的静默降级
    }

    // 已登录请求统一使用 Bearer Token（刷新接口本身只依赖 refresh_token 校验，不携带可能已失效的 Authorization）。
    const isRefreshUrl = config.url && config.url.includes('/internal/refresh');
    const token = getAccessToken();
    if (token && !isRefreshUrl) {
        config.headers[HTTP_HEADER.AUTHORIZATION] = AUTH_TOKEN_PREFIX + token;
    }
    // 租户列表请求阶段可能尚未选定租户，因此只在 ID 存在时添加请求头。
    const tenantId = tenantsStore().userTenant.currentTenant?.id;
    if (tenantId) {
        config.headers[HTTP_HEADER.TENANT_CODE] = tenantId
    }
    return config;
}, (error: any) => {
    return Promise.reject(error);
})


// 防止多个 401 响应同时触发重复刷新，维护并发挂起队列。
let isRefreshing = false;
let retryQueue: Array<(token: string) => void> = [];

/**
 * 响应拦截器：统一处理令牌刷新、错误提示和跳转登录页。
 */
instance.interceptors.response.use((config: AxiosResponse) => {
    const result = config.data;
    if (result && typeof result === 'object' && 'code' in result && result.code !== RESULT_CODE.SUCCESS) {
        const errorMessage = result.message || result.devMessage || '请求失败';
        message.error(errorMessage);
        return Promise.reject(new Error(errorMessage));
    }
    return config;
}, async (error) => {
    let config = error.config;

    // 认证相关接口（登录、刷新、退出）返回 401 时不应再尝试刷新令牌，防止死循环。
    const isAuthUrl = config.url && (
        config.url.includes('/login') ||
        config.url.includes('/internal/refresh') ||
        config.url.includes('/internal/logout')
    );

    // 普通请求遇到 401 时，刷新令牌并重放原请求；若正处于刷新中则加入重试队列。
    if (error.response && error.response.status === 401 && !isAuthUrl && !config._retry) {
        config._retry = true;

        if (isRefreshing) {
            return new Promise((resolve) => {
                retryQueue.push((newToken: string) => {
                    config.headers[HTTP_HEADER.AUTHORIZATION] = AUTH_TOKEN_PREFIX + newToken;
                    resolve(instance(config));
                });
            });
        }

        isRefreshing = true;

        return await refreshToken().then(() => {
            const token = getAccessToken() || '';
            config.headers[HTTP_HEADER.AUTHORIZATION] = AUTH_TOKEN_PREFIX + token;
            // 唤醒所有挂起的并发请求并重试
            retryQueue.forEach((callback) => callback(token));
            retryQueue = [];
            return instance(config);
        }).catch(err => {
            retryQueue = [];
            clear()
            void clearStore()
            message.error('令牌失效,请重新登录。')
            router.push({ path: '/login' })
            return Promise.reject(err)
        }).finally(() => {
            isRefreshing = false;
        })

    }

    // 权限不足提示
    if (error.response?.status === 403) {
        const errorMsg = error.response.data?.message || '无操作权限，请联系管理员分配权限或重新登录';
        message.error(errorMsg);
        return await Promise.reject(error);
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
