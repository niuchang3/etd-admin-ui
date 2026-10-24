<template>
  <a-drawer
    :open="open"
    title="调整分片参数"
    placement="right"
    :width="640"
    :mask-closable="!loading"
    class="chunk-parameters-drawer"
    @update:open="$emit('update:open', $event)"
  >
    <div class="drawer-body">
      <a-alert
        message="提示：修改参数不会自动重新生成分片。点击下方“重新生成”后，成功将替换现有分片及人工修改，失败时保留原有分片。"
        type="info"
        show-icon
        class="param-drawer-alert"
      />
      <ChunkParametersForm
        :model-value="formModel"
        :file-type="fileType"
        :disabled="loading"
      />
    </div>

    <template #footer>
      <div class="drawer-footer-actions">
        <a-button :disabled="loading" @click="handleCancel">取消</a-button>
        <a-popconfirm
          title="重新生成将使用新参数替换现有分片及所有修改（生成失败将保留原有分片）。确定要重新生成吗？"
          ok-text="确认重新生成"
          cancel-text="取消"
          :disabled="loading || !canWrite"
          @confirm="handleConfirmRegenerate"
        >
          <a-button
            type="primary"
            :loading="loading"
            :disabled="!canWrite"
          >
            应用并重新生成
          </a-button>
        </a-popconfirm>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ChunkParametersForm from './ChunkParametersForm.vue'
import type { ChunkFormState } from '../helper'

const props = defineProps<{
  open: boolean
  form: ChunkFormState
  fileType?: string | null
  loading?: boolean
  canWrite?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  regenerate: [form: ChunkFormState]
}>()

const formModel = ref<ChunkFormState>({ ...props.form })

watch(
  () => props.open,
  (val) => {
    if (val) {
      // 深度拷贝外部当前参数，避免修改未提交直接污染
      formModel.value = JSON.parse(JSON.stringify(props.form))
    }
  }
)

const handleCancel = () => {
  emit('update:open', false)
}

const handleConfirmRegenerate = () => {
  emit('regenerate', formModel.value)
}
</script>

<style scoped>
.chunk-parameters-drawer :deep(.ant-drawer-header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--du-border-subtle, #e2e8f0);
}

.chunk-parameters-drawer :deep(.ant-drawer-title) {
  font-size: var(--du-font-size-md, 13px);
  font-weight: 600;
  color: var(--du-text-primary, #0f172a);
}

.chunk-parameters-drawer :deep(.ant-drawer-body) {
  padding: 16px;
  background: var(--du-bg-app, #f1f5f9);
}

.param-drawer-alert {
  margin-bottom: 12px;
  font-size: var(--du-font-size-xs, 11px);
}

.drawer-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
