<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑模型连接' : '新增模型连接'"
    :confirm-loading="confirmLoading"
    :mask-closable="false"
    :width="540"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
      class="compact-form"
    >
      <a-form-item label="连接名称" name="connectionName">
        <a-input
          v-model:value="formData.connectionName"
          placeholder="请输入连接名称，例如：DashScope 通用连接"
          :maxlength="100"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="接入协议" name="provider">
            <DictSelect
              v-model:value="formData.provider"
              type-code="ai_model_provider"
              placeholder="请选择接入协议"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="认证方式" name="authType">
            <DictSelect
              v-model:value="formData.authType"
              type-code="ai_model_auth_type"
              placeholder="请选择认证方式"
              @change="handleAuthTypeChange"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item
        label="服务地址 (Base URL)"
        name="baseUrl"
        extra="只允许 http:// 或 https:// 协议地址，禁止携带用户名密码、查询参数或 URL 片段"
      >
        <a-input
          v-model:value="formData.baseUrl"
          placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode/v1"
          :maxlength="1000"
          allow-clear
        />
      </a-form-item>

      <!-- 仅在认证方式为 api_key 时展示密钥输入框 -->
      <a-form-item
        v-if="formData.authType === 'api_key'"
        label="API Key 访问密钥"
        name="apiKey"
        :extra="isEdit ? (credentialConfigured ? '当前已配置密钥。留空保持原凭证不变；输入新值将覆盖更新。' : '当前尚未配置密钥。') : '凭证将通过服务端主密钥加密安全存储。'"
      >
        <a-input-password
          v-model:value="formData.apiKey"
          :placeholder="isEdit ? '留空表示保留原凭证' : '请输入 API Key 密钥'"
          :maxlength="4096"
          autocomplete="new-password"
        />
      </a-form-item>

      <a-form-item label="备注说明" name="remark">
        <a-textarea
          v-model:value="formData.remark"
          placeholder="可选输入连接用途、所属账号或环境说明"
          :maxlength="500"
          :rows="3"
          show-count
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import {
  createModelConnection,
  getModelConnection,
  updateModelConnection,
} from '@/apis/ai/connection'
import type {
  ModelConnectionRecord,
  ModelConnectionSaveDTO,
} from '@/apis/ai/connection/type'
import DictSelect from '@/components/DictSelect.vue'

interface Props {
  open: boolean
  record: ModelConnectionRecord | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const confirmLoading = ref(false)
const credentialConfigured = ref(false)

const isEdit = computed(() => Boolean(props.record?.id))

interface FormState {
  connectionName: string
  provider: string
  baseUrl: string
  authType: string
  apiKey: string
  remark: string
}

const initialFormState: FormState = {
  connectionName: '',
  provider: '',
  baseUrl: '',
  authType: 'api_key',
  apiKey: '',
  remark: '',
}

const formData = reactive<FormState>({ ...initialFormState })

/** Base URL 校验：必须是合法 http(s)，且不能带用户名、密码、query 或 hash */
const validateBaseUrl = async (_rule: Rule, value: string) => {
  if (!value) {
    return Promise.reject(new Error('请输入服务地址'))
  }
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return Promise.reject(new Error('服务地址必须以 http:// 或 https:// 开头'))
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.username || parsed.password) {
      return Promise.reject(new Error('服务地址不能包含用户名或密码凭证'))
    }
    if (parsed.search) {
      return Promise.reject(new Error('服务地址不能包含查询参数（? 之后的内容）'))
    }
    if (parsed.hash) {
      return Promise.reject(new Error('服务地址不能包含 URL 片段（# 之后的内容）'))
    }
  } catch {
    return Promise.reject(new Error('服务地址不是合法的 URL 格式'))
  }
  return Promise.resolve()
}

const rules: Record<string, Rule[]> = {
  connectionName: [
    { required: true, message: '请输入连接名称', trigger: 'blur' },
    { max: 100, message: '连接名称不能超过 100 个字符', trigger: 'blur' },
  ],
  provider: [{ required: true, message: '请选择接入协议', trigger: 'change' }],
  baseUrl: [
    { required: true, validator: validateBaseUrl, trigger: 'blur' },
    { max: 1000, message: '服务地址不能超过 1000 个字符', trigger: 'blur' },
  ],
  authType: [{ required: true, message: '请选择认证方式', trigger: 'change' }],
  apiKey: [
    {
      validator: async (_rule: Rule, value: string) => {
        // 新增时若为 api_key 必填；编辑时若尚未配置过凭证且选了 api_key 也必填
        if (formData.authType === 'api_key' && !value?.trim()) {
          if (!isEdit.value || !credentialConfigured.value) {
            return Promise.reject(new Error('请输入 API Key 访问密钥'))
          }
        }
        if (value && value.length > 4096) {
          return Promise.reject(new Error('API Key 长度不能超过 4096 个字符'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  remark: [{ max: 500, message: '备注说明不能超过 500 个字符', trigger: 'blur' }],
}

const handleAuthTypeChange = (val: unknown) => {
  if (val === 'none') {
    formData.apiKey = ''
  }
}

const currentVersion = ref<string | number | undefined>(undefined)

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      if (props.record?.id) {
        // 编辑时重新获取最新详情，不直接信任列表行
        try {
          const res = await getModelConnection(props.record.id)
          const detail = res.data
          formData.connectionName = detail.connectionName || ''
          formData.provider = detail.provider || ''
          formData.baseUrl = detail.baseUrl || ''
          formData.authType = detail.authType || 'api_key'
          // API Key 只写不读，编辑时必须置空
          formData.apiKey = ''
          formData.remark = detail.remark || ''
          credentialConfigured.value = Boolean(detail.credentialConfigured)
          currentVersion.value = detail.version
        } catch {
          // 降级回退
          formData.connectionName = props.record.connectionName || ''
          formData.provider = props.record.provider || ''
          formData.baseUrl = props.record.baseUrl || ''
          formData.authType = props.record.authType || 'api_key'
          formData.apiKey = ''
          formData.remark = props.record.remark || ''
          credentialConfigured.value = Boolean(props.record.credentialConfigured)
          currentVersion.value = props.record.version
        }
      } else {
        Object.assign(formData, initialFormState)
        credentialConfigured.value = false
        currentVersion.value = undefined
      }
      formRef.value?.clearValidate()
    }
  }
)

const handleOk = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  confirmLoading.value = true
  try {
    const payload: ModelConnectionSaveDTO = {
      connectionName: formData.connectionName.trim(),
      provider: formData.provider,
      baseUrl: formData.baseUrl.trim(),
      authType: formData.authType,
      remark: formData.remark?.trim() ? formData.remark.trim() : (isEdit.value ? null : undefined),
    }

    // 只有在填写了新 apiKey 或非空时才提交
    if (formData.authType === 'api_key' && formData.apiKey?.trim()) {
      payload.apiKey = formData.apiKey.trim()
    } else if (formData.authType === 'none') {
      // 切换为 none 时清空后端凭证
      payload.apiKey = ''
    }

    if (isEdit.value && props.record?.id) {
      payload.version = currentVersion.value ?? props.record.version
      await updateModelConnection(props.record.id, payload)
      message.success('模型连接更新成功')
    } else {
      await createModelConnection(payload)
      message.success('模型连接新增成功')
    }

    emit('update:open', false)
    emit('success')
  } finally {
    confirmLoading.value = false
  }
}

const handleCancel = () => {
  emit('update:open', false)
}
</script>

<style scoped>
.compact-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
