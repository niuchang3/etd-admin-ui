<template>
  <a-modal
    :open="open"
    :title="formState.id ? '编辑事件订阅' : '新增事件订阅'"
    :confirm-loading="saving"
    width="640px"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <!-- 消费组规则提示 -->
    <a-alert
      type="info"
      show-icon
      class="consumer-group-alert"
      message="消费组配置说明"
      description="同一业务应用的多个实例使用同一个 Consumer Group；不同业务应用使用不同订阅和消费组。"
    />

    <a-spin :spinning="detailLoading">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        layout="vertical"
        class="subscription-form"
      >
        <div class="form-grid">
          <a-form-item label="订阅编码" name="subscriptionCode">
            <a-input
              v-model:value="formState.subscriptionCode"
              :disabled="Boolean(formState.id)"
              :maxlength="100"
              show-count
              placeholder="例如：sub.order.created 或 order.item-notify"
            />
            <template #extra>
              <span class="form-item-extra">
                {{ formState.id ? '订阅编码创建后不可修改' : '全局唯一订阅标识，需使用小写字母、数字及中划线，以点分格式分隔' }}
              </span>
            </template>
          </a-form-item>

          <a-form-item label="订阅名称" name="subscriptionName">
            <a-input
              v-model:value="formState.subscriptionName"
              :maxlength="150"
              show-count
              placeholder="请输入订阅名称"
            />
          </a-form-item>

          <a-form-item label="订阅事件类型" name="eventTypeId" class="full-row">
            <a-select
              v-model:value="formState.eventTypeId"
              :options="eventTypeSelectOptions"
              :loading="eventTypesLoading"
              show-search
              option-filter-prop="label"
              placeholder="请选择要订阅的事件类型（必选）"
            />
          </a-form-item>

          <a-form-item label="订阅业务应用" name="subscriberApplication">
            <a-input
              v-model:value="formState.subscriberApplication"
              :maxlength="100"
              show-count
              placeholder="例如：etd-finance-service"
            />
          </a-form-item>

          <a-form-item label="Kafka Topic" name="targetTopic">
            <a-input
              v-model:value="formState.targetTopic"
              :maxlength="250"
              show-count
              placeholder="例如：event-sub-finance-topic"
            />
          </a-form-item>

          <a-form-item label="Consumer Group" name="consumerGroup" class="full-row">
            <a-input
              v-model:value="formState.consumerGroup"
              :maxlength="150"
              show-count
              placeholder="例如：gid-finance-event-consumer"
            />
          </a-form-item>

          <a-form-item label="订阅描述" name="description" class="full-row">
            <a-textarea
              v-model:value="formState.description"
              :maxlength="500"
              :rows="2"
              show-count
              placeholder="请输入订阅业务用途或消费逻辑说明"
            />
          </a-form-item>
        </div>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import {
  createEventSubscription,
  getEventSubscriptionDetail,
  updateEventSubscription,
} from '@/apis/event/subscription'
import type {
  EventSubscriptionCreateForm,
  EventSubscriptionRecord,
  EventSubscriptionUpdateDTO,
} from '@/apis/event/subscription/type'
import { getEventTypeOptions } from '@/apis/event/type'
import type { EventTypeOption } from '@/apis/event/type/type'

