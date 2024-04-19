
// 统一处理请求体
export interface Response<T>{
    code:Number,
    data:T,
    devMessage:string,
    message:string,
    url:string
}
