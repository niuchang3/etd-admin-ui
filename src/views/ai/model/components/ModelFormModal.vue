<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑模型' : '新增模型'"
    :confirm-loading="confirmLoading"
    :mask-closable="false"
    :width="640"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        layout="vertical"
        class="compact-form"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="服务商" name="providerCode">
              <DictSelect
                v-model:value="formData.providerCode"
                type-code="ai_model_provider"
                placeholder="请选择服务商"
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="模型类型" name="modelType">
              <DictSelect
                v-model:value="formData.modelType"
                type-code="ai_model_type"
                placeholder="请选择模型类型"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="模型名称" name="modelName">
              <a-input
                v-model:value="formData.modelName"
                placeholder="例如：通义千问 Plus"
                :maxlength="100"
                show-count
                allow-clear
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="实际调用代码" name="modelCode">
              <a-input
                v-model:value="formData.modelCode"
                placeholder="例如：qwen-plus"
                :maxlength="200"
                show-count
                allow-clear
                class="du-mono"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="显示排序" name="sort">
              <a-input-number
                v-model:value="formData.sort"
                :min="0"
                :precision="0"
                placeholder="数值越小越靠前"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="启用状态" name="dataStatus">
              <a-radio-group v-model:value="formData.dataStatus">
                <a-radio :value="1">启用</a-radio>
                <a-radio :value="0">停用</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 仅向量模型 (embedding) 允许配置支持维度 -->
        <a-form-item
          v-if="formData.modelType === 'embedding'"
          label="支持维度"
          name="embedding"
          extra="请从字典中选择该模型实际支持的输出维度"
          required
        >
          <a-select
            v-model:value="formData.embedding"
            mode="multiple"
            :options="embeddingDimensionOptions"
            placeholder="请选择模型支持的向量维度"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="Logo 资源路径" name="logoPath">
          <div class="logo-input-wrapper">
            <a-input
              v-model:value="formData.logoPath"
              placeholder="请输入 Logo 图片 URL 地址（选填）"
              :maxlength="1000"
              allow-clear
            />
            <div v-if="formData.logoPath" class="logo-preview-box">
              <img
                :src="formData.logoPath"
                alt="logo"
                class="logo-preview-img"
                @error="handleLogoPreviewError"
              />
            </div>
          </div>
        </a-form-item>

        <a-form-item label="模型介绍" name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入模型能力特点与适用场景介绍（选填）"
            :maxlength="1000"
            :rows="3"
            show-count
            allow-clear
          />
        </a-form-item>

        <a-form-item label="服务地址说明" name="baseUrlHelp">
          <a-textarea
            v-model:value="formData.baseUrlHelp"
            placeholder="指导用户在配置连接器时如何填写实际服务地址（选填）"
            :maxlength="1000"
            :rows="2"
            show-count
            allow-clear
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="密钥获取入口链接" name="apiKeyUrl">
              <a-input
                v-model:value="formData.apiKeyUrl"
                placeholder="例如：https://dashscope.console.aliyun.com/apiKey"
                :maxlength="1000"
                allow-clear
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="接入指南文档链接" name="setupGuideUrl">
              <a-input
                v-model:value="formData.setupGuideUrl"
                placeholder="例如：https://help.aliyun.com/document_detail/..."
                :maxlength="1000"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { createModel, getModel, updateModel } from '@/apis/ai/model'
import type {
  ModelCreateDTO,
  ModelRecord,
  ModelUpdateDTO,
} from '@/apis/ai/model/type'
import DictSelect from '@/components/DictSelect.vue'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE } from '@/constant'

