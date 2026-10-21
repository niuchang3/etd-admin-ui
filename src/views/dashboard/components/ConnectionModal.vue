<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑模型连接' : '接入模型连接'"
    :confirm-loading="submitLoading"
    :destroy-on-close="true"
    :width="560"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      class="compact-form"
    >
      <!-- 锁定的所属模型信息（只读展示） -->
      <a-form-item label="所属模型">
        <div class="locked-model-card">
          <div class="model-info-row">
            <span class="model-name-text">{{ model?.modelName }}</span>
            <span class="model-code-badge du-mono">{{ model?.modelCode }}</span>
          </div>
          <div class="model-meta-row">
            <span class="provider-tag">{{ providerDisplayName }}</span>
            <DictTag type-code="ai_model_type" :value="model?.modelType || ''" />
            <span class="lock-tip-text">（连接已与该模型强制绑定）</span>
          </div>
        </div>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <!-- 接入协议 -->
          <a-form-item label="接入协议" name="protocol">
            <DictSelect
              v-model:value="formData.protocol"
              type-code="ai_model_protocol"
              placeholder="请选择接入协议"
            />
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <!-- 认证方式 -->
          <a-form-item label="认证方式" name="authType">
            <DictSelect
              v-model:value="formData.authType"
              type-code="ai_model_auth_type"
              placeholder="请选择认证方式"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 服务基础地址 -->
      <a-form-item
        label="服务地址 (Base URL)"
        name="baseUrl"
        :extra="model?.baseUrlHelp || '示例：https://api.openai.com/v1 或内网推理端点'"
      >
        <a-input
          v-model:value="formData.baseUrl"
          placeholder="请输入完整 API 服务端点，如 https://api.deepseek.com/v1"
          allow-clear
        />
      </a-form-item>

      <!-- API Key 凭据 -->
      <a-form-item
        label="API Key"
        name="apiKey"
        :extra="
          isEdit
            ? '密钥已被安全加密保存，不回显明文。若无需更换密钥请留空。'
            : model?.apiKeyUrl
              ? '请输入访问该模型所需的凭证'
              : undefined
        "
      >
        <a-input-password
          v-model:value="formData.apiKey"
          :placeholder="isEdit ? '留空表示保留原密钥，输入新值将覆盖' : '请输入 API Key / 访问令牌'"
          allow-clear
          autocomplete="new-password"
        />
        <div v-if="model?.apiKeyUrl" class="doc-link-hint">
          <span>暂无 API Key？</span>
          <a :href="model.apiKeyUrl" target="_blank" rel="noopener noreferrer">
            前往服务商平台获取 ↗
          </a>
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { createSquareConnection, updateSquareConnection } from '@/apis/ai/square'
import type {
  SquareConnectionCreateDTO,
  SquareConnectionRecord,
  SquareConnectionUpdateDTO,
  SquareModelRecord,
} from '@/apis/ai/square/type'
import DictSelect from '@/components/DictSelect.vue'
import DictTag from '@/components/DictTag.vue'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE } from '@/constant'
import { BRAND_DISPLAY_NAME_MAP } from '../types'

const props = defineProps<{
  open: boolean
  model: SquareModelRecord | null
  connection: SquareConnectionRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const { getLabel: getDictLabel } = useSystemDict([AI_DICT_TYPE.MODEL_PROVIDER])

const formRef = ref<FormInstance>()
const submitLoading = ref(false)

const isEdit = computed(() => Boolean(props.connection?.id))

const providerDisplayName = computed(() => {
  if (!props.model?.providerCode) return '服务商'
  const code = props.model.providerCode.toLowerCase().trim()
  return (
    BRAND_DISPLAY_NAME_MAP[code] ||
    getDictLabel(AI_DICT_TYPE.MODEL_PROVIDER, code) ||
    props.model.providerCode
  )
})

interface FormState {
  protocol: string
  baseUrl: string
  authType: string
  apiKey: string
}

const formData = reactive<FormState>({
  protocol: '',
  baseUrl: '',
  authType: '',
  apiKey: '',
})

const formRules: Record<string, Rule[]> = {
  protocol: [{ required: true, message: '请选择接入协议', trigger: 'change' }],
  baseUrl: [
    { required: true, message: '请输入服务地址', trigger: 'blur' },
    {
      validator: async (_rule, value: string) => {
        if (!value) return
        const trimmed = value.trim()
        if (!/^https?:\/\//i.test(trimmed)) {
          return Promise.reject(new Error('服务地址必须以 http:// 或 https:// 开头'))
        }
      },
      trigger: 'blur',
    },
  ],
  authType: [{ required: true, message: '请选择认证方式', trigger: 'change' }],
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      if (props.connection) {
        // 编辑连接模式
        formData.protocol = props.connection.protocol || ''
        formData.baseUrl = props.connection.baseUrl || ''
        formData.authType = props.connection.authType || ''
        formData.apiKey = '' // 编辑不回显
      } else {
        // 新增接入模式
        formData.protocol = 'openai'
        formData.baseUrl = props.model?.baseUrlHelp || ''
        formData.authType = 'bearer'
        formData.apiKey = ''
      }
    } else {
      formRef.value?.resetFields()
    }
  }
)

const handleCancel = () => {
  emit('update:open', false)
}

const handleSubmit = async () => {
  if (!formRef.value || !props.model?.id) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitLoading.value = true
  try {
    if (isEdit.value && props.connection) {
      const updatePayload: SquareConnectionUpdateDTO = {
        modelId: String(props.connection.modelId || props.model.id),
        protocol: formData.protocol,
        baseUrl: formData.baseUrl.trim(),
        authType: formData.authType,
        version: props.connection.version,
      }
      if (formData.apiKey.trim()) {
        updatePayload.apiKey = formData.apiKey.trim()
      }
      await updateSquareConnection(String(props.connection.id), updatePayload)
      message.success('修改模型连接成功')
    } else {
      const createPayload: SquareConnectionCreateDTO = {
        modelId: String(props.model.id),
        protocol: formData.protocol,
        baseUrl: formData.baseUrl.trim(),
        authType: formData.authType,
      }
      if (formData.apiKey.trim()) {
        createPayload.apiKey = formData.apiKey.trim()
      }
      await createSquareConnection(createPayload)
      message.success('接入模型连接成功')
    }

    emit('update:open', false)
    emit('success')
  } catch {
    // 拦截器已处理错误提示
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.compact-form :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.locked-model-card {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-name-text {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.model-code-badge {
  font-size: 11px;
  color: #475569;
  background-color: #e2e8f0;
  padding: 1px 6px;
  border-radius: 4px;
}

.model-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}

.provider-tag {
  color: #2563eb;
  font-weight: 500;
}

.lock-tip-text {
  color: #94a3b8;
  font-size: 11px;
}

.doc-link-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.doc-link-hint a {
  color: #2563eb;
  text-decoration: none;
}

.doc-link-hint a:hover {
  text-decoration: underline;
}
</style>
