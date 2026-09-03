import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSystemConfigValues } from '@/apis/upms/config'
import { getAccessToken } from '@/stores/modules/oauth'

export const SYSTEM_CONFIG_KEY = {
  branding: 'system.branding',
  securityPolicy: 'security.policy',
  resourceLimit: 'system.resource.limit',
  networkPolicy: 'system.network.policy',
} as const

// 定义系统内置配置项的强类型结构
export interface BrandingConfig {
  name: string
  subtitle: string
  logo: string
  favicon: string
  copyright: string
  eyebrow: string
  title: string
  description: string
  region: string
  version: string
  securityText: string
  formEyebrow: string
  formTitle: string
  formDescription: string
  auditNote: string
  serviceStatus: string
  watermark: {
    enabled: boolean
    opacity: number
    fontSize: number
  }
}

export interface SecurityPolicy {
  captcha: {
    triggerOnFailCount: number
  }
  password: {
    minLength: number
    regexp: string
    defaultPassword: string
  }
}

export interface ResourceLimit {
  upload: {
    maxSizeMb: number
    allowedExtensions: string[]
  }
  organization: {
    maxDepth: number
    exportLimit: number
  }
  menu: {
    maxDepth: number
  }
  pagination: {
    defaultSize: number
    maxSize: number
  }
}

export interface NetworkPolicy {
  request: {
    timeoutMs: number
    retryTimes: number
  }
  cache: {
    dictTtlSeconds: number
    userMenuTtlSeconds: number
  }
}

// 本地兜底默认值
export const DEFAULT_BRANDING: BrandingConfig = {
  name: 'ETD 后台管理系统',
  subtitle: 'Operations Suite',
  logo: '',
  favicon: '/favicon.ico',
  copyright: 'Copyright © 2026 ETD. All Rights Reserved.',
  eyebrow: 'Enterprise Operations Console',
  title: '统一运营管理平台',
  description: '集中管理任务、资源和平台运行状态。',
  region: 'CN-EAST-1',
  version: 'v2.8.4',
  securityText: 'Secure access · TLS 1.3',
  formEyebrow: 'Account Access',
  formTitle: '登录控制台',
  formDescription: '请输入你的账号和密码以继续。',
  auditNote: '仅限已授权的平台账号访问。登录行为将被安全审计。',
  serviceStatus: 'Operational',
  watermark: {
    enabled: false,
    opacity: 0.15,
    fontSize: 14,
  },
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  captcha: {
    triggerOnFailCount: 5,
  },
  password: {
    minLength: 8,
    regexp: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$',
    defaultPassword: 'Etd@123456',
  },
}

export const DEFAULT_RESOURCE_LIMIT: ResourceLimit = {
  upload: {
    maxSizeMb: 10,
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.pdf', '.xlsx', '.zip', '.docx'],
  },
  organization: {
    maxDepth: 6,
    exportLimit: 5000,
  },
  menu: {
    maxDepth: 4,
  },
  pagination: {
    defaultSize: 10,
    maxSize: 200,
  },
}

export const DEFAULT_NETWORK_POLICY: NetworkPolicy = {
  request: {
    timeoutMs: 5000,
    retryTimes: 3,
  },
  cache: {
    dictTtlSeconds: 600,
    userMenuTtlSeconds: 1800,
  },
}

