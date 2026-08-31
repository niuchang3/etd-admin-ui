
/** 后端统一响应结构 */
export type Id = string

export interface ResultModel<T> {
    code: number
    data: T
    devMessage: string
    message: string
    url: string
}

/** 兼容项目已有 API 的统一响应类型命名。 */
export type Response<T> = ResultModel<T>


/** 分页查询的统一响应数据 */
export interface PageResult<T> {
    records: T[]
    total: number
    size: number
    current: number
    pages: number
}

/** 兼容项目已有分页类型命名。 */
export type PageResponse<T> = PageResult<T>


/** 分页查询的通用请求参数 */
export interface PageRequest{
    current:number,
    size:number,
}
