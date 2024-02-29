
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
                    <Tabs :navs="loginTypes" class="panel-right-tabs">
                        <TabsPane v-for="item in loginTypes" :active="item.active">
                            
                            <div v-if="item.label ==='Account'" class="tabs-container">
                                <input type="text" name="username" placeholder="Please enter your username.">
                                <input type="password" name="username" placeholder="Please enter your password.">
                            </div>
                            <div v-if="item.label ==='SMS'" class="tabs-container">
                                <input type="text" name="username" placeholder="Please enter your username.">
                                <input type="text" name="sms" placeholder="Please enter your sms code.">
                            </div>        
                        </TabsPane>
                        <button>Login</button>
                    </Tabs>
                    
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Tabs from '@/components/tabs/Tabs.vue'
import TabsPane from '@/components/tabs/TabsPane.vue';
import { ref } from 'vue';



const loginTypes = ref<TabsNavType[]>(
    [
        {id:'1',label:'Account',active:true},
        {id:'2',label:'SMS',active:false},
    ]);


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
    .panel-right{
        display: flex;
        flex-direction: column;
        .panel-right-tabs{
            margin: 30% 30% 30% 30%;
            width: 304px;
            height: 400px;

            input{
                // width: 304px;
                height: 40px;
                border: none;
                outline: none;
                background-color: white;
                border-bottom: 2px #acacac solid;
                font-size: 14px;
            }
            input:focus{
                border-bottom: 2px solid;
                border-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%) 1;
            }
            input:-webkit-autofill {
                background: transparent;
                transition: background-color 50000s ease-in-out 0s;
                -webkit-text-fill-color: unset;
            }

            
            .tabs-container {
                text-align: left;
                display: grid;
                grid-template-columns: 1fr;
                row-gap: 10px;
            }

            button {
                margin-top: 10px;
                width: 304px;
                height: 40px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                background-image: linear-gradient(-45deg, #4481eb 0, #04befe 100%);
                color: white;
                font-weight: bolder;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            button:hover{
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }

        }
    }
}
</style>
