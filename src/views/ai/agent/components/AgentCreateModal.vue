<template>
  <a-modal
    :open="open"
    title="新建 Agent"
    :width="560"
    :confirm-loading="submitLoading"
    :mask-closable="false"
    :destroy-on-close="true"
    ok-text="确认创建"
    cancel-text="取消"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      class="compact-form"
    >
      <a-form-item label="所属组织/部门" name="orgId" extra="创建后所属组织将不可变更">
        <a-tree-select
          v-model:value="formData.orgId"
          :tree-data="orgTreeData"
          placeholder="请选择所属组织"
          allow-clear
          tree-default-expand-all
          :field-names="{ label: 'orgName', value: 'id', children: 'children' }"
        />
      </a-form-item>

      <a-form-item label="Agent 名称" name="name">
        <a-input
          v-model:value="formData.name"
          placeholder="请输入 Agent 名称，例如：研发知识助手"
          :maxlength="100"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-form-item label="简介说明" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入 Agent 职能定位、适用场景说明（选填）"
          :maxlength="1000"
          :rows="3"
          show-count
          allow-clear
        />
      </a-form-item>

      <a-form-item label="头像地址 (URL)" name="avatarPath" extra="输入头像图片 URL 链接（选填）">
        <div class="avatar-input-row">
          <a-input
            v-model:value="formData.avatarPath"
            placeholder="https://..."
            :maxlength="1000"
            allow-clear
          />
          <div v-if="formData.avatarPath" class="avatar-preview-box">
            <img
              :src="formData.avatarPath"
              alt="avatar"
              class="preview-img"
              @error="handleImgError"
            />
          </div>
        </div>
      </a-form-item>

      <a-form-item label="公开范围" name="isPublic" extra="公开后租户内其他部门与成员均可查阅并使用此 Agent">
        <a-switch
          v-model:checked="formData.isPublic"
          checked-children="租户公开"
          un-checked-children="组织私有"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { createAgent } from '@/apis/ai/agent'
import type { AgentCreateDTO, AgentMutationResult } from '@/apis/ai/agent/type'
import { getOrganizationTree } from '@/apis/upms/organization'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success', result: AgentMutationResult): void
}>()

const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const orgTreeData = ref<any[]>([])

const formData = reactive<{
  orgId: string
  name: string
  description: string
  avatarPath: string
  isPublic: boolean
}>({
  orgId: '',
  name: '',
  description: '',
  avatarPath: '',
  isPublic: false,
})

const formRules: Record<string, Rule[]> = {
  orgId: [
    { required: true, message: '请选择所属组织/部门', trigger: 'change' },
  ],
  name: [
    { required: true, message: '请输入 Agent 名称', trigger: 'blur' },
    { max: 100, message: 'Agent 名称不能超过 100 字符', trigger: 'blur' },
  ],
  description: [
    { max: 1000, message: '简介不能超过 1000 字符', trigger: 'blur' },
  ],
  avatarPath: [
    { max: 1000, message: '头像链接不能超过 1000 字符', trigger: 'blur' },
  ],
}

const loadOrgTree = async () => {
  try {
    const res = await getOrganizationTree({ enabled: true })
    const raw = res.data as any
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.records) ? raw.records : [])
    orgTreeData.value = list
  } catch (err) {
    console.error('加载组织树失败', err)
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadOrgTree()
      formData.orgId = ''
      formData.name = ''
      formData.description = ''
      formData.avatarPath = ''
      formData.isPublic = false
    }
  }
)

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) {
    target.style.display = 'none'
  }
}

const handleCancel = () => {
  emit('update:open', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitLoading.value = true
  try {
    const payload: AgentCreateDTO = {
      orgId: formData.orgId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      avatarPath: formData.avatarPath.trim() || null,
      isPublic: formData.isPublic,
      draftConfig: {},
    }

    const res = await createAgent(payload)
    message.success('Agent 创建成功')
    emit('update:open', false)
    emit('success', res.data)
  } catch {
    // 错误拦截器已处理提示
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.avatar-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview-box {
  width: 32px;
  height: 32px;
  border-radius: var(--du-border-radius, 4px);
  border: 1px solid var(--du-border, #d9d9d9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--du-bg-container, #ffffff);
  flex-shrink: 0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
