import { LoginType } from "@/apis/upms/login/type";
import { defineStore } from "pinia";
import { computed, ref } from "vue";




const loginTabsStore = defineStore('loginTabsStore',() => {
    const tabsStore = ref({
        activeKey: LoginType.Account,
        smsShow: true,
        smsCountDown: 30,
    });

    const  decrease =  computed(() =>{
        tabsStore.value.smsShow = false;
        tabsStore.value.smsCountDown --;
    })

    const resetCountDown = ()=>{
        tabsStore.value.smsShow = true;
        tabsStore.value.smsCountDown = 30
    }

    return {
        tabsStore,decrease,resetCountDown
    }

})

export default loginTabsStore