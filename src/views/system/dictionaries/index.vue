<template>
  <!-- 字典管理采用左侧类型、右侧字典项的主从布局。 -->
  <section class="dictionary-page">
    <div class="dictionary-grid">
      <div class="du-panel panel type-panel">
        <header class="panel-header">
          <strong>字典类型</strong>
          <a-button v-if="canWrite" type="primary" size="small" @click="openTypeCreate"><PlusOutlined />新增</a-button>
        </header>
        <div class="panel-filters">
          <a-input v-model:value="typeQuery.keyword" allow-clear placeholder="编码或名称" @press-enter="searchTypes">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="typeQuery.enabled" :options="statusOptions" allow-clear class="status-select" placeholder="状态" />
          <a-button @click="searchTypes">查询</a-button>
          <a-button @click="resetTypeSearch"><ReloadOutlined /></a-button>
        </div>
        <a-table
          :columns="typeColumns"
          :data-source="dictTypes"
          :loading="typeLoading"
          :pagination="typePagination"
          :custom-row="getTypeRowProps"
          row-key="id"
          size="small"
          @change="changeTypePage"
        >
          <template #bodyCell="{ column, record }">
            <div v-if="column.key === 'type'" class="type-main">
              <div><strong>{{ record.typeName }}</strong><a-tag v-if="record.builtIn" color="gold">{{ getSystemDictLabel(builtInDict, record.builtIn) }}</a-tag></div>
              <code>{{ record.typeCode }}</code>
            </div>
            <a-switch
              v-else-if="column.key === 'enabled'"
              :checked="record.enabled"
              :loading="typeStatusChangingId === record.id"
              :disabled="!canWrite || record.builtIn"
              size="small"
              @change="changeTypeEnabled(record, Boolean($event))"
            />
            <div v-else-if="column.key === 'actions' && canWrite" class="type-actions" @click.stop>
              <span v-if="record.builtIn" class="readonly-label">只读</span>
              <a-tooltip v-if="!record.builtIn" title="编辑"><a-button type="text" size="small" @click="openTypeEdit(record)"><EditOutlined /></a-button></a-tooltip>
              <a-popconfirm v-if="!record.builtIn" title="存在字典项时后端将拒绝删除，确认继续吗？" ok-text="删除" cancel-text="取消" @confirm="removeType(record)">
                <a-tooltip title="删除"><a-button type="text" size="small" danger><DeleteOutlined /></a-button></a-tooltip>
              </a-popconfirm>
            </div>
          </template>
          <template #emptyText><a-empty description="暂无字典类型" /></template>
        </a-table>
      </div>

      <!-- 右侧内容始终由当前选中的字典类型驱动。 -->
      <div class="du-panel panel data-panel">
        <header class="panel-header">
          <div class="current-type">
            <strong>字典项</strong>
            <span v-if="selectedType">{{ selectedType.typeName }} · {{ selectedType.typeCode }}</span>
          </div>
          <a-button v-if="canWrite" type="primary" size="small" :disabled="!selectedType" @click="openDataCreate"><PlusOutlined />新增字典项</a-button>
        </header>
        <div class="panel-filters">
          <a-input v-model:value="dataQuery.keyword" allow-clear class="data-search" placeholder="搜索编码、标签或值" :disabled="!selectedType" @press-enter="searchData">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-select v-model:value="dataQuery.enabled" :options="statusOptions" allow-clear class="status-select" placeholder="状态" :disabled="!selectedType" />
          <a-button :disabled="!selectedType" @click="searchData">查询</a-button>
          <a-button :disabled="!selectedType" @click="resetDataSearch"><ReloadOutlined />重置</a-button>
        </div>
        <a-table
          :columns="dataColumns"
          :data-source="dictData"
          :loading="dataLoading"
          :pagination="dataPagination"
          row-key="id"
          size="small"
          @change="changeDataPage"
        >
          <template #bodyCell="{ column, record }">
            <code v-if="column.key === 'dictCode'" class="code-value">{{ record.dictCode }}</code>
            <code v-else-if="column.key === 'dictValue'" class="code-value">{{ record.dictValue }}</code>
            <span v-else-if="column.key === 'sort'">{{ record.sort ?? 0 }}</span>
            <a-switch
              v-else-if="column.key === 'enabled'"
              :checked="record.enabled"
              :loading="dataStatusChangingId === record.id"
              :disabled="!canWrite || record.builtIn"
              :checked-children="getSystemDictLabel(statusDict, '1')"
              :un-checked-children="getSystemDictLabel(statusDict, '0')"
              @change="changeDataEnabled(record, Boolean($event))"
            />
            <div v-else-if="column.key === 'actions'" class="row-actions">
              <template v-if="record.builtIn">
                <a-tooltip title="系统内置字典项，不允许修改或删除">
                  <span class="readonly-label">内置</span>
                </a-tooltip>
              </template>
              <template v-else-if="canWrite">
                <a-button type="link" size="small" @click="openDataEdit(record)"><EditOutlined />编辑</a-button>
                <a-popconfirm title="确认删除该字典项吗？" ok-text="删除" cancel-text="取消" @confirm="removeData(record)">
                  <a-button type="link" size="small" danger><DeleteOutlined />删除</a-button>
                </a-popconfirm>
              </template>
            </div>
          </template>
          <template #emptyText><a-empty :description="selectedType ? '暂无字典项' : '请先选择字典类型'" /></template>
        </a-table>
      </div>
    </div>

    <!-- 字典类型新增与编辑共用完整表单；内置类型不提供编辑入口。 -->
    <a-modal v-model:open="typeEditorOpen" :title="typeForm.id ? '编辑字典类型' : '新增字典类型'" :confirm-loading="typeSaving" ok-text="保存" cancel-text="取消" @ok="saveType">
      <a-form ref="typeFormRef" :model="typeForm" :rules="typeRules" layout="vertical" class="editor-form">
        <a-form-item label="类型编码" name="typeCode">
          <a-input v-model:value="typeForm.typeCode" :disabled="typeForm.builtIn" :maxlength="100" show-count placeholder="例如：user_gender" />
        </a-form-item>
        <a-form-item label="类型名称" name="typeName">
          <a-input v-model:value="typeForm.typeName" :maxlength="100" show-count placeholder="请输入类型名称" />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="typeForm.remark" :maxlength="500" show-count :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 字典项表单固定携带当前 dictTypeId，且保持字符串类型。 -->
    <a-modal v-model:open="dataEditorOpen" :title="dataForm.id ? '编辑字典项' : '新增字典项'" :confirm-loading="dataSaving" width="620px" ok-text="保存" cancel-text="取消" @ok="saveData">
      <a-form ref="dataFormRef" :model="dataForm" :rules="dataRules" layout="vertical" class="editor-form">
        <div class="form-grid">
          <a-form-item label="字典编码" name="dictCode">
            <a-input v-model:value="dataForm.dictCode" :maxlength="100" show-count />
          </a-form-item>
          <a-form-item label="字典标签" name="dictLabel">
            <a-input v-model:value="dataForm.dictLabel" :maxlength="100" show-count />
          </a-form-item>
          <a-form-item label="字典值" name="dictValue">
            <a-input v-model:value="dataForm.dictValue" :maxlength="200" show-count />
          </a-form-item>
          <a-form-item label="排序" name="sort">
            <a-input-number v-model:value="dataForm.sort" :min="0" :max="2147483647" class="number-input" />
          </a-form-item>
          <a-form-item label="备注" name="remark" class="full-row">
            <a-textarea v-model:value="dataForm.remark" :maxlength="500" show-count :rows="3" />
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
  changeSystemDictDataEnabled,
  changeSystemDictTypeEnabled,
  clearDictCache,
  createSystemDictData,
  createSystemDictType,
  deleteSystemDictData,
  deleteSystemDictType,
  getSystemDictData,
  getSystemDictDataPage,
  getSystemDictType,
  getSystemDictTypePage,
  getEnabledDictData,
  updateSystemDictData,
  updateSystemDictType,
} from '@/apis/upms/dict'
import type {
  SystemDictData,
  SystemDictDataSaveDTO,
  SystemDictType,
  SystemDictTypeSaveDTO,
} from '@/apis/upms/dict/type'
import { menusStore } from '@/stores/modules/user'
import { getSystemDictLabel, SYSTEM_DICT_TYPE, toSystemDictOptions } from '@/utils/SystemDict'

