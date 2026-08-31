
/** 后端统一响应结构 */
export type Id = string

export interface Response<T>{
    code:number,
    data:T,
    devMessage:string,
    message:string,
    url:string
}


/** 分页查询的统一响应数据 */
export interface PageResponse<T>{
    total:number,
    records:T[],
}


/** 分页查询的通用请求参数 */
export interface PageRequest{
    current:number,
    size:number,
}
