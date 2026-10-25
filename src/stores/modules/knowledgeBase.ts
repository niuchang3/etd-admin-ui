import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getKnowledgeBaseDetail } from '@/apis/ai/knowledge-base'
import type { KnowledgeBaseDetail } from '@/apis/ai/knowledge-base/type'

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  const currentKb = ref<KnowledgeBaseDetail | null>(null)
  const loadingKb = ref(false)
  const loadFailed = ref(false)

  // 记录知识库卡片列表的筛选条件和页码，确保“返回主菜单”时无缝恢复
  const listQuery = ref({
    current: 1,
    size: 12,
    keyword: '',
  })

  const setListQuery = (query: Partial<typeof listQuery.value>) => {
    listQuery.value = { ...listQuery.value, ...query }
  }

  const loadKbDetail = async (id: string, force = false): Promise<KnowledgeBaseDetail | null> => {
    if (!force && currentKb.value && String(currentKb.value.id) === String(id)) {
      return currentKb.value
    }
    loadingKb.value = true
    loadFailed.value = false
    try {
      const response = await getKnowledgeBaseDetail(id)
      currentKb.value = response.data || null
      return currentKb.value
    } catch {
      loadFailed.value = true
      return null
    } finally {
      loadingKb.value = false
    }
  }

  const clearCurrentKb = () => {
    currentKb.value = null
    loadFailed.value = false
  }

  const $reset = () => {
    currentKb.value = null
    loadingKb.value = false
    loadFailed.value = false
    listQuery.value = { current: 1, size: 12, keyword: '' }
  }

  return {
    currentKb,
    loadingKb,
    loadFailed,
    listQuery,
    setListQuery,
    loadKbDetail,
    clearCurrentKb,
    $reset,
  }
})