interface DictTypeFormState extends SystemDictTypeSaveDTO { id?: string, builtIn: boolean }
interface DictDataFormState extends SystemDictDataSaveDTO { id?: string }

// 所有增删改和启停入口统一受当前菜单读写权限控制。
const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const typeLoading = ref(false)
const dataLoading = ref(false)
const typeSaving = ref(false)
const dataSaving = ref(false)
const typeEditorOpen = ref(false)
const dataEditorOpen = ref(false)
const typeStatusChangingId = ref('')
const dataStatusChangingId = ref('')
const dictTypes = ref<SystemDictType[]>([])
const dictData = ref<SystemDictData[]>([])
const statusDict = ref<SystemDictData[]>([])
const builtInDict = ref<SystemDictData[]>([])
const selectedTypeId = ref('')
const typeTotal = ref(0)
const dataTotal = ref(0)
const typeFormRef = ref<FormInstance>()
const dataFormRef = ref<FormInstance>()

// 主表和从表各自维护查询条件及分页，切换主表时只重置从表。
const typeQuery = reactive<{ current: number, size: number, keyword: string, enabled?: boolean }>({ current: 1, size: 10, keyword: '', enabled: undefined })
const dataQuery = reactive<{ current: number, size: number, keyword: string, enabled?: boolean }>({ current: 1, size: 10, keyword: '', enabled: undefined })
const selectedType = computed(() => dictTypes.value.find((item) => item.id === selectedTypeId.value) || null)

