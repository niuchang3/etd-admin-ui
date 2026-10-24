<template>
  <a-modal
    :open="open"
    :title="moveOnly ? '移动资料' : '编辑资料'"
    :width="560"
    :confirm-loading="confirmLoading"
    :ok-button-props="{ disabled: loading || !formData || !canWrite || record?.writable === false }"
    :mask-closable="false"
    :closable="!confirmLoading"
    :cancel-button-props="{ disabled: confirmLoading }"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-alert v-if="loadFailed" type="error" message="详情加载失败，请关闭后重新打开" show-icon />
      <a-form
        v-if="formData"
        ref="formRef"
        :model="formData"
        :rules="rules"
        :disabled="!canWrite || confirmLoading || record?.writable === false"
        layout="vertical"
      >
        <a-alert
          v-if="moveOnly"
          type="info"
          message="移动仅改变分类目录，资料的数据归属部门保持不变。"
          show-icon
          style="margin-bottom: var(--du-space-3);"
        />
        <a-form-item label="分类目录" name="folderId">
          <a-tree-select
            v-model:value="formData.folderId"
            :tree-data="folderTree"
            tree-default-expand-all
            :dropdown-style="{ maxHeight: '360px', overflow: 'auto' }"
            placeholder="请选择可写目录"
          />
        </a-form-item>
        <template v-if="!moveOnly">
          <a-form-item label="资料名称" name="documentName">
            <a-input
              v-model:value="formData.documentName"
              :maxlength="255"
              placeholder="请输入资料名称"
              allow-clear
            />
          </a-form-item>
          <a-form-item label="用途说明" name="description">
            <a-textarea
              v-model:value="formData.description"
              :maxlength="1000"
              :rows="3"
              show-count
              placeholder="用途说明（可选）"
            />
          </a-form-item>
          <a-form-item label="租户内共享" name="isPublic">
            <div class="switch-row">
              <a-switch
                v-model:checked="formData.isPublic"
                checked-children="共享"
                un-checked-children="私有"
                :disabled="!canWrite || confirmLoading"
              />
              <span class="switch-desc">
                {{ formData.isPublic ? '已开启跨部门共享，租户内其他成员可查看与下载' : '仅资料所属部门及有权限人员可见' }}
              </span>
            </div>
          </a-form-item>
        </template>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { menusStore } from '@/stores/modules/user'
import { getKnowledgeDocument, updateKnowledgeDocument } from '@/apis/ai/document'
import type {
  KnowledgeDocumentFolder,
  KnowledgeDocumentRecord,
  KnowledgeDocumentSaveDTO,
} from '@/apis/ai/document/type'
import { canUseFolder, getDocumentSaveDTO, getFolderTree } from '../helper'

const props = defineProps<{
  open: boolean
  record: KnowledgeDocumentRecord | null
  folders: KnowledgeDocumentFolder[]
  moveOnly: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const route = useRoute()
const canWrite = computed(() => menusStore().canWritePath(route.path))
const formRef = ref<FormInstance>()
const formData = ref<KnowledgeDocumentSaveDTO | null>(null)
const loading = ref(false)
const loadFailed = ref(false)
const confirmLoading = ref(false)

const folderTree = computed(() => getFolderTree(props.folders, true))

const rules: Record<string, Rule[]> = {
  folderId: [
    {
      required: true,
      validator: async () => {
        if (!canUseFolder(props.folders.find((folder) => folder.id === formData.value?.folderId))) {
          throw new Error('请选择可写的有效目录')
        }
      },
    },
  ],
  documentName: [
    { required: true, whitespace: true, max: 255, message: '请输入资料名称（最多255字）' },
  ],
  description: [{ max: 1000, message: '用途说明不能超过1000字' }],
}

let requestToken = 0

watch(
  () => props.open,
  async (open) => {
    const token = ++requestToken
    formData.value = null
    if (!open || !props.record) return
    loading.value = true
    loadFailed.value = false
    try {
      const detail = await getKnowledgeDocument(props.record.id)
      if (token !== requestToken) return
      if (detail.data.builtIn) {
        message.warning('内置资料不可修改')
        emit('update:open', false)
        return
      }
      formData.value = getDocumentSaveDTO(detail.data)
    } catch {
      if (token === requestToken) loadFailed.value = true
    } finally {
      if (token === requestToken) loading.value = false
    }
  }
)

const handleOk = async () => {
  if (!canWrite.value || props.record?.writable === false) return
  if (!formData.value || !props.record || confirmLoading.value || loading.value || props.record.builtIn)
    return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  confirmLoading.value = true
  try {
    const data: KnowledgeDocumentSaveDTO = {
      version: formData.value.version,
      folderId: formData.value.folderId,
      documentName: formData.value.documentName.trim(),
      description: formData.value.description?.trim() || null,
      isPublic: Boolean(formData.value.isPublic),
    }
    await updateKnowledgeDocument(props.record.id, data)
    message.success(props.moveOnly ? '移动资料成功' : '保存资料信息成功')
    emit('update:open', false)
    emit('success')
  } catch {
    /* 业务错误由拦截器统一提示 */
  } finally {
    confirmLoading.value = false
  }
}

const handleCancel = () => {
  if (confirmLoading.value) return
  emit('update:open', false)
}
</script>

<style scoped>
.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}
.switch-desc {
  font-size: var(--du-font-size-xs, 11px);
  color: var(--du-text-secondary, #475569);
}
</style>