export const useSystemConfigStore = defineStore('system-config', () => {
  const branding = ref<BrandingConfig>({ ...DEFAULT_BRANDING })
  const security = ref<SecurityPolicy>({ ...DEFAULT_SECURITY_POLICY })
  const resource = ref<ResourceLimit>({ ...DEFAULT_RESOURCE_LIMIT })
  const network = ref<NetworkPolicy>({ ...DEFAULT_NETWORK_POLICY })
  const loading = ref(false)
  const isLoaded = ref(false)
  const isBrandingLoaded = ref(false)

  let fetchPromise: Promise<void> | null = null
  let fetchBrandingPromise: Promise<void> | null = null

  const safeParse = (val: unknown) => {
    if (!val) return null
    if (typeof val === 'object') return val
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return null
      }
    }
    return null
  }

  const updateBrandingState = (raw: unknown) => {
    const rawBranding = safeParse(raw)
    if (rawBranding) {
      branding.value = {
        ...DEFAULT_BRANDING,
        ...rawBranding,
        watermark: {
          ...DEFAULT_BRANDING.watermark,
          ...(rawBranding.watermark || {}),
        },
      }
    }
  }

  /**
   * 仅拉取公开品牌与登录页展示配置（系统名称、Logo、Favicon、版权及登录页文案等）
   * 适用于登录页与未登录初始状态，避免在匿名阶段获取内部安全策略与配额
   */
  const fetchBrandingConfig = async (force = false) => {
    if (isBrandingLoaded.value && !force) {
      return
    }

    if (fetchBrandingPromise) {
      return fetchBrandingPromise
    }

    fetchBrandingPromise = (async () => {
      try {
        const response = await getSystemConfigValues([SYSTEM_CONFIG_KEY.branding])
        const data = response.data || {}
        updateBrandingState(data[SYSTEM_CONFIG_KEY.branding])
        isBrandingLoaded.value = true
      } catch (e) {
        console.warn('Failed to load branding config, falling back to defaults:', e)
        branding.value = { ...DEFAULT_BRANDING }
      } finally {
        fetchBrandingPromise = null
      }
    })()

    return fetchBrandingPromise
  }

  /**
   * 拉取系统核心内置参数（包含安全策略、资源配额与网络策略）
   * 仅在已登录有访问令牌的状态下拉取；未登录状态下自动降级为仅拉取基础 branding
   * @param force 是否强制跳过缓存重新请求后端（默认 false）
   */
  const fetchConfigs = async (force = false) => {
    // 0. 安全守卫：未登录匿名状态下，严格禁止向后端索取内部敏感配置，自动降级为只拉取公开 branding
    const hasToken = Boolean(getAccessToken())
    if (!hasToken) {
      return fetchBrandingConfig(force)
    }

    // 1. 已加载且非强制刷新，直接命中缓存
    if (isLoaded.value && !force) {
      return
    }

    // 2. 防并发去重：若当前正在拉取中，复用该 Promise
    if (fetchPromise) {
      return fetchPromise
    }

    fetchPromise = (async () => {
      loading.value = true
      try {
        const keys = [
          SYSTEM_CONFIG_KEY.branding,
          SYSTEM_CONFIG_KEY.securityPolicy,
          SYSTEM_CONFIG_KEY.resourceLimit,
          SYSTEM_CONFIG_KEY.networkPolicy,
        ]
        const response = await getSystemConfigValues(keys)
        const data = response.data || {}

        // 如果获取成功，解析 JSON。如果解析失败或值不存在，执行回滚兜底。
        updateBrandingState(data[SYSTEM_CONFIG_KEY.branding])
        isBrandingLoaded.value = true

        const rawSecurity = safeParse(data[SYSTEM_CONFIG_KEY.securityPolicy])
        if (rawSecurity) {
          security.value = {
            captcha: {
              ...DEFAULT_SECURITY_POLICY.captcha,
              ...(rawSecurity.captcha || {}),
            },
            password: {
              ...DEFAULT_SECURITY_POLICY.password,
              ...(rawSecurity.password || {}),
            },
          }
        }

        const rawResource = safeParse(data[SYSTEM_CONFIG_KEY.resourceLimit])
        if (rawResource) {
          resource.value = {
            ...DEFAULT_RESOURCE_LIMIT,
            ...rawResource,
            upload: { ...DEFAULT_RESOURCE_LIMIT.upload, ...(rawResource.upload || {}) },
            organization: { ...DEFAULT_RESOURCE_LIMIT.organization, ...(rawResource.organization || {}) },
            menu: { ...DEFAULT_RESOURCE_LIMIT.menu, ...(rawResource.menu || {}) },
            pagination: { ...DEFAULT_RESOURCE_LIMIT.pagination, ...(rawResource.pagination || {}) },
          }
        }

        const rawNetwork = safeParse(data[SYSTEM_CONFIG_KEY.networkPolicy])
        if (rawNetwork) {
          network.value = {
            ...DEFAULT_NETWORK_POLICY,
            ...rawNetwork,
            request: { ...DEFAULT_NETWORK_POLICY.request, ...(rawNetwork.request || {}) },
            cache: { ...DEFAULT_NETWORK_POLICY.cache, ...(rawNetwork.cache || {}) },
          }
        }
        isLoaded.value = true
      } catch (e) {
        // 网络请求失败、接口报错时，全面降级使用前端硬编码默认值
        console.warn('Failed to load system config, falling back to defaults:', e)
        branding.value = { ...DEFAULT_BRANDING }
        security.value = { ...DEFAULT_SECURITY_POLICY }
        resource.value = { ...DEFAULT_RESOURCE_LIMIT }
        network.value = { ...DEFAULT_NETWORK_POLICY }
      } finally {
        loading.value = false
        fetchPromise = null
      }
    })()

    return fetchPromise
  }

  const $reset = () => {
    branding.value = { ...DEFAULT_BRANDING }
    security.value = { ...DEFAULT_SECURITY_POLICY }
    resource.value = { ...DEFAULT_RESOURCE_LIMIT }
    network.value = { ...DEFAULT_NETWORK_POLICY }
    loading.value = false
    isLoaded.value = false
    isBrandingLoaded.value = false
    fetchPromise = null
    fetchBrandingPromise = null
  }

  return {
    branding,
    security,
    resource,
    network,
    loading,
    isLoaded,
    isBrandingLoaded,
    fetchBrandingConfig,
    fetchConfigs,
    $reset,
  }
}, { persist: { storage: localStorage } })
