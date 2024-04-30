<template>
    <a-table bordered :data-source="dataSource" :columns="columns" :pagination="pagination">

    </a-table>
</template>


<script setup lang="ts">
import { selectTenant } from '@/apis/upms/tenant/index';
import { PageTenantParams, TenantList } from '@/apis/upms/tenant/type';
import { computed, ref } from 'vue';


const columns = [
    {
        title: 'Logo',
        dataIndex: 'logo',
        key: 'logo',
    },
    {
        title: '租户名',
        dataIndex: 'tenantName',
        key: 'tenantName',
    },
    {
        title: '社会信用代码',
        dataIndex: 'creditCode',
        key: 'creditCode',
    },
    {
        title: '社会信用代码',
        dataIndex: 'creditCode',
        key: 'creditCode',
    },
    {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
    },
    {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
    },
    {
        title: '管理员',
        dataIndex: 'adminUser',
        key: 'adminUser',
    },
    {
        title: '锁定状态',
        dataIndex: 'locked',
        key: 'locked',
    },
    {
        title: '操作',
        dataIndex: 'operation',
    }
]


const dataSource = ref<TenantList[]>([{
    tenantAdminUser: 0,
    adminUser: '',
    menus: '',
    id: '',
    parentId: '',
    createTime: '',
    logo: '',
    tenantName: '',
    creditCode: '',
    tenantType: '',
    locked: '',
    description: ''
}])

const pagination = computed(() => ({
    total: 0,
    current: 1,
    pageSize: 10,
}));




const parasm = ref<PageTenantParams>({
    keyword: '',
    startTime: '',
    endTime: ''
})

const queryTenant = async () => {
    parasm.value.current = pagination.value.current
    parasm.value.size = pagination.value.pageSize;


    await selectTenant(parasm.value).then(res => {
        res.data.records.forEach(data => {
            console.log(data,'data')
            // dataSource.value.push({
            //     tenantAdminUser: data.tenantAdminUser,
            //     adminUser: res.data.adminUser,
            //     menus: res.data.menus,
            //     id: res.data.id,
            //     parentId: res.data.parentId,
            //     createTime: res.data.createTime,
            //     logo: res.data.logo,
            //     tenantName: res.data.tenantName,
            //     creditCode: res.data.creditCode,
            //     tenantType: res.data.tenantType,
            //     locked: res.data.locked,
            //     description: res.data.description
            // })
        })

    })
}

queryTenant();

</script>