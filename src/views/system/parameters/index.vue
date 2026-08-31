<template>
  <!-- 系统参数使用标准查询表格布局，写操作根据当前菜单访问级别显示。 -->
  <section class="management-page">
    <div class="du-panel table-panel">
      <header class="page-toolbar">
        <div class="filters">
          <a-input
            v-model:value="query.keyword"
            allow-clear
            class="search-input"
            placeholder="搜索参数键或参数名称"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="query.enabled" :options="statusOptions" allow-clear class="status-select" placeholder="启用状态" />
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetSearch"><ReloadOutlined />重置</a-button>
        </div>
        <a-button v-if="canWrite" type="primary" @click="openCreate"><PlusOutlined />新增参数</a-button>
      </header>

      <!-- 列表状态、空状态和分页均由 Ant Design Vue 表格统一承载。 -->
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <code v-if="column.key === 'parameterKey'" class="code-value">{{ record.parameterKey }}</code>
          <a-tag v-else-if="column.key === 'valueType'" color="blue">{{ getSystemDictLabel(valueTypeDict, record.valueType) }}</a-tag>
          <span v-else-if="column.key === 'parameterValue'" class="value-preview" :title="record.parameterValue || ''">
            {{ record.parameterValue ?? '—' }}
          </span>
          <a-tag v-else-if="column.key === 'builtIn'" :color="record.builtIn ? 'gold' : 'default'">
            {{ getSystemDictLabel(builtInDict, record.builtIn) }}
          </a-tag>
          <a-switch
            v-else-if="column.key === 'enabled'"
            :checked="record.enabled"
            :loading="statusChangingId === record.id"
            :disabled="!canWrite || record.builtIn"
            :checked-children="getSystemDictLabel(statusDict, '1')"
            :un-checked-children="getSystemDictLabel(statusDict, '0')"
            @change="changeEnabled(record, Boolean($event))"
          />
          <div v-else-if="column.key === 'actions'" class="row-actions">
            <span v-if="canWrite && record.builtIn" class="readonly-label">内置数据只读</span>
            <a-button v-if="canWrite && !record.builtIn" type="link" size="small" @click="openEdit(record)"><EditOutlined />编辑</a-button>
            <a-popconfirm
              v-if="canWrite && !record.builtIn"
              title="确认删除该系统参数吗？"
              ok-text="删除"
              cancel-text="取消"
              @confirm="removeConfig(record)"
            >
              <a-button type="link" size="small" danger><DeleteOutlined />删除</a-button>
            </a-popconfirm>
          </div>
        </template>
        <template #emptyText><a-empty description="暂无系统参数" /></template>
      </a-table>
    </div>

    <!-- 新增和编辑共用完整表单；内置参数不提供编辑入口。 -->
    <a-modal
      v-model:open="editorOpen"
      :title="formState.id ? '编辑系统参数' : '新增系统参数'"
      :confirm-loading="saving"
      width="620px"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveConfig"
    >
      <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical" class="editor-form">
        <div class="form-grid">
          <a-form-item label="参数键" name="parameterKey">
            <a-input
              v-model:value="formState.parameterKey"
              :disabled="formState.builtIn"
              :maxlength="100"
              show-count
              placeholder="例如：system.upload.limit"
            />
          </a-form-item>
          <a-form-item label="参数名称" name="parameterName">
            <a-input v-model:value="formState.parameterName" :maxlength="100" show-count placeholder="请输入参数名称" />
          </a-form-item>
          <a-form-item label="值类型" name="valueType" class="full-row">
            <a-select v-model:value="formState.valueType" :options="valueTypeOptions" />
          </a-form-item>
          <a-form-item label="参数值" name="parameterValue" class="full-row">
            <a-textarea
              v-if="formState.valueType === 'json'"
              v-model:value="formState.parameterValue"
              :auto-size="{ minRows: 5, maxRows: 12 }"
              placeholder="请输入合法的 JSON"
            />
            <a-select v-else-if="formState.valueType === 'boolean'" v-model:value="formState.parameterValue" allow-clear placeholder="请选择">
              <a-select-option value="true">true</a-select-option>
              <a-select-option value="false">false</a-select-option>
            </a-select>
            <a-input v-else v-model:value="formState.parameterValue" :placeholder="formState.valueType === 'number' ? '请输入数字' : '请输入参数值'" />
          </a-form-item>
          <a-form-item label="备注" name="remark" class="full-row">
            <a-textarea v-model:value="formState.remark" :maxlength="500" show-count :rows="3" placeholder="请输入备注" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message, type FormInstance, type FormProps, type TableColumnsType } from 'ant-design-vue'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import {
  changeSystemConfigEnabled,
  createSystemConfig,
  deleteSystemConfig,
  getSystemConfig,
  getSystemConfigPage,
  updateSystemConfig,
} from '@/apis/upms/config'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { SystemConfig, SystemConfigSaveDTO, SystemConfigValueType } from '@/apis/upms/config/type'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { menusStore } from '@/stores/modules/user'
import { getSystemDictLabel, SYSTEM_DICT_TYPE, toSystemDictOptions } from '@/utils/SystemDict'

