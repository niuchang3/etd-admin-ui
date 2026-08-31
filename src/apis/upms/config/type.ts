import type { Id } from '@/apis/types'

/** 系统参数支持的内置值类型；后端仍允许返回其他扩展字符串。 */
export type SystemConfigValueType = 'string' | 'number' | 'boolean' | 'json'

/** 系统参数列表及详情接口返回的数据。Long 类型 ID 统一按字符串接收。 */
export interface SystemConfig {
  id: Id
  createTime: string
  updateTime: string
  parameterKey: string
  parameterName: string
  parameterValue: string | null
  valueType: string
  builtIn: boolean
  enabled: boolean
  remark: string | null
}

/** 系统参数新增、编辑共用的完整表单数据，启停状态由独立接口维护。 */
export interface SystemConfigSaveDTO {
  parameterKey: string
  parameterName: string
  parameterValue: string | null
  valueType: string
  remark: string | null
}

/** 系统参数分页查询条件。enabled 不传表示查询全部状态。 */
export interface SystemConfigQuery {
  current: number
  size: number
  keyword?: string
  enabled?: boolean
  valueType?: string
}
