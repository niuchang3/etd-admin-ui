<template>
  <!-- 登录页采用左侧系统信息、右侧账号表单的双栏布局。 -->
  <main class="login-page">
    <section class="login-shell">
      <!-- 左侧只展示平台品牌、运行环境和安全信息。 -->
      <aside class="system-panel">
        <div class="brand">
          <img v-if="configStore.branding.logo" :src="configStore.branding.logo" alt="Logo" class="brand-logo-img" />
          <span v-else class="brand-mark">E</span>
          <div>
            <strong>{{ configStore.branding.name || 'ETD Console' }}</strong>
            <small>Operations Suite</small>
          </div>
        </div>

        <div class="system-copy">
          <p class="eyebrow">Enterprise Operations Console</p>
          <h1>统一运营管理平台</h1>
          <p>集中管理任务、资源和平台运行状态。</p>
        </div>

        <!-- 紧凑展示当前环境、区域与版本。 -->
        <dl class="system-facts">
          <div>
            <dt>Environment</dt>
            <dd :class="runtimeEnvironment.className"><span class="status-dot" /> {{ runtimeEnvironment.label }}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd class="du-mono">CN-EAST-1</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd class="du-mono">v2.8.4</dd>
          </div>
        </dl>

        <div class="system-footer">
          <SafetyCertificateOutlined />
          <span>Secure access · TLS 1.3</span>
        </div>
      </aside>

      <!-- 右侧仅保留账号密码登录，不提供其他登录方式。 -->
      <section class="form-panel">
        <header class="form-header">
          <p class="eyebrow">Account Access</p>
          <h2>登录控制台</h2>
          <p>请输入你的账号和密码以继续。</p>
        </header>

        <!-- Ant Design Vue 表单在提交前统一执行字段校验。 -->
        <a-form
          ref="formRef"
          :model="formState"
          :rules="rules"
          layout="vertical"
          autocomplete="off"
          @finish="submit"
        >
          <a-form-item label="账号" name="username">
            <a-input
              v-model:value="formState.username"
              placeholder="请输入账号"
              autocomplete="username"
            >
              <template #prefix><UserOutlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="密码" name="password">
            <a-input-password
              v-model:value="formState.password"
              placeholder="请输入密码"
              autocomplete="current-password"
            >
              <template #prefix><LockOutlined /></template>
            </a-input-password>
          </a-form-item>

          <!-- 验证码暂未对接后端，目前临时屏蔽 -->
          <a-form-item
            v-if="false && loginFailCount >= configStore.security.captcha.triggerOnFailCount"
            label="验证码"
            name="captcha"
          >
            <div class="captcha-wrapper">
              <a-input v-model:value="formState.captcha" placeholder="请输入验证码" class="captcha-input" />
              <div class="captcha-box" @click="generateCaptchaText" title="点击刷新验证码">
                {{ generatedCaptcha }}
              </div>
            </div>
          </a-form-item>

          <a-button class="submit-button" type="primary" html-type="submit" :loading="submitting" block>
            登录
            <ArrowRightOutlined v-if="!submitting" />
          </a-button>
        </a-form>

        <div class="access-note">
          <InfoCircleOutlined />
          <span>仅限已授权的平台账号访问。登录行为将被安全审计。</span>
        </div>
      </section>
    </section>

    <!-- 页面底部展示版权与服务状态。 -->
    <footer class="page-footer">
      <span>{{ configStore.branding.copyright || '© 2026 ETD Platform' }}</span>
      <span class="separator" />
      <span>Service status: <b>Operational</b></span>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormProps } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import {
  ArrowRightOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import type { LoginCredentials } from '@/apis/upms/login/type'
import { accountLogin, clear as clearSession } from '@/stores/modules/oauth'
import { clearStore, menusStore, tenantsStore, userStore } from '@/stores/modules/user'
import { useSystemConfigStore } from '@/stores/modules/config'
import { runtimeEnvironment } from '@/config/runtimeEnvironment'

// 路由实例用于登录成功后返回原目标页面。
const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const currentUser = userStore()
const currentTenant = tenantsStore()
const currentMenus = menusStore()
const configStore = useSystemConfigStore()

// 页面只维护账号、密码及图形验证码。
const formState = reactive<LoginCredentials & { captcha?: string }>({
  username: '',
  password: '',
  captcha: '',
})

// 登录字段的必填和长度校验规则。
const rules: FormProps['rules'] = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 2, max: 64, message: '账号长度应为 2–64 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 128, message: '密码长度应为 6–128 个字符', trigger: 'blur' },
  ],
  captcha: [{
    validator: async () => {
      // 临时屏蔽验证码校验，等服务端实现后再行恢复
      return
    },
    trigger: 'blur',
  }],
}

const loginFailCount = ref(0)
const generatedCaptcha = ref('')

const generateCaptchaText = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let text = ''
  for (let i = 0; i < 4; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  generatedCaptcha.value = text
}

onMounted(() => {
  void configStore.fetchConfigs()
})

/**
 * 完整登录链路：认证、获取租户、选定租户、获取用户资料与菜单、进入管理平台。
 * 用户资料和菜单接口都依赖租户 ID，因此不能调换租户初始化顺序。
 */