interface ConfigFormState extends SystemConfigSaveDTO {
  id?: string
  builtIn: boolean
}

// 页面写权限完全取自当前路由对应菜单的 accessLevel，避免只在导航层控制权限。
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const loading = ref(false)
const saving = ref(false)
const editorOpen = ref(false)
const statusChangingId = ref('')
const records = ref<SystemConfig[]>([])
const statusDict = ref<SystemDictData[]>([])
const builtInDict = ref<SystemDictData[]>([])
const valueTypeDict = ref<SystemDictData[]>([])
const total = ref(0)
const formRef = ref<FormInstance>()
// enabled 为 undefined 时不会形成有效筛选条件，表示查询全部状态。
const query = reactive<{ current: number, size: number, keyword: string, enabled?: boolean }>({
  current: 1,
  size: 10,
  keyword: '',
  enabled: undefined,
})

const createEmptyForm = (): ConfigFormState => ({
  parameterKey: '',
  parameterName: '',
  parameterValue: null,
  valueType: 'string',
  remark: null,
  builtIn: false,
})
const formState = reactive<ConfigFormState>(createEmptyForm())

const statusOptions = computed(() => toSystemDictOptions(statusDict.value, (value) => value === '1'))
const valueTypeOptions = computed(() => toSystemDictOptions(valueTypeDict.value, (value) => value as SystemConfigValueType))

const loadDictionaries = async () => {
  const [statusResponse, builtInResponse, valueTypeResponse] = await Promise.all([
    getEnabledDictData(SYSTEM_DICT_TYPE.commonStatus),
    getEnabledDictData(SYSTEM_DICT_TYPE.commonBuiltIn),
    getEnabledDictData(SYSTEM_DICT_TYPE.configValueType),
  ])
  statusDict.value = statusResponse.data || []
  builtInDict.value = builtInResponse.data || []
  valueTypeDict.value = valueTypeResponse.data || []
}

const columns: TableColumnsType<SystemConfig> = [
  { title: '参数键', dataIndex: 'parameterKey', key: 'parameterKey', width: 210 },
  { title: '参数名称', dataIndex: 'parameterName', key: 'parameterName', width: 160 },
  { title: '参数值', dataIndex: 'parameterValue', key: 'parameterValue' },
  { title: '类型', dataIndex: 'valueType', key: 'valueType', width: 90 },
  { title: '来源', dataIndex: 'builtIn', key: 'builtIn', width: 80 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 85 },
  { title: '操作', key: 'actions', width: 140, align: 'right' },
]

