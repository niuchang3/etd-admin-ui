<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑分类目录' : '新增分类目录'"
    :confirm-loading="confirmLoading"
    :mask-closable="false"
    :width="520"
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
      <!-- 所属部门：若当前为全部视图且新增根目录，则支持选择部门；其余场景均严格锁定不可变更 -->
      <a-form-item label="所属部门" name="orgId">
        <a-tree-select
          v-if="isRootCreateInAllView"
          v-model:value="formData.orgId"
          :tree-data="departmentTreeOptions"
          placeholder="请选择归属部门"
          allow-clear
          tree-default-expand-all
          :field-names="{ label: 'orgName', value: 'id', children: 'children' }"
          @change="handleOrgChange"
        />
        <a-input v-else :value="displayOrgName" disabled />
      </a-form-item>

      <a-form-item label="上级分类" name="parentId" extra="留空表示直接作为当前部门的顶级根分类（仅支持同部门层级）">
        <a-tree-select
          v-model:value="formData.parentId"
          :tree-data="parentTreeData"
          placeholder="请选择上级分类（留空为顶级根分类）"
          allow-clear
          tree-default-expand-all
          :field-names="{ label: 'folderName', value: 'id', children: 'children' }"
        />
      </a-form-item>

      <a-form-item label="分类名称" name="folderName">
        <a-input
          v-model:value="formData.folderName"
          placeholder="请输入分类名称，例如：产品资料"
          :maxlength="100"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-form-item label="分类描述" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="可选输入分类说明、归档范围或用途（最多 500 字）"
          :maxlength="500"
          :rows="3"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-form-item
        label="排序权重"
        name="sortOrder"
        extra="非负整数，同级较小值靠前"
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
import type { Organization } from '@/apis/upms/organization/type'

interface Props {
  open: boolean
  orgId?: string
  orgName?: string
  orgTree?: Organization[]
  record: KnowledgeFolderRecord | null
  parentFolder?: KnowledgeFolderRecord | null
  rawFolderList: KnowledgeFolderRecord[]
}

const props = withDefaults(defineProps<Props>(), {
  orgId: '',
  orgName: '',
  orgTree: () => [],
  record: null,
  parentFolder: null,
  rawFolderList: () => [],
})

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const confirmLoading = ref(false)

const isEdit = computed(() => Boolean(props.record?.id))

/** 在“全部可见目录”视图下新增顶级根目录 */
const isRootCreateInAllView = computed(() => {
  return !isEdit.value && !props.parentFolder && !props.orgId
})

interface FormState {
  orgId: string
  parentId: string | null
  folderName: string
  description: string
  sortOrder: number
}

const initialFormState: FormState = {
  orgId: '',
  parentId: null,
  folderName: '',
  description: '',
  sortOrder: 0,
}

const formData = reactive<FormState>({ ...initialFormState })

/** 辅助查找部门名称 */
const findOrgName = (items: Organization[], id: string): string => {
  if (!id) return ''
  for (const org of items) {
    if (String(org.id) === id) return org.orgName
    if (org.children?.length) {
      const found = findOrgName(org.children, id)
      if (found) return found
    }
  }
  return ''
}

const displayOrgName = computed(() => {
  if (formData.orgId) {
    const name = findOrgName(props.orgTree, formData.orgId)
    if (name) return name
    if (props.orgId && formData.orgId === props.orgId && props.orgName) {
      return props.orgName
    }
    return `部门 (${formData.orgId})`
  }
  return props.orgName || '请选择部门'
})

const departmentTreeOptions = computed(() => props.orgTree)

/** 切换部门时，清空不属于新部门的父级分类选择 */
const handleOrgChange = () => {
  formData.parentId = null
  if (formData.folderName) {
    formRef.value?.validateFields(['folderName']).catch(() => {})
  }
}

/** 校验同部门同父级下不能重名（后端去除首尾空格后比较） */
const validateDuplicateName = async (_rule: Rule, value: string) => {
  const trimmed = (value || '').trim()
  if (!trimmed) return Promise.resolve()
  const currentOrgId = formData.orgId ? String(formData.orgId).trim() : ''
  const targetParentId = formData.parentId ? String(formData.parentId).trim() : null
  const currentId = props.record?.id ? String(props.record.id) : undefined

  const hasDuplicate = props.rawFolderList.some((item) => {
    if (currentId && String(item.id) === currentId) return false
    const itemOrgId = String(item.orgId).trim()
    const itemParentId = item.parentId ? String(item.parentId).trim() : null
    return itemOrgId === currentOrgId && itemParentId === targetParentId && item.folderName.trim() === trimmed
  })
  if (hasDuplicate) {
    return Promise.reject(new Error('当前部门同父目录下已存在相同名称的分类'))
  }
  return Promise.resolve()
}

