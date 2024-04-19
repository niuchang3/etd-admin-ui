<template>
    <div class="container">
        <div class="panel-content">

            <div class="panel-left">
                <div class="left-content">
                    <h3>Welcome to visit Easy to Develop</h3>
                    <p>Easy to Develop framework Functional Demo</p>
                </div>
            </div>

            <div class="panel-right">
                <a-tabs v-model:activeKey="tabsStore.tabsStore.activeKey" @change="selectedTabs">
                    <a-tab-pane :key="LoginType.Account" :tab="LoginType.Account">

                        <a-form autocomplete="off" ref="accountFormRef"  :model="loginFormData" :rules="accountRules">

                            <a-form-item name="longinType" hidden>
                                <a-input v-model:value="loginFormData.longinType" autocomplete="off" />
                            </a-form-item>

                            <a-form-item name="username">
                                <a-input placeholder="Please enter your account." v-model:value="loginFormData.username"
                                    autocomplete="off">
                                    <template #prefix>
                                        <UserOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input>
                            </a-form-item>

                            <a-form-item name="password">
                                <a-input-password placeholder="Please enter your password."
                                    v-model:value="loginFormData.password" autocomplete="off">
                                    <template #prefix>
                                        <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input-password>
                            </a-form-item>
                            <a-form-item>
                                <a-button type="primary" @click="login" style="width: 100%;">
                                    Log in
                                </a-button>
                            </a-form-item>
                        </a-form>
                    </a-tab-pane>

                    <a-tab-pane :key="LoginType.Sms" :tab="LoginType.Sms">
                        <a-form autocomplete="off"   :model="loginFormData" >

                            <a-form-item name="longinType" hidden>
                                <a-input v-model:value="loginFormData.longinType" autocomplete="off" />
                            </a-form-item>

                            <a-form-item name="mobile">
                                <a-input placeholder="Please enter your mobile." v-model:value="loginFormData.mobile">
                                    <template #prefix>
                                        <MobileOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input>
                            </a-form-item>

                            <a-form-item name="captcha">
                                <a-row :gutter="[8, 8]">
                                    <a-col span="14">
                                        <a-input placeholder="enter captcha." v-model:value="loginFormData.captcha">
                                            <template #prefix>
                                                <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                            </template>
                                        </a-input>
                                    </a-col>
                                    <a-col span="10">
                                        <a-button type="primary" style="width: 100%;"
                                            v-show="tabsStore.tabsStore.smsShow" @click="sendCaptcha(false)">获取短信</a-button>
                                        <a-button style="width: 100%;" v-show="!tabsStore.tabsStore.smsShow" disabled>
                                            {{tabsStore.tabsStore.smsCountDown}}秒后重试
                                        </a-button>
                                    </a-col>
                                </a-row>

                            </a-form-item>

                            <a-form-item>
                                <a-button type="primary" @click="login" style="width: 100%;">
                                    Log in
                                </a-button>
                            </a-form-item>
                        </a-form>


                    </a-tab-pane>

                </a-tabs>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { LoginType, LonginRequestParams } from '@/apis/upms/login/userTypes';
import { UserOutlined, LockOutlined, MobileOutlined } from '@ant-design/icons-vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import loginTabsStore from '@/stores/modules/loginTabs';
import { FormInstance, Rule} from 'ant-design-vue/es/form';
import { accountLogin } from '@/stores/modules/oauth';
import { tenantsStore, userStore } from '@/stores/modules/user';


const tabsStore = loginTabsStore()



const loginFormData = ref<LonginRequestParams>({
    longinType: LoginType.Account,
    uuid: '',
    username: 'admin',
    password: 'admin',
    mobile: '17719540702',
    captcha: '0000'

})

const accountFormRef = ref<FormInstance>();

const validateUsername = async(_rule:Rule,value:string) =>{
    if(value ===''){
        return Promise.reject('Please input the username');
    }
    return Promise.resolve();
}

const validatePassword = async(_rule:Rule,value:string) =>{
    if(value ===''){
        return Promise.reject("Please input the password");
    }
    return Promise.resolve();
}


const accountRules : Record<string,Rule[]> = {
    username: [{ required: true,validator: validateUsername}],
    password: [{ required: true,validator:validatePassword}],
};


/**
 * 登录按钮
 */
const login = () => {
    if (loginFormData.value.longinType === LoginType.Account) {
        
        accountFormRef.value?.validate().then(values =>{
            accountLogin(values as LonginRequestParams).then( _res =>{
                // 此处应该在获取下用户信息
                
                tenantsStore().getUserTenant().then(_res =>{
                    tenantsStore().switchTenant(0)
                    userStore().getUserInfo()    
                })
            })
            
        }).catch(err =>{
            return err;
        })

        return
    }
}
/**
 * 登录Tabs切换
 * @param value 
 */
const selectedTabs = (value: string) => {
    if (value === 'Account') {
        loginFormData.value.longinType = LoginType.Account
    } else {
        loginFormData.value.longinType = LoginType.Sms
    }
}

/**
 * 发送验证码
 * @param isOnMounted 
 */
const sendCaptcha = (isOnMounted:boolean) => {
    // 模拟发送
    if(!isOnMounted){
        tabsStore.decrease
    }
    const timer = setInterval(() => {
        if (tabsStore.tabsStore.smsCountDown >0) {
            tabsStore.decrease
        } else {
            tabsStore.resetCountDown()
            clearInterval(timer)
        }
    }, 1000)
}



onMounted(()=>{
    if(tabsStore.tabsStore.smsCountDown < 30){
        sendCaptcha(true);
    }
})

onBeforeUnmount(()=>{
    tabsStore.resetCountDown
})




</script>

<style scoped lang="scss">
.container {
    position: relative;
    width: 100%;
    min-height: 100vh;
    background-color: #fff;
    overflow: hidden;
}

.container:before {
    content: '';
    position: absolute;
    width: 2000px;
    height: 2000px;
    top: -10%;
    right: 48%;
    border-radius: 50%;
    transform: translateY(-50%);
    background-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%);
    ;
}


.panel-content {
    position: absolute;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);

    .panel-left {
        color: #fff;
        line-height: 3rem;
        display: flex;
        flex-direction: column;
        text-align: center;

        .left-content {
            padding-top: 20vh;

            h3 {
                font-size: 2rem;
            }

            p {
                font-size: 0.95rem;
                font-weight: 600;
            }
        }
    }

    .panel-right {
        margin: 30% 35% 30% 35%;
    }
}



:deep(.panel-right) {

    button {
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%);
        color: white;
        font-weight: bolder;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    button:not([disabled]):hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    button:disabled {
        color: white;
        background-color: #eee;
        border: none;
        cursor: not-allowed;
    }

}
</style>