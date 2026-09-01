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