interface Props {
  open: boolean
  record: ModelRecord | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const { getOptions } = useSystemDict([AI_DICT_TYPE.EMBEDDING_DIMENSION])

/** 从字典 ai_embedding_dimension 动态加载向量维度可选项 */
const embeddingDimensionOptions = computed(() => {
  return getOptions<number>(AI_DICT_TYPE.EMBEDDING_DIMENSION, Number)
})

const formRef = ref<FormInstance>()
const loading = ref(false)
const confirmLoading = ref(false)
const currentVersion = ref<string | number | undefined>(undefined)

const isEdit = computed(() => Boolean(props.record?.id))

interface FormState {
  providerCode: string
  modelName: string
  modelCode: string
  modelType: string
  sort: number
  logoPath: string
  description: string
  apiKeyUrl: string
  setupGuideUrl: string
  baseUrlHelp: string
  embedding: number[] | null
  dataStatus: number
}

const initialFormState: FormState = {
  providerCode: '',
  modelName: '',
  modelCode: '',
  modelType: '',
  sort: 0,
  logoPath: '',
  description: '',
  apiKeyUrl: '',
  setupGuideUrl: '',
  baseUrlHelp: '',
  embedding: null,
  dataStatus: 1,
}

const formData = reactive<FormState>({ ...initialFormState })

/** 切换到非向量模型时，将 embedding 置为 null 并清除校验提示；切回向量模型时初始化为数组 */
watch(
  () => formData.modelType,
  (newType) => {
    if (newType !== 'embedding') {
      formData.embedding = null
      formRef.value?.clearValidate('embedding')
    } else if (formData.embedding === null) {
      formData.embedding = []
    }
  }
)

/** 校验 HTTP / HTTPS 链接格式 */
const validateUrl = async (_rule: Rule, value: string) => {
  if (!value || !value.trim()) {
    return Promise.resolve()
  }
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return Promise.reject(new Error('链接必须以 http:// 或 https:// 开头'))
  }
  try {
    new URL(trimmed)
  } catch {
    return Promise.reject(new Error('请输入合法的 URL 格式'))
  }
  return Promise.resolve()
}

