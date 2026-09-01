import type { SystemDictData } from '@/apis/upms/dict/type'

export const SYSTEM_DICT_TYPE = {
  commonStatus: 'common_status',
  commonBuiltIn: 'common_builtin',
  configValueType: 'system_config_value_type',
  rolePermissionType: 'system_role_permission_type',
  menuAccessLevel: 'system_menu_access_level',
  menuType: 'system_menu_type',
  orgType: 'system_org_type',
  tenantType: 'system_tenant_type',
} as const

export interface SystemDictOption<T> {
  label: string
  value: T
}

/** 字典接口返回原始字符串值，页面按字段契约转换选项值后再绑定控件。 */
export const toSystemDictOptions = <T>(items: SystemDictData[], convert: (value: string) => T): SystemDictOption<T>[] =>
  items.map((item) => ({ label: item.dictLabel, value: convert(item.dictValue) }))

/** 未匹配时展示原始值，避免在前端用另一套中文映射掩盖缺失字典项。 */
export const getSystemDictLabel = (items: SystemDictData[], value: unknown): string => {
  const rawValue = String(value)
  return items.find((item) => item.dictValue === rawValue)?.dictLabel || rawValue
}
