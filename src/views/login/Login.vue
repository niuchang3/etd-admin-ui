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
                <a-tabs v-model:activeKey="data.tabsData.activeKey" @change="selectedTabs">
                    <a-tab-pane key="Account" tab="Account">

                        <a-form autocomplete="off" ref="accountFormRef" :model="data.accountFormData">

                            <a-form-item name="username" :rules="data.accountFormRules.username">
                                <a-input placeholder="Please enter your account."
                                    v-model:value="data.accountFormData.username">
                                    <template #prefix>
                                        <UserOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input>
                            </a-form-item>

                            <a-form-item name="password" 
                                    :rules="data.accountFormRules.password">
                                <a-input-password placeholder="Please enter your password."
                                    v-model:value="data.accountFormData.password">
                                    <template #prefix>
                                        <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input-password>
                            </a-form-item>
                            <a-form-item>
                                <a-button type="primary" @click="loginByAccount" style="width: 100%;">
                                    Log in
                                </a-button>
                            </a-form-item>
                        </a-form>
                    </a-tab-pane>

                    <a-tab-pane key="SMS" tab="SMS">
                        <a-form autocomplete="off" ref="smsFormRef" :model="data.smsLoginFormData">
                            <a-form-item name="mobile" :rules="data.smsLoginFormRules.mobile">
                                <a-input placeholder="Please enter your mobile." 
                                    v-model:value="data.smsLoginFormData.mobile">
                                    <template #prefix>
                                        <MobileOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input>
                            </a-form-item>

                            <a-form-item name="captcha" :rules="data.smsLoginFormRules.captcha">
                                <a-row :gutter="[8, 8]">
                                    <a-col span="14">
                                        <a-input placeholder="enter captcha." 
                                            v-model:value="data.smsLoginFormData.captcha">
                                            <template #prefix>
                                                <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                            </template>
                                        </a-input>
                                    </a-col>
                                    <a-col span="10">
                                        <a-button type="primary" style="width: 100%;" @click="sendCaptcha"
                                            v-show="data.tabsData.smsCodeShow">获取短信</a-button>
                                        
                                            <a-button style="width: 100%;" 
                                                v-show="!data.tabsData.smsCodeShow" disabled>
                                            {{data.tabsData.smsCountDown }}秒后重试
                                        </a-button>
                                    </a-col>
                                </a-row>

                            </a-form-item>

                            <a-form-item>
                                <a-button type="primary" @click="" style="width: 100%;">
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
import { UserOutlined, LockOutlined, MobileOutlined } from '@ant-design/icons-vue';
import { ref } from 'vue';
import type { FormInstance } from 'ant-design-vue';
import { Session } from '@/utils/Storage';
import { accountLogin, getAccessToken } from '@/stores/oauth2/Oauth';
import { LoginType } from '@/apis/types';

const smsCountDown = 30;

const data = ref({
    tabsData: {
        activeKey: 'Account',// Mobile
        smsCodeShow: true,
        smsCountDown: smsCountDown
    },
    accountFormData: {
        loginType:LoginType.Account,
        uuid: '',
        captcha: '',
        username: '',
        password: '',
    },
    accountFormRules: {
        username: [
            {
                required: true,
                message: 'Please enter your account.',
            }
        ],
        password: [
            {
                required: true,
                message: 'Please enter your password.',
            }
        ],
    },
    smsLoginFormData: {
        loginType:LoginType.Sms,
        mobile: '',
        captcha: '',
    },
    smsLoginFormRules: {
        mobile: [
            {
                required: true,
                message: 'Please enter your mobile.',
            }
        ],
        captcha: [
            {
                required: true,
                message: 'Please enter your captcha.',
            },
        ],
    },


});


const selectedTabs = (value: string) => {
    data.value.tabsData.activeKey = value;
    Session.set('tabsData', data.value.tabsData);
}



if(Session.get('tabsData') ===null){
    Session.set('tabsData', data.value.tabsData);
}else{
    data.value.tabsData = Session.get('tabsData');
}

const sendCaptcha = () => {
    // 模拟发送
    data.value.tabsData.smsCodeShow = false;
    const timer = setInterval(() => {
        if (data.value.tabsData.smsCountDown > 0) {
            data.value.tabsData.smsCountDown = data.value.tabsData.smsCountDown - 1;
            Session.set('tabsData', data.value.tabsData);
        } else {
            data.value.tabsData.smsCodeShow = true
            data.value.tabsData.smsCountDown = smsCountDown
            Session.set('tabsData', data.value.tabsData);
            clearInterval(timer)
        }
    }, 1000)
}

if(data.value.tabsData.smsCountDown < smsCountDown){
    sendCaptcha();
}



const accountFormRef = ref<FormInstance>();

const loginByAccount = async () => {
    try {
        await accountFormRef.value?.validateFields();
        accountLogin(data.value.accountFormData)
        if(getAccessToken() !==null){
            console.log(getAccessToken())
        }

    } catch (error) {
        
    }

}




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
