<template>
    <a-form :model="data">
        <a-row :gutter="16">
            <a-col :span="12">
                <a-form-item label="租户名称" name="租户名称">
                    <a-input v-model:value="data.tenantName" placeholder="请输入租户名称" />
                    <!-- v-model:value="" -->
                </a-form-item>
            </a-col>
            <a-col :span="12">
                <a-form-item label="社会信用代码" name="社会信用代码">
                    <a-input v-model:value="data.creditCode" placeholder="请输入统一社会代码" />
                </a-form-item>
            </a-col>
        </a-row>

        <a-row :gutter="16">
            <a-col :span="24">
                <a-form-item label="管理员" name="管理员">
                    <a-input v-model:value="data.adminUserName" placeholder="" />
                    <!-- v-model:value="" -->
                </a-form-item>
            </a-col>
        </a-row>

        <a-row :gutter="16">
            <a-col :span="24">
                <a-form-item label="租户描述" name="租户描述">
                    <a-textarea v-model:value="data.description" placeholder="请输入租户名称" :rows="8" :maxlength="500"
                        :showCount="true" />
                    <!-- v-model:value="" -->
                </a-form-item>
            </a-col>
        </a-row>
        <a-row :gutter="16">
            <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
                <a-button type="primary" html-type="submit" @click="save">保存</a-button>
            </a-form-item>
        </a-row>


    </a-form>
</template>

<script setup lang="ts">
import { EditTenant } from '@/apis/upms/tenant/type';

import { ref, watch } from 'vue';

const props = defineProps<{
    tenant?: EditTenant
}>()


const { tenant } = props;


const data = ref<EditTenant>(tenant ? tenant : {});

watch(() => props.tenant, (newData) => {
    data.value = newData ? newData : {};
})

const emit = defineEmits(['callback'])


const save = () =>{
    console.log("触发保存")
    emit('callback')
}

// const form = reactive({
//   name: '',
//   url: '',
//   owner: '',
//   type: '',
//   approver: '',
//   dateTime: null,
//   description: '',
// });

</script>

<style scoped lang="scss"></style>