const submit = async () => {
  if (submitting.value) return

  submitting.value = true
  try {
    // 第一步：认证成功后将令牌写入 Cookie。
    await accountLogin({ ...formState })
    // 第二步：清除可能残留的旧租户，并建立新租户上下文。
    currentTenant.$reset()
    await currentTenant.initializeTenant()
    // 第三步：此时请求拦截器已能写入租户 ID，可并行获取用户资料和菜单树。
    await Promise.all([currentUser.getUserInfo(), currentUser.getUserRoles(), currentMenus.getUserMenus()])
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    loginFailCount.value++
    if (loginFailCount.value >= configStore.security.captcha.triggerOnFailCount) {
      generateCaptchaText()
    }
    // 任一初始化阶段失败都回滚整个登录会话。
    clearSession()
    await clearStore()
    if (error instanceof Error && error.message) {
      message.error(error.message)
    }
    // Request interceptor presents the server-provided login error.
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 页面背景使用 32px 网格，呼应 Dense Utility 的精密工具感。 */
.login-page {
  display: grid;
  width: 100%;
  min-height: 100vh;
  padding: 48px;
  place-items: center;
  background-color: #e9edf2;
  background-image:
    linear-gradient(#dce1e8 1px, transparent 1px),
    linear-gradient(90deg, #dce1e8 1px, transparent 1px);
  background-size: 32px 32px;
}

/* 登录主容器。 */
.login-shell {
  display: grid;
  width: min(860px, calc(100vw - 96px));
  min-height: 480px;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border: 1px solid #bec6d2;
  border-radius: var(--du-radius-md);
  background: var(--du-bg-surface);
  box-shadow: 0 14px 36px rgba(36, 44, 58, 0.12);
}

/* 左侧深色系统信息面板。 */
.system-panel {
  display: flex;
  flex-direction: column;
  padding: 32px;
  color: #b9c2d1;
  border-right: 1px solid #10131a;
  background: var(--du-sidebar);
}

/* 品牌标识区。 */
.brand {
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
}

.brand-logo-img {
  display: block;
  max-width: 120px;
  max-height: 28px;
  object-fit: contain;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #fff;
  border: 1px solid #5079db;
  border-radius: var(--du-radius-sm);
  background: #2d5ec4;
  font-size: 14px;
  font-weight: 800;
}

.brand > div {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand strong {
  color: #fff;
  font-size: 12px;
}

.brand small {
  margin-top: 4px;
  color: #778196;
  font-size: 9px;
}

/* 平台介绍文案。 */
.system-copy {
  margin-top: 76px;
}

.eyebrow {
  margin: 0 0 var(--du-space-2);
  color: #748095;
  font-family: var(--du-font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.system-copy h1 {
  margin: 0;
  color: #fff;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.03em;
}

.system-copy > p:last-child {
  margin: var(--du-space-2) 0 0;
  color: #8d98aa;
  font-size: 12px;
}

/* 运行环境数据栅格。 */
.system-facts {
  display: grid;
  grid-template-columns: 1.3fr 1fr 0.7fr;
  margin: 32px 0 0;
  padding: var(--du-space-3) 0;
  border-top: 1px solid var(--du-sidebar-border);
  border-bottom: 1px solid var(--du-sidebar-border);
}

.system-facts div + div {
  padding-left: var(--du-space-3);
  border-left: 1px solid var(--du-sidebar-border);
}

.system-facts dt {
  color: #626d80;
  font-family: var(--du-font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.system-facts dd {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 6px 0 0;
  color: #b9c2d1;
  font-size: 9px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--runtime-environment-color, #36ad5c);
}

/* 安全连接提示固定在左侧面板底部。 */
.system-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  color: #687387;
  font-size: 9px;
}

/* 右侧登录表单区。 */
.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 56px;
}

.form-header {
  margin-bottom: var(--du-space-6);
}

.form-header h2 {
  margin: 0;
  color: var(--du-text);
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.form-header > p:last-child {
  margin: 6px 0 0;
  color: var(--du-text-secondary);
  font-size: 11px;
}

/* 统一表单项和 Ant Design Vue 输入控件尺寸。 */
.form-panel :deep(.ant-form-item) {
  margin-bottom: var(--du-space-4);
}

.form-panel :deep(.ant-form-item-label > label) {
  color: var(--du-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.form-panel :deep(.ant-input-affix-wrapper) {
  height: 36px;
}

.form-panel :deep(.ant-input-prefix) {
  margin-right: var(--du-space-2);
  color: var(--du-text-muted);
}

.submit-button {
  height: 36px;
  margin-top: var(--du-space-2);
}

/* 表单底部安全审计说明。 */
.access-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: var(--du-space-6);
  padding: var(--du-space-2);
  color: var(--du-text-muted);
  border: 1px solid var(--du-border);
  border-radius: var(--du-radius-sm);
  background: var(--du-bg-subtle);
  font-size: 9px;
  line-height: 1.45;
}

.access-note :deep(.anticon) {
  margin-top: 2px;
}

/* 全局页脚固定在右下角。 */
.page-footer {
  position: fixed;
  right: 24px;
  bottom: 18px;
  display: flex;
  align-items: center;
  gap: var(--du-space-2);
  color: #7b8493;
  font-size: 9px;
}

.page-footer .separator {
  width: 1px;
  height: 10px;
  background: #bdc4cf;
}

.page-footer b {
  color: var(--du-positive);
  font-weight: 600;
}

.captcha-wrapper {
  display: flex;
  gap: var(--du-space-2);
  align-items: center;
}
.captcha-input {
  flex: 1;
}
.captcha-box {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 90px;
  height: 36px;
  color: #2d5ec4;
  border: 1px solid #bec6d2;
  border-radius: var(--du-radius-sm);
  background: #edf2fc;
  font-family: var(--du-font-mono);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  user-select: none;
}
.captcha-box:hover {
  background: #e1ecf7;
}
</style>
