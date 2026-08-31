import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSystemConfigValues } from '@/apis/upms/config'

export const SYSTEM_CONFIG_KEY = {
  branding: 'system.branding',
  securityPolicy: 'security.policy',
  resourceLimit: 'system.resource.limit',
  networkPolicy: 'system.network.policy',
} as const

// 定义系统内置配置项的强类型结构
export interface BrandingConfig {
  name: string
  logo: string
  favicon: string
  copyright: string
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
  logo: '/assets/images/logo.png',
  favicon: '/favicon.ico',
  copyright: 'Copyright © 2026 ETD. All Rights Reserved.',
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

  const fetchConfigs = async () => {
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
      if (data[SYSTEM_CONFIG_KEY.branding]) {
        try {
          branding.value = { ...DEFAULT_BRANDING, ...JSON.parse(data[SYSTEM_CONFIG_KEY.branding]) }
        } catch {
          branding.value = { ...DEFAULT_BRANDING }
        }
      }
      if (data[SYSTEM_CONFIG_KEY.securityPolicy]) {
        try {
          security.value = { ...DEFAULT_SECURITY_POLICY, ...JSON.parse(data[SYSTEM_CONFIG_KEY.securityPolicy]) }
        } catch {
          security.value = { ...DEFAULT_SECURITY_POLICY }
        }
      }
      if (data[SYSTEM_CONFIG_KEY.resourceLimit]) {
        try {
          resource.value = { ...DEFAULT_RESOURCE_LIMIT, ...JSON.parse(data[SYSTEM_CONFIG_KEY.resourceLimit]) }
        } catch {
          resource.value = { ...DEFAULT_RESOURCE_LIMIT }
        }
      }
      if (data[SYSTEM_CONFIG_KEY.networkPolicy]) {
        try {
          network.value = { ...DEFAULT_NETWORK_POLICY, ...JSON.parse(data[SYSTEM_CONFIG_KEY.networkPolicy]) }
        } catch {
          network.value = { ...DEFAULT_NETWORK_POLICY }
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
    }
  }

  return {
    branding,
    security,
    resource,
    network,
    loading,
    isLoaded,
    fetchConfigs,
  }
})
