import { defineStore } from 'pinia'
import { ref } from 'vue';

interface LoginTabs {
    activeKey: string,
    smsCodeShow: boolean,
    smsCountdown?: number
}

const loginTabsStore = defineStore('loginTabsData',{
    state: () => {

        const data = ref<LoginTabs>({
            activeKey: '',
            smsCodeShow: true
        });

        const getActiveKey = (): string => {
            return data.value.activeKey;
        }

        const setActiveKey = (value: string) => {
        }

        const getSmsCodeShow = (): boolean => {
            return data.value.smsCodeShow;
        }

        const setSmsCodeShow = (value: boolean) => {
            data.value.smsCodeShow = value;
        }
        const getSmsCountdown = (): number | any => {
            return data.value.smsCountdown
        }

        const setSmsCountdown = (value: number) => {
            data.value.smsCountdown = value;
        }

        return {data,getActiveKey,setActiveKey,getSmsCodeShow,setSmsCodeShow,getSmsCountdown,setSmsCountdown}
    },
    persist:{
        storage: sessionStorage
    }
}

);


export  { loginTabsStore}