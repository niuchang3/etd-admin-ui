import openaiLogo from '@/assets/images/providers/openai.png'
import anthropicLogo from '@/assets/images/providers/anthropic.png'
import claudeLogo from '@/assets/images/providers/claude.png'
import qwenLogo from '@/assets/images/providers/qwen.png'
import deepseekLogo from '@/assets/images/providers/deepseek.png'
import geminiLogo from '@/assets/images/providers/gemini.png'
import ollamaLogo from '@/assets/images/providers/ollama.png'
import baiduLogo from '@/assets/images/providers/baidu.png'
import zhipuLogo from '@/assets/images/providers/zhipu.png'

/** 本地 PNG 品牌素材，来源及许可见 assets/images/providers/SOURCES.md。 */
export const PROVIDER_LOGO_MAP: Record<string, string> = {
  openai: openaiLogo,
  anthropic: anthropicLogo,
  claude: claudeLogo,
  qwen: qwenLogo,
  aliyun: qwenLogo,
  dashscope: qwenLogo,
  deepseek: deepseekLogo,
  gemini: geminiLogo,
  google: geminiLogo,
  ollama: ollamaLogo,
  baidu: baiduLogo,
  wenxin: baiduLogo,
  zhipu: zhipuLogo,
}

export interface ProviderTheme {
  primaryColor: string
  bgGradient: string
  headerBg: string
  badgeColor: string
  textColor: string
}

/**
 * 前端预设的主流 AI 品牌柔和展台主题色调与背景
 */
export const PROVIDER_THEMES: Record<string, ProviderTheme> = {
  openai: {
    primaryColor: '#10a37f',
    bgGradient: 'linear-gradient(180deg, #f2f8f5 0%, #f9fbf9 100%)',
    headerBg: '#f2f8f5',
    badgeColor: '#10a37f',
    textColor: '#0f766e',
  },
  anthropic: {
    primaryColor: '#d97706',
    bgGradient: 'linear-gradient(180deg, #faf4eb 0%, #fdfaf5 100%)',
    headerBg: '#faf4eb',
    badgeColor: '#d97706',
    textColor: '#b45309',
  },
  claude: {
    primaryColor: '#d97706',
    bgGradient: 'linear-gradient(180deg, #faf4eb 0%, #fdfaf5 100%)',
    headerBg: '#faf4eb',
    badgeColor: '#d97706',
    textColor: '#b45309',
  },
  aliyun: {
    primaryColor: '#6366f1',
    bgGradient: 'linear-gradient(180deg, #f6f3fe 0%, #faf8ff 100%)',
    headerBg: '#f6f3fe',
    badgeColor: '#6366f1',
    textColor: '#4338ca',
  },
  dashscope: {
    primaryColor: '#6366f1',
    bgGradient: 'linear-gradient(180deg, #f6f3fe 0%, #faf8ff 100%)',
    headerBg: '#f6f3fe',
    badgeColor: '#6366f1',
    textColor: '#4338ca',
  },
  qwen: {
    primaryColor: '#6366f1',
    bgGradient: 'linear-gradient(180deg, #f6f3fe 0%, #faf8ff 100%)',
    headerBg: '#f6f3fe',
    badgeColor: '#6366f1',
    textColor: '#4338ca',
  },
  deepseek: {
    primaryColor: '#1d4ed8',
    bgGradient: 'linear-gradient(180deg, #f0f7ff 0%, #f6faff 100%)',
    headerBg: '#f0f7ff',
    badgeColor: '#1d4ed8',
    textColor: '#1e40af',
  },
  google: {
    primaryColor: '#2563eb',
    bgGradient: 'linear-gradient(180deg, #f0f5fe 0%, #f8faff 100%)',
    headerBg: '#f0f5fe',
    badgeColor: '#2563eb',
    textColor: '#1d4ed8',
  },
  gemini: {
    primaryColor: '#2563eb',
    bgGradient: 'linear-gradient(180deg, #f0f5fe 0%, #f8faff 100%)',
    headerBg: '#f0f5fe',
    badgeColor: '#2563eb',
    textColor: '#1d4ed8',
  },
  ollama: {
    primaryColor: '#1e293b',
    bgGradient: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
    headerBg: '#f8fafc',
    badgeColor: '#1e293b',
    textColor: '#334155',
  },
  baidu: {
    primaryColor: '#2563eb',
    bgGradient: 'linear-gradient(180deg, #f0f5fe 0%, #f8faff 100%)',
    headerBg: '#f0f5fe',
    badgeColor: '#2563eb',
    textColor: '#1d4ed8',
  },
  wenxin: {
    primaryColor: '#2563eb',
    bgGradient: 'linear-gradient(180deg, #f0f5fe 0%, #f8faff 100%)',
    headerBg: '#f0f5fe',
    badgeColor: '#2563eb',
    textColor: '#1d4ed8',
  },
  zhipu: {
    primaryColor: '#2563eb',
    bgGradient: 'linear-gradient(180deg, #f0f6ff 0%, #fafcff 100%)',
    headerBg: '#f0f6ff',
    badgeColor: '#2563eb',
    textColor: '#1d4ed8',
  },
}

export const DEFAULT_PROVIDER_THEME: ProviderTheme = {
  primaryColor: '#4f46e5',
  bgGradient: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
  headerBg: '#f8fafc',
  badgeColor: '#4f46e5',
  textColor: '#4338ca',
}

/**
 * 品牌规范化展示名称映射
 */
export const BRAND_DISPLAY_NAME_MAP: Record<string, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  qwen: '通义千问',
  aliyun: '通义千问',
  dashscope: '通义千问',
  anthropic: 'Anthropic',
  claude: 'Anthropic',
  gemini: 'Gemini',
  google: 'Gemini',
  ollama: 'ollama',
  baidu: '文心一言',
  wenxin: '文心一言',
  zhipu: '智谱 AI',
}

/**
 * 根据服务商编码获取柔和品牌配色方案
 */
export const getProviderTheme = (providerCode?: string): ProviderTheme => {
  if (!providerCode) return DEFAULT_PROVIDER_THEME
  const key = providerCode.toLowerCase().trim()
  return PROVIDER_THEMES[key] || DEFAULT_PROVIDER_THEME
}