const emptyTypeForm = (): DictTypeFormState => ({ typeCode: '', typeName: '', remark: null, builtIn: false })
const emptyDataForm = (): DictDataFormState => ({ dictTypeId: '', dictCode: '', dictLabel: '', dictValue: '', sort: 0, remark: null })
const typeForm = reactive<DictTypeFormState>(emptyTypeForm())
const dataForm = reactive<DictDataFormState>(emptyDataForm())
const statusOptions = computed(() => toSystemDictOptions(statusDict.value, (value) => value === '1'))

const loadDictionaries = async () => {
  const [statusResponse, builtInResponse] = await Promise.all([
    getEnabledDictData(SYSTEM_DICT_TYPE.commonStatus),
    getEnabledDictData(SYSTEM_DICT_TYPE.commonBuiltIn),
  ])
  statusDict.value = statusResponse.data || []
  builtInDict.value = builtInResponse.data || []
}

const typeColumns: TableColumnsType<SystemDictType> = [
  { title: '类型', key: 'type' },
  { title: '状态', key: 'enabled', width: 56, align: 'center' },
  { title: '', key: 'actions', width: 68, align: 'center' },
]
const dataColumns: TableColumnsType<SystemDictData> = [
  { title: '字典编码', dataIndex: 'dictCode', key: 'dictCode', width: 150 },
  { title: '字典标签', dataIndex: 'dictLabel', key: 'dictLabel', width: 140 },
  { title: '字典值', dataIndex: 'dictValue', key: 'dictValue' },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 65, align: 'center' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 85 },
  { title: '操作', key: 'actions', width: 140, align: 'right' },
]

const typePagination = computed(() => ({ current: typeQuery.current, pageSize: typeQuery.size, total: typeTotal.value, size: 'small' as const, showSizeChanger: true, showTotal: (count: number) => `共 ${count} 条` }))
const dataPagination = computed(() => ({ current: dataQuery.current, pageSize: dataQuery.size, total: dataTotal.value, showSizeChanger: true, showTotal: (count: number) => `共 ${count} 条` }))

