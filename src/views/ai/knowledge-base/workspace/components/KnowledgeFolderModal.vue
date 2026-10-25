<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑分类' : '新建分类'"
    :confirm-loading="confirmLoading"
    :mask-closable="false"
    :destroy-on-close="true"
    :width="480"
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
      <a-form-item label="上级分类" name="parentId" extra="选择“无（作为顶级根分类）”或留空表示直接作为根分类">
        <a-tree-select
          v-model:value="formData.parentId"
          :tree-data="parentTreeData"
          placeholder="请选择上级分类（留空为顶级根分类）"
          allow-clear
          tree-default-expand-all
          :dropdown-style="{ maxHeight: '360px', overflow: 'auto' }"
        />
      </a-form-item>

      <a-form-item label="分类名称" name="folderName">
        <a-input
          v-model:value="formData.folderName"
          placeholder="请输入分类名称，例如：产品白皮书"
          :maxlength="100"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-form-item label="分类说明" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入分类说明（可选，最多 500 字）"
          :maxlength="500"
          :rows="3"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-form-item
        label="排序权重"
        name="sortOrder"
        extra="数值越小越靠前"
      >
        <a-input-number
          v-model:value="formData.sortOrder"
          :min="0"
          :max="99999"
          :precision="0"
          style="width: 100%"
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
  createKnowledgeFolder,
  updateKnowledgeFolder,
} from '@/apis/ai/folder'
import type {
  KnowledgeFolderRecord,
  KnowledgeFolderSaveDTO,
} from '@/apis/ai/folder/type'

const props = defineProps<{
  open: boolean
  knowledgeBaseId: string
  folderTree: KnowledgeFolderRecord[]
  editingRecord?: KnowledgeFolderRecord | null
  defaultParentId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const confirmLoading = ref(false)

const isEdit = computed(() => Boolean(props.editingRecord?.id))

const formData = reactive<KnowledgeFolderSaveDTO>({
  knowledgeBaseId: '',
  parentId: null,
  folderName: '',
  description: '',
  sortOrder: 0,
})

const rules: Record<string, Rule[]> = {
  folderName: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 100, message: '分类名称最多 100 字符', trigger: 'blur' },
  ],
}

const ROOT_PARENT_KEY = '__root__'

// 排除当前正在编辑的节点及其子孙节点，防止成环，并标准化 title 与 value 保证名称正确显示
const parentTreeData = computed(() => {
  const editId = isEdit.value && props.editingRecord?.id ? String(props.editingRecord.id) : null

  const formatNodes = (nodes: any[]): any[] => {
    const list: any[] = []
    for (const n of nodes) {
      const nodeId = String(n.id ?? n.key ?? n.value ?? '')
      // 编辑时排除自身及其整棵子树，防止成环
      if (editId && nodeId === editId) {
        continue
      }
      const title = n.folderName ?? n.title ?? n.label ?? '未命名分类'
      const children = n.children && n.children.length ? formatNodes(n.children) : undefined
      list.push({
        ...n,
        id: nodeId,
        value: nodeId,
        key: nodeId,
        title,
        folderName: title,
        label: title,
        children,
      })
    }
    return list
  }

  const formattedTree = formatNodes(props.folderTree || [])

  // 顶层注入显式的“顶级根分类”选项，避免空白或渲染为破折号
  return [
    {
      id: '',
      value: '',
      key: ROOT_PARENT_KEY,
      title: '无（作为顶级根分类）',
      folderName: '无（作为顶级根分类）',
      label: '无（作为顶级根分类）',
    },
    ...formattedTree,
  ]
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.editingRecord) {
        formData.knowledgeBaseId = props.knowledgeBaseId
        formData.parentId = props.editingRecord.parentId ? String(props.editingRecord.parentId) : ''
        formData.folderName = props.editingRecord.folderName
        formData.description = props.editingRecord.description || ''
        formData.sortOrder = props.editingRecord.sortOrder ?? 0
        formData.version = props.editingRecord.version ?? undefined
      } else {
        formData.knowledgeBaseId = props.knowledgeBaseId
        formData.parentId = props.defaultParentId ? String(props.defaultParentId) : ''
        formData.folderName = ''
        formData.description = ''
        formData.sortOrder = 0
        delete formData.version
      }
    }
  }
)

const handleCancel = () => {
  emit('update:open', false)
}

const handleOk = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  confirmLoading.value = true
  try {
    const payload: KnowledgeFolderSaveDTO = {
      knowledgeBaseId: props.knowledgeBaseId,
      parentId: formData.parentId ? String(formData.parentId) : null,
      folderName: formData.folderName.trim(),
      description: formData.description?.trim() || null,
      sortOrder: formData.sortOrder ?? 0,
    }

    if (isEdit.value && props.editingRecord?.id) {
      payload.version = props.editingRecord.version ?? undefined
      await updateKnowledgeFolder(String(props.editingRecord.id), payload)
      message.success('分类已更新')
    } else {
      await createKnowledgeFolder(payload)
      message.success('分类创建成功')
    }
    emit('update:open', false)
    emit('success')
  } finally {
    confirmLoading.value = false
  }
}
</script>

<style scoped>
.compact-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