const rules: Record<string, Rule[]> = {
  orgId: [{ required: true, message: '请选择归属部门', trigger: 'change' }],
  folderName: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 100, message: '分类名称不能超过 100 个字符', trigger: 'blur' },
    { validator: validateDuplicateName, trigger: 'blur' },
  ],
  description: [
    { max: 500, message: '分类描述不能超过 500 个字符', trigger: 'blur' },
  ],
  sortOrder: [
    { required: true, message: '请输入排序权重', trigger: 'blur' },
    { type: 'number', min: 0, message: '排序权重必须为非负整数', trigger: 'blur' },
  ],
}

/** 获取所有自身及后代节点 ID，防止循环挂载 */
const getDescendantIds = (currentId: string, list: KnowledgeFolderRecord[]): Set<string> => {
  const descendants = new Set<string>([String(currentId)])
  let changed = true
  while (changed) {
    changed = false
    list.forEach((item) => {
      const pId = item.parentId ? String(item.parentId) : null
      const selfId = String(item.id)
      if (pId && descendants.has(pId) && !descendants.has(selfId)) {
        descendants.add(selfId)
        changed = true
      }
    })
  }
  return descendants
}

/** 构造父级下拉树结构（仅严格属于同一部门 formData.orgId 的目录，且排除自身及后代） */
const parentTreeData = computed<KnowledgeFolderRecord[]>(() => {
  const currentOrgId = formData.orgId ? String(formData.orgId).trim() : ''
  if (!currentOrgId) return []

  const forbiddenIds = isEdit.value && props.record?.id
    ? getDescendantIds(String(props.record.id), props.rawFolderList)
    : new Set<string>()

  // 严格限定同一部门，且排除自身和后代（严禁跨部门移动/跨部门挂载）
  const validList = props.rawFolderList.filter((f) => {
    const isSameOrg = String(f.orgId).trim() === currentOrgId
    const isAllowed = !forbiddenIds.has(String(f.id))
    // 过滤掉仅用于补齐路径的导航节点作为父级
    return isSameOrg && isAllowed && !f.navigationOnly
  })

  const nodeMap = new Map<string, KnowledgeFolderRecord>()
  validList.forEach((item) => {
    nodeMap.set(String(item.id), {
      ...item,
      children: [],
    })
  })

  const tree: KnowledgeFolderRecord[] = []
  nodeMap.forEach((node) => {
    const pId = node.parentId ? String(node.parentId) : null
    if (pId && nodeMap.has(pId)) {
      nodeMap.get(pId)!.children!.push(node)
    } else {
      tree.push(node)
    }
  })

  return tree
})

// 当切换上级目录时，触发同级重名校验
watch(() => formData.parentId, () => {
  if (formData.folderName) {
    formRef.value?.validateFields(['folderName']).catch(() => {})
  }
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.record?.id) {
        // 编辑：保留原目录的 orgId，禁止修改
        formData.orgId = String(props.record.orgId)
        formData.parentId = props.record.parentId ? String(props.record.parentId) : null
        formData.folderName = props.record.folderName || ''
        formData.description = props.record.description || ''
        formData.sortOrder = props.record.sortOrder ?? 0
      } else if (props.parentFolder) {
        // 在可维护目录下新增子目录：自动继承父目录的 orgId
        formData.orgId = String(props.parentFolder.orgId)
        formData.parentId = String(props.parentFolder.id)
        formData.folderName = ''
        formData.description = ''
        formData.sortOrder = 0
      } else {
        // 新增根目录：若当前选了部门则继承，否则留空待选
        Object.assign(formData, initialFormState)
        if (props.orgId) {
          formData.orgId = String(props.orgId)
        }
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

  if (!formData.orgId) {
    message.error('请选择或指定归属部门')
    return
  }

  confirmLoading.value = true
  try {
    // parentId 不能传 0、空字符串或虚拟根节点 ID，根目录必须传 null
    const normalizedParentId = formData.parentId && String(formData.parentId).trim() !== '' && String(formData.parentId).trim() !== '0'
      ? String(formData.parentId).trim()
      : null

    const payload: KnowledgeFolderSaveDTO = {
      orgId: String(formData.orgId).trim(),
      parentId: normalizedParentId,
      folderName: formData.folderName.trim(),
      description: formData.description?.trim() ? formData.description.trim() : null,
      sortOrder: formData.sortOrder,
    }

    if (isEdit.value && props.record?.id) {
      // 更新必须明确提交 orgId、parentId、description（null 可清空）及当前 version 原样回传
      payload.version = props.record.version !== undefined && props.record.version !== null ? String(props.record.version) : undefined
      await updateKnowledgeFolder(String(props.record.id), payload)
      message.success('分类目录更新成功')
    } else {
      await createKnowledgeFolder(payload)
      message.success('分类目录新增成功')
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