const rules: Record<string, Rule[]> = {
  providerCode: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  modelName: [
    { required: true, message: '请输入模型名称', trigger: 'blur' },
    { max: 100, message: '模型名称不能超过 100 个字符', trigger: 'blur' },
  ],
  modelCode: [
    { required: true, message: '请输入实际调用代码', trigger: 'blur' },
    { max: 200, message: '实际调用代码不能超过 200 个字符', trigger: 'blur' },
  ],
  modelType: [{ required: true, message: '请选择模型类型', trigger: 'change' }],
  sort: [
    { required: true, message: '请输入显示排序', trigger: 'blur' },
    {
      validator: async (_rule: Rule, value: number) => {
        if (value < 0) {
          return Promise.reject(new Error('排序值必须为非负整数'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  embedding: [
    {
      validator: async (_rule: Rule, value: unknown) => {
        if (formData.modelType === 'embedding') {
          if (!Array.isArray(value) || value.length === 0) {
            return Promise.reject(new Error('请配置支持的向量维度（至少填写一个维度）'))
          }
          const seen = new Set<number>()
          for (const item of value) {
            if (item === null || item === undefined || item === '') {
              return Promise.reject(new Error('向量维度不能为空元素'))
            }
            const num = Number(item)
            if (Number.isNaN(num) || !Number.isInteger(num)) {
              return Promise.reject(new Error(`向量维度必须为正整数：${item}`))
            }
            if (num <= 0) {
              return Promise.reject(new Error(`向量维度必须为大于 0 的正整数：${num}`))
            }
            if (seen.has(num)) {
              return Promise.reject(new Error(`向量维度存在重复值：${num}`))
            }
            seen.add(num)
          }
        }
        return Promise.resolve()
      },
      trigger: ['change', 'blur'],
    },
  ],
  logoPath: [{ max: 1000, message: 'Logo 路径不能超过 1000 个字符', trigger: 'blur' }],
  description: [{ max: 1000, message: '模型介绍不能超过 1000 个字符', trigger: 'blur' }],
  baseUrlHelp: [{ max: 1000, message: '地址说明不能超过 1000 个字符', trigger: 'blur' }],
  apiKeyUrl: [
    { validator: validateUrl, trigger: 'blur' },
    { max: 1000, message: '密钥链接不能超过 1000 个字符', trigger: 'blur' },
  ],
  setupGuideUrl: [
    { validator: validateUrl, trigger: 'blur' },
    { max: 1000, message: '指南链接不能超过 1000 个字符', trigger: 'blur' },
  ],
  dataStatus: [{ required: true, message: '请选择启用状态', trigger: 'change' }],
}

const cleanText = (val: string | undefined | null): string | null => {
  const trimmed = val?.trim()
  return trimmed ? trimmed : null
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      if (props.record?.id) {
        loading.value = true
        try {
          // 编辑前获取最新数据，不直接使用可能过期的列表记录
          const res = await getModel(props.record.id)
          const detail = res.data
          formData.providerCode = detail.providerCode || ''
          formData.modelName = detail.modelName || ''
          formData.modelCode = detail.modelCode || ''
          formData.modelType = detail.modelType || ''
          formData.sort = detail.sort ?? 0
          formData.logoPath = detail.logoPath || ''
          formData.description = detail.description || ''
          formData.apiKeyUrl = detail.apiKeyUrl || ''
          formData.setupGuideUrl = detail.setupGuideUrl || ''
          formData.baseUrlHelp = detail.baseUrlHelp || ''
          formData.embedding =
            detail.modelType === 'embedding' && Array.isArray(detail.embedding)
              ? detail.embedding.map(Number)
              : detail.modelType === 'embedding'
                ? []
                : null
          formData.dataStatus = detail.dataStatus ?? 1
          currentVersion.value = detail.version
        } catch {
          // 降级回退并保留内容
          formData.providerCode = props.record.providerCode || ''
          formData.modelName = props.record.modelName || ''
          formData.modelCode = props.record.modelCode || ''
          formData.modelType = props.record.modelType || ''
          formData.sort = props.record.sort ?? 0
          formData.logoPath = props.record.logoPath || ''
          formData.description = props.record.description || ''
          formData.apiKeyUrl = props.record.apiKeyUrl || ''
          formData.setupGuideUrl = props.record.setupGuideUrl || ''
          formData.baseUrlHelp = props.record.baseUrlHelp || ''
          formData.embedding =
            props.record.modelType === 'embedding' && Array.isArray(props.record.embedding)
              ? props.record.embedding.map(Number)
              : props.record.modelType === 'embedding'
                ? []
                : null
          formData.dataStatus = props.record.dataStatus ?? 1
          currentVersion.value = props.record.version
        } finally {
          loading.value = false
        }
      } else {
        Object.assign(formData, initialFormState)
        formData.embedding = formData.modelType === 'embedding' ? [] : null
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
    const isEmbedding = formData.modelType === 'embedding'
    const embeddingList =
      isEmbedding && Array.isArray(formData.embedding) && formData.embedding.length > 0
        ? Array.from(new Set(formData.embedding.map((v) => Number(v))))
        : null

    if (isEdit.value && props.record?.id) {
      if (currentVersion.value === undefined || currentVersion.value === null) {
        message.error('版本号丢失，请重新打开弹窗刷新数据')
        return
      }
      const updateDto: ModelUpdateDTO = {
        providerCode: formData.providerCode,
        modelName: formData.modelName.trim(),
        modelCode: formData.modelCode.trim(),
        modelType: formData.modelType,
        sort: Number(formData.sort) || 0,
        logoPath: cleanText(formData.logoPath),
        description: cleanText(formData.description),
        apiKeyUrl: cleanText(formData.apiKeyUrl),
        setupGuideUrl: cleanText(formData.setupGuideUrl),
        baseUrlHelp: cleanText(formData.baseUrlHelp),
        embedding: embeddingList,
        dataStatus: formData.dataStatus,
        version: currentVersion.value,
      }
      await updateModel(props.record.id, updateDto)
      message.success('模型更新成功')
    } else {
      const createDto: ModelCreateDTO = {
        providerCode: formData.providerCode,
        modelName: formData.modelName.trim(),
        modelCode: formData.modelCode.trim(),
        modelType: formData.modelType,
        sort: Number(formData.sort) || 0,
        logoPath: cleanText(formData.logoPath),
        description: cleanText(formData.description),
        apiKeyUrl: cleanText(formData.apiKeyUrl),
        setupGuideUrl: cleanText(formData.setupGuideUrl),
        baseUrlHelp: cleanText(formData.baseUrlHelp),
        embedding: embeddingList,
        dataStatus: formData.dataStatus,
      }
      await createModel(createDto)
      message.success('模型创建成功')
    }
    emit('update:open', false)
    emit('success')
  } catch (err: unknown) {
    // 接口失败时保留表单内容，避免清空
  } finally {
    confirmLoading.value = false
  }
}

const handleCancel = () => {
  emit('update:open', false)
}

const handleLogoPreviewError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.style.display = 'none'
}
</script>

<style scoped>
.logo-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-preview-box {
  width: 32px;
  height: 32px;
  border-radius: var(--du-border-radius-base, 4px);
  border: 1px solid var(--du-color-border-secondary, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--du-color-fill-quaternary, #f9fafb);
  flex-shrink: 0;
}

.logo-preview-img {
  max-width: 24px;
  max-height: 24px;
  object-fit: contain;
}
</style>
