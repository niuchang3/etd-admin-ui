<template>
  <a-modal
    :open="open"
    :title="formState.id ? '编辑事件类型' : '新增事件类型'"
    :confirm-loading="saving"
    width="580px"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <a-spin :spinning="detailLoading">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        layout="vertical"
        class="event-type-form"
      >
        <div class="form-grid">
          <a-form-item label="事件类型编码" name="eventType" class="full-row">
            <a-input
              v-model:value="formState.eventType"
              :disabled="Boolean(formState.id)"
              :maxlength="150"
              show-count
              placeholder="小写点分格式，例如：upms.user.created 或 order.item-added"
            />
            <template #extra>
              <span class="form-item-extra">
                {{ formState.id ? '事件类型编码创建后不可修改' : '用于唯一标识事件协议，需使用小写字母、数字及中划线，以点分格式分隔' }}
              </span>
            </template>
          </a-form-item>

          <a-form-item label="事件名称" name="eventName">
            <a-input
              v-model:value="formState.eventName"
              :maxlength="150"
              show-count
              placeholder="请输入事件人类可读名称"
            />
          </a-form-item>

          <a-form-item label="来源应用" name="sourceApplication">
            <a-input
              v-model:value="formState.sourceApplication"
              :maxlength="100"
              show-count
              placeholder="例如：etd-upms-service"
            />
          </a-form-item>

          <a-form-item label="最新协议版本" name="latestVersion" class="full-row">
            <a-input-number
              v-model:value="formState.latestVersion"
              :min="1"
              :precision="0"
              style="width: 100%"
              placeholder="整数协议版本，例如：1"
            />
          </a-form-item>

          <a-form-item label="事件描述" name="description" class="full-row">
            <a-textarea
              v-model:value="formState.description"
              :maxlength="500"
              :rows="3"
              show-count
              placeholder="简要说明该事件的触发时机与业务语义"
            />
          </a-form-item>
        </div>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { createEventType, getEventTypeDetail, updateEventType } from '@/apis/event/type'
import type { EventTypeCreateForm, EventTypeRecord, EventTypeUpdateDTO } from '@/apis/event/type/type'

const props = defineProps<{
  open: boolean
  record: EventTypeRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const detailLoading = ref(false)

interface EventTypeFormState {
  id?: string
  eventType: string
  eventName: string
  sourceApplication: string
  latestVersion: number
  description?: string
  version: number
}

const emptyForm = (): EventTypeFormState => ({
  id: undefined,
  eventType: '',
  eventName: '',
  sourceApplication: '',
  latestVersion: 1,
  description: '',
  version: 0,
})

const formState = reactive<EventTypeFormState>(emptyForm())

// 严格对齐后端 @Pattern(regexp = "^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$")
const eventTypeCodeRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/

const formRules: Record<string, Rule[]> = {
  eventType: [
    { required: true, whitespace: true, message: '请输入事件类型编码', trigger: 'blur' },
    { max: 150, message: '事件类型编码不能超过 150 个字符', trigger: 'blur' },
    {
      validator: async (_rule, value: string) => {
        if (!value) return
        const val = value.trim()
        if (!eventTypeCodeRegex.test(val)) {
          throw new Error('格式需为小写点分命名，例如：upms.user.created')
        }
      },
      trigger: 'blur',
    },
  ],
  eventName: [
    { required: true, whitespace: true, message: '请输入事件名称', trigger: 'blur' },
    { max: 150, message: '事件名称不能超过 150 个字符', trigger: 'blur' },
  ],
  sourceApplication: [
    { required: true, whitespace: true, message: '请输入来源应用编码', trigger: 'blur' },
    { max: 100, message: '来源应用不能超过 100 个字符', trigger: 'blur' },
  ],
  latestVersion: [
    { required: true, message: '请输入最新协议版本', trigger: 'change' },
    {
      type: 'number',
      min: 1,
      message: '事件协议版本不能小于 1',
      trigger: 'change',
    },
  ],
  description: [{ max: 500, message: '描述不能超过 500 个字符', trigger: 'blur' }],
}

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    if (props.record) {
      detailLoading.value = true
      try {
        // 编辑前重新查询最新详情，确保获取服务端最新 version 避免并发冲突
        const res = await getEventTypeDetail(props.record.id)
        const d = res.data || props.record
        Object.assign(formState, {
          id: d.id,
          eventType: d.eventType,
          eventName: d.eventName,
          sourceApplication: d.sourceApplication,
          latestVersion: typeof d.latestVersion === 'number' ? d.latestVersion : 1,
          description: d.description || '',
          version: typeof d.version === 'number' ? d.version : 0,
        })
      } catch {
        Object.assign(formState, {
          id: props.record.id,
          eventType: props.record.eventType,
          eventName: props.record.eventName,
          sourceApplication: props.record.sourceApplication,
          latestVersion: typeof props.record.latestVersion === 'number' ? props.record.latestVersion : 1,
          description: props.record.description || '',
          version: typeof props.record.version === 'number' ? props.record.version : 0,
        })
      } finally {
        detailLoading.value = false
      }
    } else {
      Object.assign(formState, emptyForm())
    }
  }
)

const onOpenChange = (val: boolean) => {
  emit('update:open', val)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (formState.id) {
      const updateData: EventTypeUpdateDTO = {
        content: {
          eventType: formState.eventType.trim(),
          eventName: formState.eventName.trim(),
          sourceApplication: formState.sourceApplication.trim(),
          latestVersion: Number(formState.latestVersion),
          description: formState.description?.trim() || null,
        },
        version: formState.version,
      }
      await updateEventType(formState.id, updateData)
      message.success('事件类型更新成功')
    } else {
      const createData: EventTypeCreateForm = {
        eventType: formState.eventType.trim(),
        eventName: formState.eventName.trim(),
        sourceApplication: formState.sourceApplication.trim(),
        latestVersion: Number(formState.latestVersion),
        description: formState.description?.trim() || null,
      }
      await createEventType(createData)
      message.success('新增事件类型成功')
    }
    emit('update:open', false)
    emit('success')
  } catch (err: any) {
    if (err?.message?.includes('并发') || err?.message?.includes('冲突') || err?.message?.includes('version')) {
      message.error('数据已被他人更新，请刷新重试')
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.event-type-form {
  padding-top: var(--du-space-2, 8px);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 var(--du-space-4, 16px);
}

.full-row {
  grid-column: span 2;
}

.form-item-extra {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-tertiary, #8c8c8c);
  line-height: 1.4;
  margin-top: 2px;
  display: block;
}
</style>
