/**
 * 格式化时间字符串为 YYYY-MM-DD HH:mm:ss
 * 自动处理 ISO 8601 中间的 'T'、毫秒与时区偏移
 */
export const formatDateTime = (val?: string | Date | null): string => {
  if (!val) return '—'
  const rawStr = val instanceof Date ? val.toISOString() : String(val).trim()
  if (!rawStr) return '—'
  return rawStr
    .replace('T', ' ')
    .replace(/\.\d+.*$/, '')
    .replace(/([+-]\d{2}:\d{2})$/, '')
    .trim()
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export const formatDate = (val?: string | Date | null): string => {
  if (!val) return '—'
  const dt = formatDateTime(val)
  return dt.split(' ')[0] || '—'
}

/**
 * 格式化文件大小字节数为人类可读格式（B, KB, MB, GB）
 * 安全兼容后端以十进制字符串形式返回的 Long 字节数
 */
export const formatFileSize = (bytes?: number | string | null): string => {
  if (bytes === undefined || bytes === null || bytes === '') return '—'
  const num = typeof bytes === 'number' ? bytes : Number(bytes)
  if (isNaN(num) || num < 0) return '—'
  if (num === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(num) / Math.log(k))
  const idx = Math.min(i, units.length - 1)
  const formatted = (num / Math.pow(k, idx)).toFixed(idx === 0 ? 0 : 2)
  return `${formatted} ${units[idx]}`
}

