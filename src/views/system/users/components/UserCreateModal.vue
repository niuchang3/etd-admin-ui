<template>
  <a-modal
    :open="open"
    title="新增用户"
    width="680px"
    :confirm-loading="saving"
    ok-text="保存"
    cancel-text="取消"
    @ok="handleSubmit"
    @update:open="onOpenChange"
  >
    <a-form ref="formRef" :model="formState" layout="vertical" class="user-modal-form">
      <div class="form-section-title">基础账号信息</div>
      <div class="form-grid">
        <a-form-item label="登录账号" name="account" :rules="accountRules">
          <a-input v-model:value="formState.account" :maxlength="32" show-count placeholder="请输入账号（字母或数字）" autocomplete="off" />
        </a-form-item>

        <a-form-item label="登录密码" name="password" :rules="passwordRules">
          <a-input-password
            v-model:value="formState.password"
            :maxlength="72"
            :placeholder="passwordPlaceholder"
            autocomplete="new-password"
          />
        </a-form-item>

        <a-form-item label="真实姓名" name="userName" :rules="userNameRules">
          <a-input v-model:value="formState.userName" :maxlength="20" show-count placeholder="请输入真实姓名" />
        </a-form-item>

        <a-form-item label="用户昵称" name="nickName">
          <a-input v-model:value="formState.nickName" :maxlength="32" show-count placeholder="请输入昵称" />
        </a-form-item>

        <a-form-item label="手机号码" name="mobile" :rules="mobileRules">
          <a-input v-model:value="formState.mobile" :maxlength="20" show-count placeholder="请输入手机号码" />
        </a-form-item>

        <a-form-item label="出生日期" name="birthday">
          <a-date-picker
            v-model:value="formState.birthday"
            value-format="YYYY-MM-DD"
            class="w-full"
            placeholder="请选择出生日期"
          />
        </a-form-item>

        <a-form-item label="性别" name="gender">
          <a-radio-group v-model:value="formState.gender">
            <a-radio :value="1">男</a-radio>
            <a-radio :value="2">女</a-radio>
            <a-radio :value="0">未知</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="头像地址" name="avatar">
          <a-input v-model:value="formState.avatar" :maxlength="255" placeholder="请输入头像 URL 地址" />
        </a-form-item>
      </div>

      <div class="form-section-title">权限与组织归属</div>
      <div class="form-grid">
        <a-form-item label="分配角色" name="roleIds" class="full-row">
          <a-select
            v-model:value="formState.roleIds"
            mode="multiple"
            allow-clear
            :options="roleOptions"
            :loading="roleListLoading"
            placeholder="请选择分配给该用户的角色"
          />
        </a-form-item>

        <a-form-item label="分配组织" name="organizationIds" class="full-row">
          <a-tree-select
            v-model:value="formState.organizationIds"
            :tree-data="orgSelectTreeData"
            tree-checkable
            tree-default-expand-all
            allow-clear
            placeholder="请勾选所属组织机构"
            @change="onOrgChange"
          />
        </a-form-item>

        <a-form-item label="主组织" name="primaryOrganizationId" class="full-row">
          <a-select
            v-model:value="formState.primaryOrganizationId"
            allow-clear
            :disabled="!formState.organizationIds?.length"
            :options="primaryOrgOptions"
            placeholder="请从已勾选的组织中选定主组织"
          />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import type { Id } from '@/apis/types'
import { createUser } from '@/apis/upms/user'
import type { UserCreatePayload } from '@/apis/upms/user/type'
import { getSystemRolePage } from '@/apis/upms/role'
import type { SystemRole } from '@/apis/upms/role/type'
import type { Organization } from '@/apis/upms/organization/type'
import { isRestrictedAssignRole } from '@/utils/role'
import { usePasswordPolicy } from '@/composables/usePasswordPolicy'
import { accountRules as getAccountRules, userNameRules as getUserNameRules, mobileRules as getMobileRules } from '@/utils/rules'

