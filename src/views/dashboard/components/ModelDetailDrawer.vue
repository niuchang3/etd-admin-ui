<template>
  <a-drawer
    :open="open"
    :width="640"
    :mask-closable="!actionLoading"
    :closable="!actionLoading"
    :keyboard="!actionLoading"
    class="model-detail-drawer"
    @close="handleClose"
  >
    <template #title>
      <div v-if="modelData" class="drawer-title">
        <BrandLogoView
          :provider-code="modelData.providerCode"
          :provider-name="modelData.modelName"
          :logo="modelData.logo"
          :logo-path="modelData.logoPath"
        />
        <div class="model-title-text">
          <div class="model-name">{{ modelData.modelName }}</div>
          <div class="model-code du-mono">{{ modelData.modelCode }}</div>
        </div>
      </div>
    </template>

    <a-spin :spinning="loading">
      <div v-if="modelData" class="detail-content">
        <section class="model-overview">
          <div class="model-meta-row">
            <DictTag :type-code="AI_DICT_TYPE.MODEL_PROVIDER" :value="modelData.providerCode" />
            <DictTag :type-code="AI_DICT_TYPE.MODEL_TYPE" :value="modelData.modelType" />
          </div>
          <p v-if="modelData.description" class="model-description">{{ modelData.description }}</p>
          <div v-if="embeddingDimensions.length" class="embedding-dims-line">
            <span class="field-label">支持维度</span>
            <div class="dim-tags-wrap">
              <a-tag v-for="dim in embeddingDimensions" :key="dim" class="du-mono">
                {{ getDictLabel(AI_DICT_TYPE.EMBEDDING_DIMENSION, String(dim)) || dim }}
              </a-tag>
            </div>
          </div>
          <div v-if="modelData.apiKeyUrl || modelData.setupGuideUrl" class="model-doc-links">
            <a v-if="modelData.apiKeyUrl" :href="modelData.apiKeyUrl" target="_blank" rel="noopener noreferrer">
              获取 API Key ↗
            </a>
            <a v-if="modelData.setupGuideUrl" :href="modelData.setupGuideUrl" target="_blank" rel="noopener noreferrer">
              配置文档 ↗
            </a>
          </div>
        </section>

        <a-alert v-if="loadError" type="error" show-icon :message="loadError">
          <template #action><a-button @click="loadData()">重新加载</a-button></template>
        </a-alert>

        <section v-else-if="!loading" class="connection-section">
          <div class="section-title-bar">
            <h3>连接器配置</h3>
            <div v-if="connection" class="connection-status">
              <span class="field-label">连接器状态</span>
              <a-switch
                :checked="connection.dataStatus === COMMON_STATUS.ENABLED"
                :loading="statusChangingId === connection.id"
                :disabled="!canWrite || actionLoading || modelData.dataStatus === COMMON_STATUS.DISABLED"
                checked-children="启用"
                un-checked-children="停用"
                @change="handleToggleStatus(Boolean($event))"
              />
            </div>
            <span v-if="!canWrite" class="readonly-label">只读</span>
          </div>
          <p v-if="!connection" class="section-tip">
            {{ canWrite ? '填写配置并保存，即可接入当前模型。' : '当前模型尚未接入连接器。' }}
          </p>
          <a-alert
            v-if="modelData.dataStatus === COMMON_STATUS.DISABLED"
            type="warning"
            show-icon
            message="模型已停用，无法新增或启用连接器，已有配置仍可修改或删除。"
            class="model-disabled-alert"
          />
          <a-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            :disabled="formDisabled"
            layout="vertical"
            class="connection-form"
          >
            <div class="form-grid">
              <a-form-item label="接入协议" name="protocol">
                <DictSelect v-model:value="formData.protocol" :type-code="AI_DICT_TYPE.MODEL_PROTOCOL" :disabled="formDisabled" placeholder="请选择接入协议" />
              </a-form-item>
              <a-form-item label="认证方式" name="authType">
                <DictSelect v-model:value="formData.authType" :type-code="AI_DICT_TYPE.MODEL_AUTH_TYPE" :disabled="formDisabled" placeholder="请选择认证方式" />
              </a-form-item>
            </div>
            <a-form-item label="服务地址 (Base URL)" name="baseUrl">
              <a-input v-model:value="formData.baseUrl" placeholder="请输入以 http:// 或 https:// 开头的服务地址" allow-clear />
              <template v-if="modelData.baseUrlHelp" #extra>
                <details class="endpoint-help">
                  <summary>接入说明</summary>
                  <p>{{ modelData.baseUrlHelp }}</p>
                </details>
              </template>
            </a-form-item>
            <a-form-item label="API Key" name="apiKey">
              <a-input-password
                v-model:value="formData.apiKey"
                :placeholder="connection?.credentialConfigured ? '留空保留原密钥，输入新值可更换' : '请输入 API Key / 访问令牌'"
                allow-clear
                autocomplete="new-password"
              />
              <template v-if="connection?.credentialConfigured" #extra>
                密钥已配置，不回显明文；留空保留原密钥。
              </template>
            </a-form-item>
            <a-form-item label="备注" name="remark">
              <a-textarea v-model:value="formData.remark" placeholder="请输入备注（可选）" :rows="2" :maxlength="200" show-count />
            </a-form-item>
          </a-form>
        </section>
      </div>
    </a-spin>

    <template #footer>
      <div class="drawer-footer">
        <a-popconfirm
          v-if="canWrite && connection && !loadError"
          title="确认删除该连接器？"
          description="删除后将无法通过此连接器调用当前模型，操作不可恢复。"
          ok-text="确认删除"
          cancel-text="取消"
          ok-type="danger"
          @confirm="handleDelete"
        >
          <a-button danger :loading="deletingId === connection.id" :disabled="loading || actionLoading">
            删除连接器
          </a-button>
        </a-popconfirm>
        <div class="footer-actions">
          <a-button :disabled="actionLoading" @click="handleClose">关闭</a-button>
          <a-button
            v-if="canWrite"
            type="primary"
            :loading="submitLoading"
            :disabled="loading || Boolean(loadError) || actionLoading || !modelData || (!connection && modelData.dataStatus === COMMON_STATUS.DISABLED)"
            @click="handleSubmit"
          >
            {{ connection ? '保存配置' : '保存并接入' }}
          </a-button>
        </div>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import {
  createSquareConnection,
  deleteSquareConnection,
  getSquareConnectionDetail,
  getSquareConnections,
  getSquareModelDetail,
  updateSquareConnection,
  updateSquareConnectionStatus,
} from '@/apis/ai/square'
import type { SquareConnectionRecord, SquareModelRecord } from '@/apis/ai/square/type'
import DictSelect from '@/components/DictSelect.vue'
import DictTag from '@/components/DictTag.vue'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE, COMMON_STATUS } from '@/constant'
import BrandLogoView from './BrandLogoView.vue'