const pagination = computed(() => ({
  current: query.current,
  pageSize: query.size,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

// JSON 和数字在提交前先做格式校验，字段长度与后端 DTO 约束保持一致。
const rules: FormProps['rules'] = {
  parameterKey: [
    { required: true, whitespace: true, message: '请输入参数键', trigger: 'blur' },
    { max: 100, message: '参数键不能超过 100 个字符', trigger: 'blur' },
  ],
  parameterName: [
    { required: true, whitespace: true, message: '请输入参数名称', trigger: 'blur' },
    { max: 100, message: '参数名称不能超过 100 个字符', trigger: 'blur' },
  ],
  valueType: [
    { required: true, message: '请选择值类型', trigger: 'change' },
    { max: 50, message: '值类型不能超过 50 个字符', trigger: 'change' },
  ],
  parameterValue: [{
    validator: async (_rule, value: string | null) => {
      if (value == null || value === '') return
      if (formState.valueType === 'json') {
        try { JSON.parse(value) } catch { throw new Error('请输入合法的 JSON 格式') }
      }
      if (formState.valueType === 'number' && !Number.isFinite(Number(value))) {
        throw new Error('请输入合法的数字')
      }
    },
    trigger: 'blur',
  }],
  remark: [{ max: 500, message: '备注不能超过 500 个字符', trigger: 'blur' }],
}

/** 按当前查询条件加载一页系统参数。 */
const loadConfigs = async () => {
  loading.value = true
  try {
    const response = await getSystemConfigPage({
      current: query.current,
      size: query.size,
      keyword: query.keyword.trim(),
      enabled: query.enabled,
    })
    records.value = response.data?.records || []
    total.value = response.data?.total || 0
  } finally {
    loading.value = false
  }
}

// 查询和重置都回到第一页，避免旧页码导致结果为空。
const handleSearch = () => {
  query.current = 1
  void loadConfigs()
}

const resetSearch = () => {
  query.current = 1
  query.size = 10
  query.keyword = ''
  query.enabled = undefined
  void loadConfigs()
}

const handleTableChange = (page: { current?: number, pageSize?: number }) => {
  query.current = page.current || 1
  query.size = page.pageSize || 10
  void loadConfigs()
}

const resetForm = () => Object.assign(formState, createEmptyForm())

/** 打开空白新增表单。 */
const openCreate = () => {
  resetForm()
  editorOpen.value = true
}

/** 编辑前重新查询详情，确保提交的是后端最新的完整表单。 */
const openEdit = async (record: SystemConfig) => {
  // 内置参数由系统初始化维护，事件层再次拦截，避免仅依赖按钮显隐。
  if (record.builtIn) return
  const response = await getSystemConfig(record.id)
  if (!response.data) {
    message.warning('该系统参数已不存在，请刷新列表')
    return
  }
  Object.assign(formState, {
    id: response.data.id,
    parameterKey: response.data.parameterKey,
    parameterName: response.data.parameterName,
    parameterValue: response.data.parameterValue,
    valueType: response.data.valueType,
    remark: response.data.remark,
    builtIn: response.data.builtIn,
  })
  editorOpen.value = true
}

/** 校验并新增或全量修改系统参数。 */
const saveConfig = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload: SystemConfigSaveDTO = {
      parameterKey: formState.parameterKey.trim(),
      parameterName: formState.parameterName.trim(),
      parameterValue: formState.parameterValue === '' ? null : formState.parameterValue,
      valueType: formState.valueType,
      remark: formState.remark?.trim() || null,
    }
    const response = formState.id
      ? await updateSystemConfig(formState.id, payload)
      : await createSystemConfig(payload)
    if (formState.id && !response.data) {
      message.warning('系统参数修改未生效，请刷新后重试')
      return
    }
    message.success(formState.id ? '系统参数修改成功' : '系统参数新增成功')
    editorOpen.value = false
    await loadConfigs()
  } finally {
    saving.value = false
  }
}

/** 启停状态不混入编辑 DTO，严格调用独立 PATCH 接口。 */
const changeEnabled = async (record: SystemConfig, enabled: boolean) => {
  if (record.builtIn) return
  statusChangingId.value = record.id
  try {
    const response = await changeSystemConfigEnabled(record.id, enabled)
    if (!response.data) {
      message.warning('状态修改未生效，请刷新后重试')
      return
    }
    message.success(enabled ? '系统参数已启用' : '系统参数已禁用')
    await loadConfigs()
  } finally {
    statusChangingId.value = ''
  }
}

/** 删除成功后在当前页已空时自动回退一页。 */
const removeConfig = async (record: SystemConfig) => {
  if (record.builtIn) return
  const response = await deleteSystemConfig(record.id)
  if (!response.data) {
    message.warning('系统参数删除未生效，请刷新后重试')
    return
  }
  message.success('系统参数删除成功')
  if (records.value.length === 1 && query.current > 1) query.current -= 1
  await loadConfigs()
}

onMounted(() => {
  void loadConfigs()
  void loadDictionaries()
})
</script>

<style scoped>
.table-panel { overflow: hidden; }
.page-toolbar { display: flex; min-height: 54px; align-items: center; justify-content: space-between; gap: var(--du-space-3); padding: var(--du-space-2) var(--du-space-3); border-bottom: 1px solid var(--du-border); }
.filters, .row-actions { display: flex; align-items: center; gap: var(--du-space-2); }
.search-input { width: 240px; }
.status-select { width: 120px; }
.code-value { color: var(--du-text-secondary); font-family: var(--du-font-mono); font-size: 11px; }
.value-preview { display: block; max-width: 360px; overflow: hidden; color: var(--du-text-secondary); text-overflow: ellipsis; white-space: nowrap; }
.row-actions { justify-content: flex-end; }
.row-actions :deep(.ant-btn) { padding-inline: 5px; font-size: 11px; }
.readonly-label { color: var(--du-text-muted); font-size: 10px; }
.table-panel :deep(.ant-table-cell) { padding-top: 8px !important; padding-bottom: 8px !important; }
.editor-form { padding-top: var(--du-space-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--du-space-4); }
.full-row { grid-column: 1 / -1; }
</style>
