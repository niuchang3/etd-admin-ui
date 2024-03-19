import request from "@/utils/Request";
import { AccountData } from "../types";

const X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded';


export const loginByAccount = async (data:AccountData) =>{
     return await request.post({
        url: '/upms/apis/oauth2/login',
        data,
        headersType: X_WWW_FORM_URLENCODED
    });
}