const props = defineProps<{
  open: boolean
  model: SquareModelRecord | null
  canWrite: boolean
}>()
const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const { getDict, getLabel: getDictLabel } = useSystemDict([AI_DICT_TYPE.EMBEDDING_DIMENSION])
const modelDetail = ref<SquareModelRecord | null>(null)
const modelData = computed(() => modelDetail.value || props.model)
const connection = ref<SquareConnectionRecord | null>(null)
const formRef = ref<FormInstance>()
const loading = ref(false)
const loadError = ref('')
const submitLoading = ref(false)
const statusChangingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const actionLoading = computed(() => submitLoading.value || Boolean(statusChangingId.value || deletingId.value))
const formDisabled = computed(() => !props.canWrite || actionLoading.value || (
  !connection.value && modelData.value?.dataStatus === COMMON_STATUS.DISABLED
))
let requestId = 0

const formData = reactive({
  protocol: undefined as string | undefined,
  authType: undefined as string | undefined,
  baseUrl: '',
  apiKey: '',
  remark: '',
})
const formRules: Record<string, Rule[]> = {
  protocol: [{ required: true, message: '请选择接入协议', trigger: 'change' }],
  authType: [{ required: true, message: '请选择认证方式', trigger: 'change' }],
  baseUrl: [
    { required: true, message: '请输入服务地址', trigger: 'blur' },
    {
      validator: async (_rule, value: string) => {
        if (!value) return
        try {
          const url = new URL(value.trim())
          if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error()
        } catch {
          throw new Error('请输入有效的 http:// 或 https:// 服务地址')
        }
      },
      trigger: 'blur',
    },
  ],
  remark: [{ max: 200, message: '备注不能超过 200 个字符', trigger: 'blur' }],
}
const embeddingDimensions = computed(() => {
  const values = new Set(getDict(AI_DICT_TYPE.EMBEDDING_DIMENSION).map((item) => item.dictValue))
  return (modelData.value?.embedding || []).filter((dim) => values.has(String(dim)))
})

