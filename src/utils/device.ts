import FingerprintJS from '@fingerprintjs/fingerprintjs'

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'etd-admin-ui'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'

const DEVICE_ID_KEY = 'etd_device_id'
const DEVICE_FINGERPRINT_KEY = 'etd_device_fingerprint'

/**
 * 生成 32 位 UUID（去除连字符）
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 获取客户端设备唯一标识 ID（x-device-id）
 * 首次访问生成并持久化到 localStorage 中，后续全局复用。
 */
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = generateUUID()
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  } catch {
    return generateUUID()
  }
}

let inMemoryFingerprint: string | null = null
let fpPromise: Promise<string> | null = null

/**
 * 使用开源官方库 @fingerprintjs/fingerprintjs 异步计算并缓存设备指纹
 */
export async function initDeviceFingerprint(): Promise<string> {
  if (inMemoryFingerprint) {
    return inMemoryFingerprint
  }

  if (fpPromise) {
    return fpPromise
  }

  fpPromise = (async () => {
    try {
      const fp = await FingerprintJS.load()
      const result = await fp.get()
      const visitorId = result.visitorId
      inMemoryFingerprint = visitorId
      try {
        localStorage.setItem(DEVICE_FINGERPRINT_KEY, visitorId)
      } catch {
        // 忽略持久化异常
      }
      return visitorId
    } catch (e) {
      console.warn('[FingerprintJS] 指纹初始化失败，降级使用设备 ID:', e)
      const fallback = getDeviceId()
      inMemoryFingerprint = fallback
      return fallback
    }
  })()

  return fpPromise
}

// 模块加载时立即发起预热加载
if (typeof window !== 'undefined') {
  void initDeviceFingerprint()
}

/**
 * 同步获取客户端设备指纹（x-device-fingerprint）供 Axios 请求拦截器注入。
 * 优先读取内存与 localStorage 缓存；未完成时以设备 ID 兜底。
 */
export function getDeviceFingerprint(): string {
  if (inMemoryFingerprint) {
    return inMemoryFingerprint
  }

  try {
    const cached = localStorage.getItem(DEVICE_FINGERPRINT_KEY)
    if (cached) {
      inMemoryFingerprint = cached
      return cached
    }
  } catch {
    // 忽略异常
  }

  // 若尚未就绪，先以稳定设备 ID 兜底，并异步触发预热
  void initDeviceFingerprint()
  return getDeviceId()
}
