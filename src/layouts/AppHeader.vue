<template>
  <!-- 应用顶栏：环境、搜索、通知与当前用户操作。 -->
  <header class="header">
    <div class="environment" :class="runtimeEnvironment.className">
      <span class="environment-dot" />
      <span>{{ runtimeEnvironment.label }}</span>
      <!-- <DownOutlined /> -->
    </div>

    <div class="header-tools">
      <div class="global-search">
        <SearchOutlined />
        <input aria-label="全局搜索" placeholder="搜索资源、任务或 ID" />
        <kbd>⌘ K</kbd>
      </div>
      <button type="button" class="icon-button" title="帮助"><QuestionCircleOutlined /></button>
      <button type="button" class="icon-button has-notice" title="通知"><BellOutlined /></button>
      <span class="divider" />
      <!-- 用户菜单展示实时用户信息并提供退出入口。 -->
      <a-dropdown :trigger="['click']" placement="bottomRight">
        <button type="button" class="profile-button" aria-label="打开用户菜单">
          <span class="avatar">
            <img v-if="userInfo.avatar && !avatarError" :src="userInfo.avatar" alt="" @error="avatarError = true" />
            <span v-else>{{ userInitials }}</span>
          </span>
          <span class="profile-copy">
            <strong>{{ displayName }}</strong>
            <small>{{ accountLabel }}</small>
          </span>
          <DownOutlined />
        </button>
        <template #overlay>
          <a-menu class="profile-menu" @click="handleUserMenu">
            <a-menu-item key="identity" disabled>
              <div class="menu-identity">
                <strong>{{ displayName }}</strong>
                <span>{{ userInfo.userName || '已登录账号' }}</span>
              </div>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout" danger>
              <LogoutOutlined />
              <span>退出系统</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { MenuProps } from 'ant-design-vue'
import { BellOutlined, DownOutlined, LogoutOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { clear as clearSession } from '@/stores/modules/oauth'
import { clearStore, tenantsStore, userStore } from '@/stores/modules/user'
import { runtimeEnvironment } from '@/config/runtimeEnvironment'

const router = useRouter()
const currentUser = userStore()
const currentTenant = tenantsStore()
const avatarError = ref(false)

watch(() => currentUser.userInfo.avatar, () => {
  avatarError.value = false
})

// 所有展示字段都从 Pinia 用户状态派生，避免静态占位内容。
const userInfo = computed(() => currentUser.userInfo)
const displayName = computed(() => userInfo.value.nickName || userInfo.value.userName || '当前用户')
const accountLabel = computed(() => {
  if (userInfo.value.nickName && userInfo.value.userName) return userInfo.value.userName
  return '平台用户'
})
const userInitials = computed(() => displayName.value.trim().slice(0, 2).toUpperCase())

// 退出时同时清理认证 Cookie 和用户会话状态。
const logout = async () => {
  clearSession()
  await clearStore()
  await router.replace({ name: 'login' })
}

// 根据下拉菜单键值分发用户操作。
const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
  if (key === 'logout') void logout()
}

// 刷新页面时若本地上下文不完整，先恢复租户再获取用户信息。
onMounted(() => {
  const initializeUserContext = async () => {
    if (!currentTenant.userTenant.currentTenant?.id) {
      await currentTenant.initializeTenant()
    }

    if (!userInfo.value.id && !userInfo.value.userName) {
      await currentUser.getUserInfo()
    }
  }

  void initializeUserContext().catch(() => undefined)
})
</script>

<style scoped>
/* 顶栏总体布局。 */
.header {
  display: flex;
  height: var(--du-header-height);
  flex: 0 0 var(--du-header-height);
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--du-space-4);
  border-bottom: 1px solid var(--du-border);
  background: var(--du-bg-surface);
}

.environment,
.header-tools,
.profile-button {
  display: flex;
  align-items: center;
}

/* 当前运行环境指示器。 */
.environment {
  gap: 7px;
  color: var(--du-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.environment-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--runtime-environment-color, #22a447);
  box-shadow: 0 0 0 2px var(--runtime-environment-halo, #dcf4e3);
}

.environment :deep(.anticon) {
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
}

.header-tools {
  height: 100%;
  gap: var(--du-space-2);
}

/* 全局搜索入口。 */
.global-search {
  display: flex;
  width: 280px;
  height: 30px;
  align-items: center;
  gap: var(--du-space-2);
  padding: 0 var(--du-space-2);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-subtle);
}

.global-search :deep(.anticon) {
  color: var(--du-text-muted);
}

.global-search input {
  min-width: 0;
  flex: 1;
  color: var(--du-text);
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}

.global-search input::placeholder {
  color: var(--du-text-muted);
}

.global-search kbd {
  padding: 1px 5px;
  color: var(--du-text-muted);
  border: 1px solid var(--du-border);
  border-radius: 3px;
  background: #fff;
  font-family: var(--du-font-sans);
  font-size: var(--du-font-size-xs, 11px);
}

/* 帮助与通知图标按钮。 */
.icon-button {
  position: relative;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--du-text-secondary);
  border: 0;
  border-radius: var(--du-radius-sm);
  background: transparent;
  cursor: pointer;
}

.icon-button:hover {
  color: var(--du-text);
  background: var(--du-bg-hover);
}

.icon-button.has-notice::after {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 5px;
  height: 5px;
  border: 1px solid #fff;
  border-radius: 50%;
  background: var(--du-negative);
  content: '';
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--du-border);
}

/* 当前用户摘要按钮。 */
.profile-button {
  height: 38px;
  gap: var(--du-space-2);
  padding: 0 var(--du-space-1);
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.avatar {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: #fff;
  border-radius: var(--du-radius-sm);
  background: #344154;
  font-size: var(--du-font-size-xs, 11px);
  font-weight: 700;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.profile-copy strong {
  font-size: 11px;
}

.profile-copy small {
  margin-top: 2px;
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
}

.profile-button > :deep(.anticon) {
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
}

/* 用户下拉菜单与身份摘要。 */
.profile-menu {
  min-width: 180px;
}

.menu-identity {
  display: flex;
  min-width: 140px;
  flex-direction: column;
  padding: 2px 0;
  line-height: 1.3;
}

.menu-identity strong {
  overflow: hidden;
  color: var(--du-text);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-identity span {
  overflow: hidden;
  margin-top: 2px;
  color: var(--du-text-muted);
  font-size: var(--du-font-size-xs, 11px);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
