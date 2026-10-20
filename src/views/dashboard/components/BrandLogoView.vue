<template>
  <div class="brand-logo-view">
    <div v-if="realLogoUrl" class="brand-logo-img-box">
      <img
        :key="realLogoUrl"
        :src="realLogoUrl"
        :alt="`${displayBrandName} Logo`"
        class="brand-real-logo-img"
        @error="handleImgError"
      />
    </div>
    <div v-else class="fallback-letter-avatar">
      {{ (displayBrandName || 'AI').slice(0, 1).toUpperCase() }}
    </div>
    <span class="brand-wordmark" :class="brandWordmarkClass">{{ displayBrandName }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BRAND_DISPLAY_NAME_MAP, PROVIDER_LOGO_MAP } from '../types'

const props = defineProps<{
  providerCode?: string
  providerName?: string
  logo?: string | null
  logoPath?: string | null
}>()

const logoIndex = ref(0)

const normalizedCode = computed(() => {
  return (props.providerCode || '').toLowerCase().trim()
})

// 后端图片依次尝试，最后使用本地品牌 PNG，避免网络异常时展示近似的手绘 Logo。
const logoUrls = computed(() => {
  const urls = [props.logo, props.logoPath, PROVIDER_LOGO_MAP[normalizedCode.value]]
    .filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    .map((url) => url.trim())
  return [...new Set(urls)]
})

const realLogoUrl = computed(() => logoUrls.value[logoIndex.value] || '')

watch(logoUrls, () => {
  logoIndex.value = 0
})

const handleImgError = () => {
  logoIndex.value += 1
}

const displayBrandName = computed(() => {
  const code = normalizedCode.value
  return BRAND_DISPLAY_NAME_MAP[code] || props.providerName || props.providerCode || 'AI'
})

const brandWordmarkClass = computed(() => {
  const code = normalizedCode.value
  switch (code) {
    case 'deepseek':
      return 'deepseek-text'
    case 'openai':
      return 'openai-text'
    case 'qwen':
    case 'aliyun':
    case 'dashscope':
      return 'qwen-text'
    case 'anthropic':
    case 'claude':
      return 'claude-text'
    case 'gemini':
    case 'google':
      return 'gemini-text'
    case 'ollama':
      return 'ollama-text'
    case 'baidu':
    case 'wenxin':
      return 'baidu-text'
    case 'zhipu':
      return 'zhipu-text'
    default:
      return 'fallback-text'
  }
})
</script>

<style scoped>
.brand-logo-view {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  user-select: none;
}

/* 真实 Logo 图片展示盒子 */
.brand-logo-img-box {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
  overflow: hidden;
}

.brand-real-logo-img {
  max-width: 28px;
  max-height: 28px;
  object-fit: contain;
}

.brand-wordmark {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1;
}

/* 品牌专属字标样式 */
.deepseek-text {
  color: #1d4ed8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.openai-text {
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.qwen-text {
  color: #6366f1;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
}

.claude-text {
  color: #b45309;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 600;
}

.gemini-text {
  color: #2563eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 600;
}

.ollama-text {
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.baidu-text {
  color: #1d4ed8;
  font-weight: 600;
}

.zhipu-text {
  color: #2563eb;
  font-weight: 600;
}

.fallback-text {
  color: #0f172a;
  font-weight: 600;
  font-size: 18px;
}

.fallback-letter-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #3b82f6;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
}
</style>
