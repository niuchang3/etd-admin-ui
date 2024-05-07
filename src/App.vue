<template>
    <a-config-provider :locale="locale">
        <router-view></router-view>
    </a-config-provider>
</template>

<script>
 import zhCN from 'ant-design-vue/es/locale/zh_CN';
  import dayjs from 'dayjs';
  import 'dayjs/locale/zh-cn';

  export default {
    data() {
      return {
        locale: zhCN,
      };
    },
  };
</script>


<style scoped>

#app {
    width: 100%;
    height: 100%;
    /* font-family: '微软雅黑', sans-serif; */
    font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;

    font-size: 14px;
    
}
</style>