// 表单规则与后端字段长度限制保持一致，减少无效请求。
const typeRules: FormProps['rules'] = {
  typeCode: [{ required: true, whitespace: true, message: '请输入类型编码', trigger: 'blur' }, { max: 100, message: '类型编码不能超过 100 个字符', trigger: 'blur' }],
  typeName: [{ required: true, whitespace: true, message: '请输入类型名称', trigger: 'blur' }, { max: 100, message: '类型名称不能超过 100 个字符', trigger: 'blur' }],
  remark: [{ max: 500, message: '备注不能超过 500 个字符', trigger: 'blur' }],
}
const dataRules: FormProps['rules'] = {
  dictCode: [{ required: true, whitespace: true, message: '请输入字典编码', trigger: 'blur' }, { max: 100, message: '字典编码不能超过 100 个字符', trigger: 'blur' }],
  dictLabel: [{ required: true, whitespace: true, message: '请输入字典标签', trigger: 'blur' }, { max: 100, message: '字典标签不能超过 100 个字符', trigger: 'blur' }],
  dictValue: [{ required: true, whitespace: true, message: '请输入字典值', trigger: 'blur' }, { max: 200, message: '字典值不能超过 200 个字符', trigger: 'blur' }],
  remark: [{ max: 500, message: '备注不能超过 500 个字符', trigger: 'blur' }],
}

// Long ID 不转 number；比较时先看字符串长度，再按字典序得到稳定升序。
const compareId = (left: string, right: string) => left.length - right.length || left.localeCompare(right)
/** 加载当前字典类型下的一页字典项，并按 sort、id 升序稳定展示。 */
const loadData = async () => {
  if (!selectedTypeId.value) {
    dictData.value = []
    dataTotal.value = 0
    return
  }
  dataLoading.value = true
  try {
    const response = await getSystemDictDataPage({ ...dataQuery, keyword: dataQuery.keyword.trim(), dictTypeId: selectedTypeId.value })
    dictData.value = (response.data?.records || []).slice().sort((left, right) =>
      (left.sort ?? 0) - (right.sort ?? 0) || compareId(left.id, right.id))
    dataTotal.value = response.data?.total || 0
  } finally { dataLoading.value = false }
}

/** 加载字典类型；当前选择失效时自动选中本页第一项并刷新从表。 */
const loadTypes = async () => {
  typeLoading.value = true
  try {
    const response = await getSystemDictTypePage({ ...typeQuery, keyword: typeQuery.keyword.trim() })
    dictTypes.value = response.data?.records || []
    typeTotal.value = response.data?.total || 0
    if (!dictTypes.value.some((item) => item.id === selectedTypeId.value)) {
      selectedTypeId.value = dictTypes.value[0]?.id || ''
      dataQuery.current = 1
    }
    await loadData()
  } finally { typeLoading.value = false }
}

// 切换字典类型时清空右侧筛选条件，避免上一个类型的条件继续生效。
const selectType = (record: SystemDictType) => {
  if (selectedTypeId.value === record.id) return
  selectedTypeId.value = record.id
  dataQuery.current = 1
  dataQuery.keyword = ''
  dataQuery.enabled = undefined
  void loadData()
}
const getTypeRowProps = (record: SystemDictType) => ({ onClick: () => selectType(record), class: record.id === selectedTypeId.value ? 'selected-type-row' : '' })
const searchTypes = () => { typeQuery.current = 1; void loadTypes() }
const resetTypeSearch = () => { Object.assign(typeQuery, { current: 1, size: 10, keyword: '', enabled: undefined }); void loadTypes() }
const searchData = () => { dataQuery.current = 1; void loadData() }
const resetDataSearch = () => { Object.assign(dataQuery, { current: 1, size: 10, keyword: '', enabled: undefined }); void loadData() }
const changeTypePage = (page: { current?: number, pageSize?: number }) => { typeQuery.current = page.current || 1; typeQuery.size = page.pageSize || 10; void loadTypes() }
const changeDataPage = (page: { current?: number, pageSize?: number }) => { dataQuery.current = page.current || 1; dataQuery.size = page.pageSize || 10; void loadData() }

