
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
                <a-tabs v-model:activeKey="loginTabsData.data.activeKey" @change="selectedTabs">
                    <a-tab-pane key="Account" tab="Account">
                        <a-form autocomplete="off" ref="accountFormRef" :model="accountLoginData" :rules="accountRulesRef">
                            <a-form-item name="username" v-bind="accountForm.validateInfos.username">
                                <a-input placeholder="Please enter your account." v-model:value="accountLoginData.username">
                                    <template #prefix>
                                        <UserOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input>
                            </a-form-item>

                            <a-form-item name="password" v-bind="accountForm.validateInfos.password">
                                <a-input-password placeholder="Please enter your password."
                                    v-model:value="accountLoginData.password">
                                    <template #prefix>
                                        <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input-password>
                            </a-form-item>
                            <a-form-item>
                                <a-button type="primary" @click="accountLogin" style="width: 100%;">
                                    Log in
                                </a-button>
                            </a-form-item>
                        </a-form>
                    </a-tab-pane>

                    <a-tab-pane key="SMS" tab="SMS">
                        <a-form autocomplete="off" ref="smsFormRef" :model="smsLoginData" :rules="smsRulesRef">
                            <a-form-item name="mobile">
                                <a-input placeholder="Please enter your mobile." v-model:value="smsLoginData.mobile">
                                    <template #prefix>
                                        <MobileOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                    </template>
                                </a-input>
                            </a-form-item>

                            <a-form-item name="captcha">
                                <a-row :gutter="[8, 8]">
                                    <a-col span="14">
                                        <a-input placeholder="enter captcha." v-model:value="smsLoginData.captcha">
                                            <template #prefix>
                                                <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                                            </template>
                                        </a-input>
                                    </a-col>
                                    <a-col span="10">
                                        <a-button type="primary" style="width: 100%;" @click="sendCaptcha"
                                            v-show="loginTabsData.data.smsCodeShow">获取短信</a-button>
                                        <a-button style="width: 100%;" v-show="!loginTabsData.data.smsCodeShow" disabled>{{
                                            loginTabsData.data.smsCountdown }}秒后重试</a-button>
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
import { reactive, ref, toRaw } from 'vue';
import { loginTabsStore } from '@/stores/index'
import { Form } from 'ant-design-vue';


console.log(import.meta.env.VITE_BASIC_URL)


const loginTabsData = loginTabsStore()
const smsCountDown = 30;


if (loginTabsData.getActiveKey() === '') {
    loginTabsData.setActiveKey('Account')
    loginTabsData.setSmsCodeShow(true);
    loginTabsData.setSmsCountdown(smsCountDown);
}


const selectedTabs = (value: string) => {
    loginTabsData.setActiveKey(value);
}



const sendCaptcha = () => {
    // 模拟发送
    loginTabsData.setSmsCodeShow(false);
    const timer = setInterval(() => {
        if (loginTabsData.getSmsCountdown() > 0) {
            loginTabsData.setSmsCountdown(loginTabsData.getSmsCountdown() - 1)
        } else {
            loginTabsData.setSmsCountdown(smsCountDown);
            loginTabsData.setSmsCodeShow(true);
            clearInterval(timer)
        }
    }, 1000)
}

if (loginTabsData.getActiveKey() !== 'Account' && loginTabsData.getSmsCountdown() < smsCountDown) {
    sendCaptcha();
}


const accountLoginData = ref({
    loginType: 'Account',
    uuid: '',
    captcha: '',
    username: '',
    password: '',

});


const accountRulesRef = reactive({
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
        },
        {
            message: '密码错误'
        }
    ],
});


const accountForm = Form.useForm(accountLoginData, accountRulesRef, {
    onValidate: (...args) => console.log(...args),
});



const accountLogin = () => {

    accountForm.validate().then( (res) =>{
        console.log(res);
    })

    

    // accountForm.validateField('username')

    // message.error("密码错误")
}




const smsLoginData = reactive({
    loginType: 'Mobile',
    mobile: '',
    captcha: '',

});

const smsRulesRef = reactive({
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
});




// const smsCodeCount = smsCountdown();






// const smsLogin = () => {
//     smsFormRef.value?.validateFields();
// }

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