const props = defineProps<{
  open: boolean
  defaultOrgId?: string
  orgTree: Organization[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)
const roleListLoading = ref(false)
const rawRoles = ref<SystemRole[]>([])

const { passwordRules, passwordPlaceholder } = usePasswordPolicy({
  required: true,
  requiredMessage: '请输入登录密码',
  fieldLabel: '登录密码',
})

const accountRules = getAccountRules({ maxLength: 32, requiredMessage: '请输入登录账号' })
const userNameRules = getUserNameRules({ maxLength: 20, requiredMessage: '请输入真实姓名' })
const mobileRules = getMobileRules({ maxLength: 20 })

const createEmptyForm = (): UserCreatePayload => ({
  account: '',
  password: '',
  userName: '',
  nickName: '',
  mobile: '',
  birthday: '',
  gender: 1,
  avatar: '',
  roleIds: [],
  organizationIds: props.defaultOrgId ? [props.defaultOrgId] : [],
  primaryOrganizationId: props.defaultOrgId ? props.defaultOrgId : undefined,
})

const formState = reactive<UserCreatePayload>(createEmptyForm())

const roleOptions = computed(() =>
  rawRoles.value
    .filter((r) => !isRestrictedAssignRole(r))
    .map((r) => ({
      label: r.roleName,
      value: String(r.id),
    }))
)

const mapOrgToTree = (items: Organization[]): any[] => {
  return items.map((org) => ({
    key: String(org.id),
    value: String(org.id),
    title: org.orgName,
    children: org.children?.length ? mapOrgToTree(org.children) : undefined,
  }))
}

const orgSelectTreeData = computed(() => mapOrgToTree(props.orgTree))

const findOrgNames = (ids: Id[], tree: Organization[]): { label: string; value: string }[] => {
  const result: { label: string; value: string }[] = []
  const idSet = new Set(ids.map(String))
  const walk = (nodes: Organization[]) => {
    nodes.forEach((n) => {
      if (idSet.has(String(n.id))) {
        result.push({ label: n.orgName, value: String(n.id) })
      }
      if (n.children?.length) walk(n.children)
    })
  }
  walk(tree)
  return result
}

const primaryOrgOptions = computed(() => {
  if (!formState.organizationIds?.length) return []
  return findOrgNames(formState.organizationIds, props.orgTree)
})

const onOrgChange = (selected: unknown[]) => {
  const ids = (selected as string[]) || []
  if (formState.primaryOrganizationId && !ids.includes(String(formState.primaryOrganizationId))) {
    formState.primaryOrganizationId = undefined
  }
}

const loadRoles = async () => {
  roleListLoading.value = true
  try {
    const res = await getSystemRolePage({ current: 1, size: 200, dataStatus: 1 })
    rawRoles.value = res.data?.records || []
  } catch (err) {
    console.warn('加载角色失败:', err)
  } finally {
    roleListLoading.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      Object.assign(formState, createEmptyForm())
      void loadRoles()
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
    const allowedRoleIdSet = new Set(roleOptions.value.map((r) => String(r.value)))
    const safeRoleIds = (formState.roleIds || []).filter((id) => allowedRoleIdSet.has(String(id)))
    const payload: UserCreatePayload = {
      account: formState.account.trim(),
      password: formState.password,
      userName: formState.userName.trim(),
      nickName: formState.nickName?.trim() || undefined,
      mobile: formState.mobile?.trim() || undefined,
      birthday: formState.birthday || undefined,
      gender: formState.gender,
      avatar: formState.avatar?.trim() || undefined,
      roleIds: safeRoleIds,
      organizationIds: formState.organizationIds || [],
      primaryOrganizationId: formState.primaryOrganizationId || undefined,
    }
    await createUser(payload)
    message.success('用户新增成功')
    emit('update:open', false)
    emit('success')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.user-modal-form {
  padding-top: var(--du-space-2);
}

.form-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--du-text);
  margin-bottom: var(--du-space-3);
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--du-border);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 var(--du-space-4);
}

.full-row {
  grid-column: span 2;
}

.w-full {
  width: 100%;
}
</style>
