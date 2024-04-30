<template>

    <a-table bordered :data-source="dataSource" :columns="columns" :pagination="pagination" @change="queryTenant">
        <template #bodyCell="{ column ,record}">
            <template v-if="column.key === 'logo'">
                <a-image :width="50" :height="50"
                    :src="record.logo"
                    @error="defaultImgSrc" />
            </template>
            <template v-if="column.key === 'locked'">
                <a-switch v-model:checked="record.data" />
            </template>
            <!--  <a-switch v-model:checked="checked" /> -->
            
            <template v-if="column.key === 'operation'">
                
            </template>
        </template>

    </a-table>
</template>


<script setup lang="ts">
import { selectTenant } from '@/apis/upms/tenant/index';
import { PageTenantParams, TenantList } from '@/apis/upms/tenant/type';
import { ref } from 'vue';


const columns = [
    {
        title: 'Logo',
        dataIndex: 'logo',
        key: 'logo',
        ellipsis: true,
        width: 14
    },
    {
        title: '租户名',
        dataIndex: 'tenantName',
        key: 'tenantName',
        ellipsis: true,
        width: 30
    },
    {
        title: '社会信用代码',
        dataIndex: 'creditCode',
        key: 'creditCode',
        ellipsis: true,
        width: 30
    },
    {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        width: 30
    },
    {
        title: '管理员',
        dataIndex: 'adminUser',
        key: 'adminUser',
        ellipsis: true,
        width: 30
    },
    {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        ellipsis: true,
        width: 30
    },

    {
        title: '锁定状态',
        dataIndex: 'locked',
        key: 'locked',
        ellipsis: true,
        width: 30
    },
    {
        title: '操作',
        dataIndex: 'operation',
        ellipsis: true,
        width: 30
    }
]


const dataSource = ref<TenantList[]>([])

const pagination = ref({
    total: 0,
    current: 1,
    pageSize: 10,
    showLessItems: true,
    showTotal: (total: any) => `共 ${total} 条数据`,

})



const parasm = ref<PageTenantParams>({
    keyword: '',
    startTime: '',
    endTime: ''
})

const queryTenant = async (val: { current: number; pageSize: number; }) => {


    pagination.value.pageSize = val.pageSize;
    pagination.value.current = val.current;


    parasm.value.current = val.current;
    parasm.value.size = val.pageSize;
    await selectTenant(parasm.value).then(res => {

        pagination.value.total = res.data.total
        res.data.records.forEach(data => {
            dataSource.value.push({
                tenantAdminUser: data.tenantAdminUser,
                adminUser: data.adminUser,
                menus: data.menus,
                id: data.id,
                parentId: data.parentId,
                createTime: data.createTime,
                logo: data.logo,
                tenantName: data.tenantName,
                creditCode: data.creditCode,
                tenantType: data.tenantType,
                locked: data.locked,
                description: data.description
            })
        })

    })
}

queryTenant({ current: 1, pageSize: 1 });


const defaultImgSrc = (event: { target: { src: string; }; })=>{

    event.target.src= 'https://img2.baidu.com/it/u=3862863135,3435290740&fm=253&fmt=auto'
    
}
</script>