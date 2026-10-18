<template>
  <!-- 用户管理组织架构侧栏：复用全局通用 OrgSidebar 组件 -->
  <OrgSidebar
    ref="sidebarRef"
    :selected-org-id="selectedOrgId"
    title="组织架构"
    all-node-text="全部用户"
    all-node-icon="team"
    :request-params="{ enabled: true }"
    @update:selected-org-id="onUpdateOrgId"
    @select="onOrgSelect"
    @loaded="onOrgLoaded"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OrgSidebar from '@/components/OrgSidebar.vue'
import type { Organization } from '@/apis/upms/organization/type'

defineProps<{
  selectedOrgId?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedOrgId', val: string): void
  (e: 'select', orgId: string): void
  (e: 'loaded', tree: Organization[]): void
}>()

const sidebarRef = ref<InstanceType<typeof OrgSidebar>>()

const onUpdateOrgId = (val: string) => {
  emit('update:selectedOrgId', val)
}

const onOrgSelect = (orgId: string) => {
  emit('select', orgId)
}

const onOrgLoaded = (tree: Organization[]) => {
  emit('loaded', tree)
}

defineExpose({
  loadOrgTree: () => sidebarRef.value?.loadOrgTree(),
  rawTree: sidebarRef.value?.rawTree,
})
</script>