const resetForm = () => {
  formData.protocol = connection.value?.protocol || undefined
  formData.authType = connection.value?.authType || undefined
  formData.baseUrl = connection.value?.baseUrl || ''
  formData.apiKey = ''
  formData.remark = connection.value?.remark || ''
  void nextTick(() => formRef.value?.clearValidate())
}

const loadData = async (reset = true) => {
  if (!props.open || !props.model?.id) return
  const currentRequest = ++requestId
  const modelId = props.model.id
  loading.value = true
  loadError.value = ''
  try {
    const [modelResponse, connectionResponse] = await Promise.all([
      getSquareModelDetail(modelId),
      getSquareConnections({ modelId }),
    ])
    if (currentRequest !== requestId) return
    if (!modelResponse.data) throw new Error('模型详情为空')
    modelDetail.value = modelResponse.data
    // 接口仍返回数组；不任意选取一条，以免误改历史的多连接数据。
    const dataList = connectionResponse.data || []
    if (dataList.length > 1) {
      connection.value = null
      loadError.value = '当前模型存在多条连接数据，请联系管理员确认唯一连接器后重新加载。'
      return
    }
    const record = dataList[0]
    const response = record ? await getSquareConnectionDetail(record.id) : null
    if (currentRequest !== requestId) return
    if (record && !response?.data) throw new Error('连接器详情为空')
    connection.value = response?.data || null
    if (reset) resetForm()
  } catch {
    if (currentRequest === requestId) loadError.value = '配置加载失败，请重新加载后再操作。'
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

watch(
  () => [props.open, props.model?.id] as const,
  () => {
    requestId += 1
    modelDetail.value = null
    connection.value = null
    loadError.value = ''
    resetForm()
    if (props.open) void loadData()
  },
  { immediate: true }
)

const handleClose = () => {
  if (actionLoading.value) return
  emit('update:open', false)
}

const handleSubmit = async () => {
  if (!props.canWrite) return
  if (!modelData.value || !formRef.value || loading.value || loadError.value || actionLoading.value) return
  if (!connection.value && modelData.value.dataStatus === COMMON_STATUS.DISABLED) return
  formData.baseUrl = formData.baseUrl.trim()
  formData.apiKey = formData.apiKey.trim()
  formData.remark = formData.remark.trim()
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!props.canWrite || actionLoading.value || !formData.protocol || !formData.authType) return
  submitLoading.value = true
  try {
    const data = {
      protocol: formData.protocol,
      authType: formData.authType,
      baseUrl: formData.baseUrl,
      apiKey: formData.apiKey || undefined,
      remark: formData.remark || null,
    }
    if (connection.value) {
      await updateSquareConnection(connection.value.id, { ...data, version: connection.value.version })
      message.success('保存连接器配置成功')
    } else {
      await createSquareConnection({ ...data, modelId: modelData.value.id })
      message.success('接入模型成功')
    }
    // 保存成功即清除输入的密钥，即使后续刷新失败也不在界面保留。
    formData.apiKey = ''
    await loadData()
    emit('success')
  } catch {
    // 通用错误由请求拦截器提示。
  } finally {
    submitLoading.value = false
  }
}

const handleToggleStatus = async (checked: boolean) => {
  if (!props.canWrite) return
  if (!connection.value || loading.value || loadError.value || actionLoading.value) return
  if (modelData.value?.dataStatus === COMMON_STATUS.DISABLED) return
  statusChangingId.value = connection.value.id
  try {
    await updateSquareConnectionStatus(connection.value.id, {
      dataStatus: checked ? COMMON_STATUS.ENABLED : COMMON_STATUS.DISABLED,
      version: connection.value.version,
    })
    message.success(checked ? '启用连接器成功' : '停用连接器成功')
    await loadData(false)
    emit('success')
  } catch {
    // 通用错误由请求拦截器提示。
  } finally {
    statusChangingId.value = null
  }
}

const handleDelete = async () => {
  if (!props.canWrite) return
  if (!connection.value || loading.value || loadError.value || actionLoading.value) return
  deletingId.value = connection.value.id
  try {
    await deleteSquareConnection(connection.value.id)
    connection.value = null
    resetForm()
    message.success('删除连接器成功')
    await loadData()
    emit('success')
  } catch {
    // 通用错误由请求拦截器提示。
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--du-space-5);
}
.drawer-title {
  display: flex;
  align-items: center;
  gap: var(--du-space-3);
  min-width: 0;
}
.drawer-title :deep(.brand-wordmark) { display: none; }
.drawer-title :deep(.brand-logo-img-box) {
  width: 32px;
  height: 32px;
  border-radius: var(--du-radius-md);
}
.drawer-title :deep(.brand-real-logo-img) { max-width: 24px; max-height: 24px; }
.model-title-text { min-width: 0; }
.model-name { font-size: var(--du-font-size-md); font-weight: 500; overflow-wrap: anywhere; }
.model-code { font-size: var(--du-font-size-xs); font-weight: 400; color: var(--du-text-muted); overflow-wrap: anywhere; }
.model-overview { display: flex; flex-direction: column; gap: var(--du-space-3); }
.model-meta-row, .dim-tags-wrap, .model-doc-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--du-space-2);
}
.model-description {
  margin: 0;
  font-size: var(--du-font-size-base);
  line-height: 1.7;
  color: var(--du-text-secondary);
  overflow-wrap: anywhere;
}
.embedding-dims-line { display: flex; align-items: baseline; gap: var(--du-space-2); }
.field-label { color: var(--du-text-secondary); font-size: var(--du-font-size-base); white-space: nowrap; }
.model-doc-links { gap: var(--du-space-4); font-size: var(--du-font-size-base); }
.connection-section { border-top: 1px solid var(--du-border); padding-top: var(--du-space-4); }
.section-title-bar { display: flex; align-items: center; gap: var(--du-space-3); margin-bottom: var(--du-space-3); }
.section-title-bar h3 { margin: 0; font-size: var(--du-font-size-md); font-weight: 500; }
.connection-status { display: flex; align-items: center; gap: var(--du-space-2); margin-left: auto; }
.readonly-label { color: var(--du-text-muted); font-size: var(--du-font-size-xs); line-height: 24px; margin-left: auto; }
.section-tip { font-size: var(--du-font-size-base); color: var(--du-text-muted); margin: 0 0 var(--du-space-3); }
.model-disabled-alert { margin-bottom: var(--du-space-4); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--du-space-4); }
.connection-form :deep(.ant-form-item) { margin-bottom: var(--du-space-4); }
.endpoint-help { font-size: var(--du-font-size-xs); color: var(--du-text-secondary); }
.endpoint-help summary { cursor: pointer; color: var(--du-accent); }
.endpoint-help p { margin: var(--du-space-2) 0 0; line-height: 1.7; overflow-wrap: anywhere; }
.drawer-footer { display: flex; align-items: center; gap: var(--du-space-2); }
.footer-actions { display: flex; gap: var(--du-space-2); margin-left: auto; }
</style>
