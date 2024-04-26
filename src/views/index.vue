<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo"></div>
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline" @click="toRouter">
        <template v-for="item in userMenu.menus[0].children">

          <a-menu-item :key="item.menuPath" v-if="item.children && item.children.length === 0">
            <component :is="item.menuIcon"></component>
            <span>{{ item.menuName }}</span>
          </a-menu-item>


          <a-sub-menu :key="item.menuPath" v-if="item.children && item.children.length !== 0">
            <template #title>
              <component :is="item.icon"></component>
              <span>{{ item.menuName }}</span>
            </template>
            <a-menu-item :key="subItem.menuPath" v-for="subItem in item.children">
              <span>{{ subItem.menuName }}</span>
            </a-menu-item>
          </a-sub-menu>
        </template>
      </a-menu>
    </a-layout-sider>


    <a-layout>
      <!-- 页头区域 -->
      <a-layout-header style="background: #fff; padding: 0">
        <a-row>
          <a-col :span="8">
          </a-col>
          <a-col :span="8">
            <div @click="selectTenant" style="cursor:pointer">
              <h3 style="font-size: 22px;text-align: center;">{{ userTenants.userTenant.currentTenant.tenantName }}</h3>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="personal">
              <a-popover placement="bottomRight" :overlayStyle="{ width: '100px', cursor: 'pointer' }">
                <template #content>
                  <p>修改密码</p>
                  <p @click="logout">退出登录</p>
                </template>
                {{ user.userInfo.nickName }}
                <a-avatar size="large"
                  :style="{ backgroundColor: 'fde3cf', verticalAlign: 'middle', cursor: 'pointer' }" alt="头像"
                  :src="user.userInfo.avatar ? user.userInfo.avatar : 'https://q4.itc.cn/q_70/images03/20240405/39ec09deda3a41d79e03897b0fdf68a0.jpeg'"></a-avatar>
              </a-popover>
            </div>
          </a-col>
        </a-row>


      </a-layout-header>
      <!-- 内容区 -->

      <a-layout-content style="margin: 0 16px">

        <a-breadcrumb style="margin: 16px 0">
          <a-breadcrumb-item v-for="item in breadcrum.data">{{ item }}</a-breadcrumb-item>
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


  <a-modal ref="modalRef" v-model:open="open" :closable="false"
    :bodyStyle="{ minHeight: '400px', maxHeight: '700px', paddingTop: '20px', overflowY: 'auto' }" :width="680" :footer="null">

    <a-row :gutter="[0, 20]">
      <a-col :span="8" v-for="(item, index) in userTenants.userTenant.tenants">
        <a-card hoverable style="width: 180px;" @click="switchTenant(index)">
          <template #cover>
            <img alt="example" :src="item.logo" style="width: 180px;height: 144px;"
              onerror="javascript:this.src='https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png'" />
          </template>
          <a-card-meta :title="item.tenantName" style="font-size: 16px;">
            <template #description>{{ item.description }}</template>
          </a-card-meta>
        </a-card>
      </a-col>

    </a-row>
  </a-modal>

</template>

<script setup lang="ts">

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import breadcrumbStore from '@/stores/modules/breadcrumb';
import { tenantsStore, userStore, menusStore, clearStore, currentMenu} from '@/stores/modules/user';
import { cacheClear } from '@/utils/storage';


const user = userStore();

const userMenu = menusStore();
const userTenants = tenantsStore();
const breadcrum = breadcrumbStore();
const collapsed = ref<boolean>(false);
const open = ref<boolean>(false);

const selectedKeys = ref<string[]>([currentMenu().current]);
const router = useRouter();


const toRouter = (value: any) => {
  currentMenu().setCurrentMenu(value.key);
  router.push({ path: value.key })
}


const logout = () => {
  clearStore();
  cacheClear();
  router.push({ path: '/login' })
  
}

const selectTenant = () => {
  open.value = true;

}

const switchTenant = (index: number) => {
  open.value = false;
  userTenants.switchTenant(index)
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

.personal {
  float: right;
  margin-right: 40px;

  .ant-popover {
    width: 100px;
  }
}
</style>