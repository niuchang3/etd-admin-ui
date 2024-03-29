<template>
<a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo"></div>
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline" @click="toRouter">
            <template v-for="item in menuRoutes">
                <a-menu-item :key="item.path"  v-if="!item.children">          
                    <span>{{ item.name }}</span>
                </a-menu-item>
                <a-sub-menu :key="item.path" v-if="item.children" >
                    <template #title>
                        <span>
                        <span>{{item.name}}</span>
                        </span>
                    </template>
                    <a-menu-item :key="subItem.path" v-for="subItem in item.children">
                        <span>{{ subItem.name }}</span>
                    </a-menu-item>
                </a-sub-menu>
            </template>
      </a-menu>
    </a-layout-sider>


    <a-layout>
        <!-- 页头区域 -->
      <a-layout-header style="background: #fff; padding: 0" >
        <div class="personal"> 头部区域</div>
        </a-layout-header>
      <!-- 内容区 -->
      
      <a-layout-content style="margin: 0 16px">
  
        <a-breadcrumb style="margin: 16px 0">
          <a-breadcrumb-item v-for="item in breadcrum.data">{{ item }}</a-breadcrumb-item>
          <!-- <a-breadcrumb-item>Bill</a-breadcrumb-item> -->
        </a-breadcrumb>

        
        <div :style="{ padding: '24px', background: '#fff', minHeight: '740px' }">
            <RouterView>

            </RouterView>
        </div>
      </a-layout-content>

      <!-- 页脚区域 -->
      <a-layout-footer style="text-align: center">
        Ant Design ©2018 Created by Ant UED
      </a-layout-footer>
    </a-layout>
  </a-layout>

</template>

<script setup lang="ts">

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {menuRoutes} from '@/router/router'
import breadcrumbStore from '@/stores/modules/breadcrumb';


const breadcrum = breadcrumbStore();



const collapsed = ref<boolean>(false);

const selectedKeys = ref<string[]>([menuRoutes[0].path]);
const router = useRouter();

router.push({path:menuRoutes[0].path})

const toRouter = (_value: any) =>{

    router.push({path:_value.key})
}



</script>

<style scoped lang="scss">

#components-layout-demo-side .logo {
  height: 32px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.3);
}

.site-layout .site-layout-background {
  background: #fff;
}
[data-theme='dark'] .site-layout .site-layout-background {
  background: #141414;
}

.personal{
    float: right;
    margin-right: 20px;
}

</style>