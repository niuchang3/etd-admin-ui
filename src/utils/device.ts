/**
 * 设备标识与客户端指纹工具
 */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'etd-admin-ui';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

const DEVICE_ID_KEY = 'etd_device_id';
const DEVICE_FINGERPRINT_KEY = 'etd_device_fingerprint';

/**
 * 生成 32 位 UUID（去除连字符）
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取客户端设备唯一标识 ID（x-device-id）
 * 首次访问生成并持久化到 localStorage 中，后续全局复用。
 */
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // localStorage 被禁用或受限时的降级策略
    return generateUUID();
  }
}

/**
 * 绘制离屏 Canvas 获取渲染特征字符串
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'PingFang SC', sans-serif";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('ETD-Admin,Device-FP-2026', 2, 15);

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('ETD-Admin,Device-FP-2026', 4, 17);

    return canvas.toDataURL();
  } catch {
    return '';
  }
}

/**
 * 高性能 32 位十六进制散列函数
 */
function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

let inMemoryFingerprint: string | null = null;

/**
 * 获取客户端设备指纹（x-device-fingerprint）- 方案 B
 * 采集 Canvas 渲染特征 + 屏幕参数 + 时区 + 语言等硬件与系统特征并散列。
 * 具备双重缓存（内存与 localStorage），避免每次请求重复计算。
 */
export function getDeviceFingerprint(): string {
  if (inMemoryFingerprint) {
    return inMemoryFingerprint;
  }

  try {
    const cached = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (cached) {
      inMemoryFingerprint = cached;
      return cached;
    }
  } catch {
    // localStorage 读取异常继续往下计算
  }

  try {
    const features: string[] = [
      navigator.userAgent || '',
      navigator.language || '',
      (navigator.languages || []).join(','),
      String(screen.width || 0),
      String(screen.height || 0),
      String(screen.colorDepth || 0),
      String(window.devicePixelRatio || 1),
      String(navigator.hardwareConcurrency || 1),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String(new Date().getTimezoneOffset()),
      getCanvasFingerprint(),
    ];

    const fingerprint = hashString(features.join('|||'));
    inMemoryFingerprint = fingerprint;

    try {
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    } catch {
      // 忽略存储失败
    }

    return fingerprint;
  } catch {
    // 兜底退化为随机生成并缓存
    const fallback = generateUUID();
    inMemoryFingerprint = fallback;
    return fallback;
  }
}