/** 打开字典类型新增表单。 */
const openTypeCreate = () => { Object.assign(typeForm, emptyTypeForm()); typeEditorOpen.value = true }
/** 编辑前读取类型详情；内置类型在事件层再次拦截。 */
const openTypeEdit = async (record: SystemDictType) => {
  if (record.builtIn) return
  const response = await getSystemDictType(record.id)
  if (!response.data) return void message.warning('该字典类型已不存在，请刷新列表')
  Object.assign(typeForm, { id: response.data.id, typeCode: response.data.typeCode, typeName: response.data.typeName, remark: response.data.remark, builtIn: response.data.builtIn })
  typeEditorOpen.value = true
}
/** 新增或全量修改字典类型。 */
const saveType = async () => {
  await typeFormRef.value?.validate()
  typeSaving.value = true
  try {
    const payload: SystemDictTypeSaveDTO = { typeCode: typeForm.typeCode.trim(), typeName: typeForm.typeName.trim(), remark: typeForm.remark?.trim() || null }
    const response = typeForm.id ? await updateSystemDictType(typeForm.id, payload) : await createSystemDictType(payload)
    if (typeForm.id && !response.data) return void message.warning('字典类型修改未生效，请刷新后重试')
    clearDictCache(typeForm.typeCode)
    message.success(typeForm.id ? '字典类型修改成功' : '字典类型新增成功')
    typeEditorOpen.value = false
    await loadTypes()
  } finally { typeSaving.value = false }
}
/** 字典类型状态由独立 PATCH 接口维护。 */
const changeTypeEnabled = async (record: SystemDictType, enabled: boolean) => {
  if (record.builtIn) return
  typeStatusChangingId.value = record.id
  try {
    const response = await changeSystemDictTypeEnabled(record.id, enabled)
    if (!response.data) return void message.warning('状态修改未生效，请刷新后重试')
    clearDictCache(record.typeCode)
    message.success(enabled ? '字典类型已启用' : '字典类型已禁用')
    await loadTypes()
  } finally { typeStatusChangingId.value = '' }
}
/** 删除字典类型；存在字典项时由后端校验并返回具体 message。 */
const removeType = async (record: SystemDictType) => {
  if (record.builtIn) return
  const response = await deleteSystemDictType(record.id)
  if (!response.data) return void message.warning('字典类型删除未生效，请刷新后重试')
  clearDictCache(record.typeCode)
  message.success('字典类型删除成功')
  if (dictTypes.value.length === 1 && typeQuery.current > 1) typeQuery.current -= 1
  await loadTypes()
}

