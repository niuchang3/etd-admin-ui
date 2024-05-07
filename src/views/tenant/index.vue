<template>
    <a-row :gutter="[16, 8]">
        <a-col :span="24">

            <a-space>
                <a-input v-model:value="parasm.keyword" style="width: 300px;" placeholder="关键词：租户名,租户描述,统一社会编码"></a-input>
                <a-range-picker v-model:value="dataTime" format="YYYY-MM-DD" :placeholder="['开始时间', '截止时间']" />
                <a-button type="primary" @click="queryTenant(pagination)" :icon="h(SearchOutlined)">查询</a-button>
                <a-button type="primary" @click="reset">重置</a-button>
            </a-space>
        </a-col>
        <a-col :span="24">
            <a-button type="primary" @click="onOpen('add',undefined)">新增</a-button>
        </a-col>
        <a-col :span="24">
            <a-table bordered :data-source="dataSource" :columns="columns" :pagination="pagination">
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'logo'">
                        <a-image :width="50" :height="50" :src="record.logo" @error="defaultImgSrc" />
                    </template>
                    <template v-if="column.key === 'locked'">
                        <a-switch v-model:checked="record.locked" @change="switchLocked(record, $event)" />
                    </template>
                    <template v-if="column.key === 'operation'">
                        <span v-show="!isSystemTenant(record.tenantType)">

                            <a @click="onOpen('update', record)">修改</a>
                            <a-divider type="vertical" />
                            <a>删除</a>
                            <a-divider type="vertical" />
                            <a>分配菜单</a>
                        </span>
                    </template>
                </template>
            </a-table>
        </a-col>
    </a-row>

    <a-drawer :title="drawerTitle" :width="720" :open="open" :maskClosable="true"
        :body-style="{ paddingBottom: '80px' }" :footer-style="{ textAlign: 'right' }" @close="onClose">
        <component :is="editTenant" :tenant="editTenantData"  @callback="refresh"></component>
        <!-- <EditTenant ></EditTenant> -->
    </a-drawer>

</template>


<script setup lang="ts">

import { Dayjs } from 'dayjs';
import { selectTenant, switchLockedStatus } from '@/apis/upms/tenant/index';
import { PageTenantParams, TenantList } from '@/apis/upms/tenant/type';
import { ref, h, shallowRef } from 'vue';
import { SearchOutlined } from '@ant-design/icons-vue';
import EditTenant from './EditTenant.vue';

const editTenant = shallowRef(EditTenant)


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
        key: 'operation',
        ellipsis: true,
        width: 30
    }
]


const dataSource = ref<TenantList[]>([])

const dataTime = ref<Dayjs[]>([])

const pagination = ref({
    total: 0,
    current: 1,
    pageSize: 10,
    showLessItems: true,
    showTotal: (total: any) => `共 ${total} 条数据`,

})


const parasm = ref<PageTenantParams>({})

const queryTenant = async (val: { current: number; pageSize: number; }) => {


    pagination.value.pageSize = val.pageSize;
    pagination.value.current = val.current;


    parasm.value.current = val.current;
    parasm.value.size = val.pageSize;

    if (dataTime.value && dataTime.value.length > 0) {
        parasm.value.times = [dataTime.value[0].format('YYYY-MM-DD 00:00:00'), dataTime.value[1].format('YYYY-MM-DD 23:59:59')]
    } else {
        parasm.value.times = ['', ''];
    }

    await selectTenant(parasm.value).then(res => {

        pagination.value.total = res.data.total
        dataSource.value = [];



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

queryTenant({ current: 1, pageSize: 10 });


const defaultImgSrc = (event: { target: { src: string; }; }) => {
    event.target.src = 'https://img2.baidu.com/it/u=3862863135,3435290740&fm=253&fmt=auto'
    return
}

const switchLocked = (record?: any, event?: any) => {

    switchLockedStatus({ id: record.id, status: event }).then(_res => {
        refresh();
    })
}

const reset = () => {
    parasm.value = {};
    dataTime.value = []
}

const isSystemTenant = (tenantType: string) => {
    return tenantType === 'System'
}


const open = ref<boolean>(false);
const drawerTitle = ref<string>()
const editTenantData = ref({})

const onOpen = (type: string, _data: any) => {
    if (type === 'add') {
        editTenantData.value = {};
        drawerTitle.value = "新增租户"
    } else {
        editTenantData.value = _data;
        drawerTitle.value = "修改租户"
    }
    open.value = true;


}

const onClose = () => {
    open.value = false;
}

const refresh =() =>{
    console.log("疑似回调?")
    open.value = false;
    queryTenant({ current: pagination.value.current, pageSize: pagination.value.pageSize })
}

// const comp = computed({
//     get(tenantType:string){
//         console.log(tenantType,'调用计算属性')
//         return tenantType ==='System'
//     }
// })



</script>