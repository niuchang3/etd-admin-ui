import type { Id } from '@/apis/types'

/** 字典类型列表及详情接口返回的数据。 */
export interface SystemDictType {
  id: Id
  createTime: string
  updateTime: string
  typeCode: string
  typeName: string
  builtIn: boolean
  enabled: boolean
  remark: string | null
}

/** 字典类型新增、编辑共用的完整表单数据。 */
export interface SystemDictTypeSaveDTO {
  typeCode: string
  typeName: string
  remark: string | null
}

/** 字典项列表及详情接口返回的数据，关联类型 ID 始终保持字符串。 */
export interface SystemDictData {
  id: Id
  createTime: string
  updateTime: string
  dictTypeId: Id
  dictCode: string
  dictLabel: string
  dictValue: string
  sort: number | null
  enabled: boolean
  remark: string | null
}

/** 字典项新增、编辑共用的完整表单数据。 */
export interface SystemDictDataSaveDTO {
  dictTypeId: Id
  dictCode: string
  dictLabel: string
  dictValue: string
  sort: number | null
  remark: string | null
}

/** 字典类型分页查询条件。 */
export interface SystemDictTypeQuery {
  current: number
  size: number
  keyword?: string
  enabled?: boolean
}

/** 字典项分页查询必须携带当前选中的字典类型 ID。 */
export interface SystemDictDataQuery extends SystemDictTypeQuery {
  dictTypeId: Id
}