/** 新建字典项时绑定当前选中的字符串类型 ID。 */
const openDataCreate = () => {
  if (!selectedTypeId.value) return
  Object.assign(dataForm, emptyDataForm(), { dictTypeId: selectedTypeId.value })
  dataEditorOpen.value = true
}
/** 编辑前重新获取字典项完整详情。 */
const openDataEdit = async (record: SystemDictData) => {
  if (record.builtIn) return
  const response = await getSystemDictData(record.id)
  if (!response.data) return void message.warning('该字典项已不存在，请刷新列表')
  Object.assign(dataForm, { id: response.data.id, dictTypeId: response.data.dictTypeId, dictCode: response.data.dictCode, dictLabel: response.data.dictLabel, dictValue: response.data.dictValue, sort: response.data.sort, remark: response.data.remark })
  dataEditorOpen.value = true
}
/** 新增或全量修改字典项。 */
const saveData = async () => {
  await dataFormRef.value?.validate()
  dataSaving.value = true
  try {
    const payload: SystemDictDataSaveDTO = { dictTypeId: dataForm.dictTypeId, dictCode: dataForm.dictCode.trim(), dictLabel: dataForm.dictLabel.trim(), dictValue: dataForm.dictValue.trim(), sort: dataForm.sort, remark: dataForm.remark?.trim() || null }
    const response = dataForm.id ? await updateSystemDictData(dataForm.id, payload) : await createSystemDictData(payload)
    if (dataForm.id && !response.data) return void message.warning('字典项修改未生效，请刷新后重试')
    clearDictCache(selectedType.value?.typeCode)
    message.success(dataForm.id ? '字典项修改成功' : '字典项新增成功')
    dataEditorOpen.value = false
    await loadData()
  } finally { dataSaving.value = false }
}
/** 字典项状态由独立 PATCH 接口维护。 */
const changeDataEnabled = async (record: SystemDictData, enabled: boolean) => {
  if (record.builtIn) return
  dataStatusChangingId.value = record.id
  try {
    const response = await changeSystemDictDataEnabled(record.id, enabled)
    if (!response.data) return void message.warning('状态修改未生效，请刷新后重试')
    clearDictCache(selectedType.value?.typeCode)
    message.success(enabled ? '字典项已启用' : '字典项已禁用')
    await loadData()
  } finally { dataStatusChangingId.value = '' }
}
/** 删除字典项并在当前页已空时回退一页。 */
const removeData = async (record: SystemDictData) => {
  if (record.builtIn) return
  const response = await deleteSystemDictData(record.id)
  if (!response.data) return void message.warning('字典项删除未生效，请刷新后重试')
  clearDictCache(selectedType.value?.typeCode)
  message.success('字典项删除成功')
  if (dictData.value.length === 1 && dataQuery.current > 1) dataQuery.current -= 1
  await loadData()
}

onMounted(() => {
  void loadTypes()
  void loadDictionaries()
})
</script>

<style scoped>
.dictionary-grid { display: grid; grid-template-columns: minmax(330px, 0.7fr) minmax(620px, 1.5fr); gap: var(--du-space-3); }
.panel { min-width: 0; overflow: hidden; }
.panel-header { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: var(--du-space-2); padding: 0 var(--du-space-3); border-bottom: 1px solid var(--du-border); }
.panel-header strong { font-size: 12px; }
.panel-filters { display: flex; gap: var(--du-space-2); padding: var(--du-space-2) var(--du-space-3); border-bottom: 1px solid var(--du-border); }
.type-panel .panel-filters :deep(.ant-input-affix-wrapper) { min-width: 0; }
.status-select { width: 100px; flex: 0 0 100px; }
.data-search { max-width: 260px; }
.current-type { display: flex; align-items: baseline; gap: var(--du-space-2); }
.current-type span { color: var(--du-text-muted); font-size: 10px; }
.type-main { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.type-main > div { display: flex; align-items: center; gap: 5px; }
.type-main strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.type-main code, .code-value { color: var(--du-text-secondary); font-family: var(--du-font-mono); font-size: 10px; }
.row-actions { display: flex; justify-content: flex-end; align-items: center; }
.type-actions { display: flex; justify-content: center; align-items: center; }
.type-actions :deep(.ant-btn) { padding-inline: 4px; }
.readonly-label { color: var(--du-text-muted); font-size: 10px; }
.row-actions :deep(.ant-btn) { padding-inline: 5px; font-size: 10px; }
.panel :deep(.ant-table-cell) { padding-top: 7px !important; padding-bottom: 7px !important; }
.type-panel :deep(.ant-table-tbody > tr) { cursor: pointer; }
.type-panel :deep(.ant-table-tbody > tr.selected-type-row > td) { background: #edf3ff !important; }
.editor-form { padding-top: var(--du-space-3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--du-space-4); }
.full-row { grid-column: 1 / -1; }
.number-input { width: 100%; }
@media (max-width: 1200px) { .dictionary-grid { grid-template-columns: 1fr; } }
</style>
