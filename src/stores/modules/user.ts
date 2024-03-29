import { selectUserInfo } from "@/apis/login";
import { defineStore } from "pinia";
import { ref } from "vue";

const userStore = defineStore('userInfo',()=>{

    const userInfo  = ref({})
    const getUserInfo = async ()=>{
        if(!isEmptyObject(userInfo.value)){
            return userInfo;
        }

        return await selectUserInfo().then((user) =>{
            userInfo.value = user.data
            return  user;
        })
    }

    const isEmptyObject = (obj:object):boolean =>{
        return Object.keys(obj).length === 0 && obj.constructor === Object; 
    }
    return {userInfo,getUserInfo}
},{
    persist:{
        storage:localStorage
    }
})


export default userStore;