const props = defineProps<{
  open: boolean
  record: EventSubscriptionRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const detailLoading = ref(false)
const eventTypesLoading = ref(false)
const eventTypeOptions = ref<EventTypeOption[]>([])

interface SubscriptionFormState {
  id?: string
  subscriptionCode: string
  subscriptionName: string
  eventTypeId: string
  subscriberApplication: string
  targetTopic: string
  consumerGroup: string
  description?: string
  version: number
}

const emptyForm = (): SubscriptionFormState => ({
  id: undefined,
  subscriptionCode: '',
  subscriptionName: '',
  eventTypeId: '',
  subscriberApplication: '',
  targetTopic: '',
  consumerGroup: '',
  description: '',
  version: 0,
})

const formState = reactive<SubscriptionFormState>(emptyForm())

// 加载事件类型下拉选项
const loadEventTypeOptions = async () => {
  eventTypesLoading.value = true
  try {
    const res = await getEventTypeOptions()
    eventTypeOptions.value = res.data || []
  } catch {
    eventTypeOptions.value = []
  } finally {
    eventTypesLoading.value = false
  }
}

const eventTypeSelectOptions = computed(() => {
  return eventTypeOptions.value.map((item) => {
    const val = item.id || item.value || ''
    const label = item.eventName
      ? `${item.eventName} (${item.eventType})`
      : item.label || item.eventType || val
    return {
      value: val,
      label,
    }
  })
})

// 严格对齐后端 @Pattern(regexp = "^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$")
const subscriptionCodeRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/

const formRules: Record<string, Rule[]> = {
  subscriptionCode: [
    { required: true, whitespace: true, message: '请输入订阅编码', trigger: 'blur' },
    { max: 100, message: '订阅编码不能超过 100 个字符', trigger: 'blur' },
    {
      validator: async (_rule, value: string) => {
        if (!value) return
        const val = value.trim()
        if (!subscriptionCodeRegex.test(val)) {
          throw new Error('格式需为小写点分命名，例如：sub.order.created 或 order.item-notify')
        }
      },
      trigger: 'blur',
    },
  ],
  subscriptionName: [
    { required: true, whitespace: true, message: '请输入订阅名称', trigger: 'blur' },
    { max: 150, message: '订阅名称不能超过 150 个字符', trigger: 'blur' },
  ],
  eventTypeId: [{ required: true, message: '请选择订阅的事件类型', trigger: 'change' }],
  subscriberApplication: [
    { required: true, whitespace: true, message: '请输入订阅业务应用', trigger: 'blur' },
    { max: 100, message: '订阅应用不能超过 100 个字符', trigger: 'blur' },
  ],
  targetTopic: [
    { required: true, whitespace: true, message: '请输入 Kafka Topic', trigger: 'blur' },
    { max: 250, message: 'Topic 不能超过 250 个字符', trigger: 'blur' },
  ],
  consumerGroup: [
    { required: true, whitespace: true, message: '请输入 Consumer Group', trigger: 'blur' },
    { max: 150, message: 'Consumer Group 不能超过 150 个字符', trigger: 'blur' },
  ],
  description: [{ max: 500, message: '描述不能超过 500 个字符', trigger: 'blur' }],
}

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    void loadEventTypeOptions()
    if (props.record) {
      detailLoading.value = true
      try {
        const res = await getEventSubscriptionDetail(props.record.id)
        const d = res.data || props.record
        Object.assign(formState, {
          id: d.id,
          subscriptionCode: d.subscriptionCode,
          subscriptionName: d.subscriptionName,
          eventTypeId: d.eventTypeId,
          subscriberApplication: d.subscriberApplication,
          targetTopic: d.targetTopic,
          consumerGroup: d.consumerGroup,
          description: d.description || '',
          version: typeof d.version === 'number' ? d.version : 0,
        })
      } catch {
        Object.assign(formState, {
          id: props.record.id,
          subscriptionCode: props.record.subscriptionCode,
          subscriptionName: props.record.subscriptionName,
          eventTypeId: props.record.eventTypeId,
          subscriberApplication: props.record.subscriberApplication,
          targetTopic: props.record.targetTopic,
          consumerGroup: props.record.consumerGroup,
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
      const updateData: EventSubscriptionUpdateDTO = {
        content: {
          subscriptionCode: formState.subscriptionCode.trim(),
          subscriptionName: formState.subscriptionName.trim(),
          eventTypeId: formState.eventTypeId,
          subscriberApplication: formState.subscriberApplication.trim(),
          targetTopic: formState.targetTopic.trim(),
          consumerGroup: formState.consumerGroup.trim(),
          description: formState.description?.trim() || null,
        },
        version: formState.version,
      }
      await updateEventSubscription(formState.id, updateData)
      message.success('事件订阅更新成功')
    } else {
      const createData: EventSubscriptionCreateForm = {
        subscriptionCode: formState.subscriptionCode.trim(),
        subscriptionName: formState.subscriptionName.trim(),
        eventTypeId: formState.eventTypeId,
        subscriberApplication: formState.subscriberApplication.trim(),
        targetTopic: formState.targetTopic.trim(),
        consumerGroup: formState.consumerGroup.trim(),
        description: formState.description?.trim() || null,
      }
      await createEventSubscription(createData)
      message.success('新增事件订阅成功')
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
.consumer-group-alert {
  margin-bottom: var(--du-space-3, 12px);
}

.subscription-form {
  padding-top: var(--du-space-1, 4px);
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
