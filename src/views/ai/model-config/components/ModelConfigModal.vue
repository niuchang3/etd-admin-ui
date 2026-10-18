<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑模型配置' : '新增模型配置'"
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
      <a-form-item label="所属模型连接" name="connectionId">
        <a-select
          v-model:value="formData.connectionId"
          show-search
          :filter-option="false"
          placeholder="请选择所属模型连接（支持搜索）"
          :loading="connectionLoading"
          :options="connectionOptions"
          @search="handleConnectionSearch"
          @popup-scroll="handleConnectionPopupScroll"
        >
          <template #notFoundContent>
            <div style="padding: 8px; text-align: center; color: #9ca3af;">
              {{ connectionLoading ? '正在加载连接...' : '未找到相关连接' }}
            </div>
          </template>
        </a-select>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="模型名称" name="modelName">
            <a-input
              v-model:value="formData.modelName"
              placeholder="例如：通义千问 2.5 72B"
              :maxlength="100"
              show-count
              allow-clear
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

      <a-form-item
        label="模型标识 (Model Code)"
        name="modelCode"
        extra="向模型供应商 API 请求时传递的真实模型编码，例如：qwen2.5-72b-instruct"
      >
        <a-input
          v-model:value="formData.modelCode"
          placeholder="例如：qwen-turbo 或 text-embedding-v3"
          :maxlength="200"
          allow-clear
        />
      </a-form-item>

      <a-form-item label="备注说明" name="remark">
        <a-textarea
          v-model:value="formData.remark"
          placeholder="可选输入模型版本、上下文长度或适配说明"
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
  createModelConfig,
  getModelConfig,
  updateModelConfig,
} from '@/apis/ai/config'
import type {
  ModelConfigRecord,
  ModelConfigSaveDTO,
} from '@/apis/ai/config/type'
import { getModelConnectionPage } from '@/apis/ai/connection'
import DictSelect from '@/components/DictSelect.vue'

interface Props {
  open: boolean
  record: ModelConfigRecord | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const confirmLoading = ref(false)

const isEdit = computed(() => Boolean(props.record?.id))

interface FormState {
  connectionId: string
  modelName: string
  modelType: string
  modelCode: string
  remark: string
}

const initialFormState: FormState = {
  connectionId: '',
  modelName: '',
  modelType: '',
  modelCode: '',
  remark: '',
}

const formData = reactive<FormState>({ ...initialFormState })

const rules: Record<string, Rule[]> = {
  connectionId: [{ required: true, message: '请选择所属模型连接', trigger: 'change' }],
  modelName: [
    { required: true, message: '请输入模型名称', trigger: 'blur' },
    { max: 100, message: '模型名称不能超过 100 个字符', trigger: 'blur' },
  ],
  modelType: [{ required: true, message: '请选择模型类型', trigger: 'change' }],
  modelCode: [
    { required: true, message: '请输入模型标识', trigger: 'blur' },
    { max: 200, message: '模型标识不能超过 200 个字符', trigger: 'blur' },
  ],
  remark: [{ max: 500, message: '备注说明不能超过 500 个字符', trigger: 'blur' }],
}

// 模型连接下拉分页与搜索联动
const connectionLoading = ref(false)
const connectionList = ref<{ label: string; value: string }[]>([])
let connectionCurrent = 1
let connectionTotal = 0
let connectionSearchKeyword = ''
let connectionSearchTimer: ReturnType<typeof setTimeout> | null = null

const connectionOptions = computed(() => connectionList.value)

const fetchConnections = async (page = 1, append = false) => {
  connectionLoading.value = true
  try {
    const res = await getModelConnectionPage({
      current: page,
      size: 20,
      keyword: connectionSearchKeyword || undefined,
    })
    const records = res.data?.records || []
    connectionTotal = res.data?.total || 0
    connectionCurrent = page

    const formatted = records.map((item) => ({
      label: `${item.connectionName} (${item.provider})`,
      value: String(item.id),
    }))

    if (append) {
      // 避免重复追加
      const existingIds = new Set(connectionList.value.map((i) => i.value))
      const fresh = formatted.filter((f) => !existingIds.has(f.value))
      connectionList.value = [...connectionList.value, ...fresh]
    } else {
      connectionList.value = formatted
    }
  } catch (err) {
    console.warn('[ModelConfigModal] 加载连接列表失败:', err)
  } finally {
    connectionLoading.value = false
  }
}

const handleConnectionSearch = (val: string) => {
  if (connectionSearchTimer) {
    clearTimeout(connectionSearchTimer)
  }
  connectionSearchTimer = setTimeout(() => {
    connectionSearchKeyword = val?.trim() || ''
    connectionCurrent = 1
    void fetchConnections(1, false)
  }, 300)
}

const handleConnectionPopupScroll = (e: Event) => {
  const target = e.target as HTMLElement | null
  if (target && target.scrollTop + target.offsetHeight >= target.scrollHeight - 10) {
    if (!connectionLoading.value && connectionList.value.length < connectionTotal) {
      void fetchConnections(connectionCurrent + 1, true)
    }
  }
}

const currentVersion = ref<string | number | undefined>(undefined)

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      connectionSearchKeyword = ''
      void fetchConnections(1, false)

      if (props.record?.id) {
        try {
          const res = await getModelConfig(String(props.record.id))
          const detail = res.data
          formData.connectionId = detail.connectionId || ''
          formData.modelName = detail.modelName || ''
          formData.modelType = detail.modelType || ''
          formData.modelCode = detail.modelCode || ''
          formData.remark = detail.remark || ''
          currentVersion.value = detail.version

          // 确保当前编辑项的 connection 存在于选项中
          if (detail.connectionId && !connectionList.value.some((c) => c.value === detail.connectionId)) {
            connectionList.value.unshift({
              label: detail.connectionName || `连接 (${detail.connectionId})`,
              value: detail.connectionId,
            })
          }
        } catch {
          formData.connectionId = props.record.connectionId || ''
          formData.modelName = props.record.modelName || ''
          formData.modelType = props.record.modelType || ''
          formData.modelCode = props.record.modelCode || ''
          formData.remark = props.record.remark || ''
          currentVersion.value = props.record.version
        }
      } else {
        Object.assign(formData, initialFormState)
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
    const payload: ModelConfigSaveDTO = {
      connectionId: formData.connectionId,
      modelName: formData.modelName.trim(),
      modelType: formData.modelType,
      modelCode: formData.modelCode.trim(),
      remark: formData.remark?.trim() ? formData.remark.trim() : (isEdit.value ? null : undefined),
    }

    if (isEdit.value && props.record?.id) {
      payload.version = currentVersion.value ?? props.record.version
      await updateModelConfig(String(props.record.id), payload)
      message.success('模型配置更新成功')
    } else {
      await createModelConfig(payload)
      message.success('模型配置新增成功')
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
