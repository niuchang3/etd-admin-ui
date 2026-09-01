import { ref, onMounted } from 'vue'
import { getEnabledDictData } from '@/apis/upms/dict'
import type { SystemDictData } from '@/apis/upms/dict/type'
import { getSystemDictLabel, toSystemDictOptions, type SystemDictOption } from '@/utils/SystemDict'

export interface UseSystemDictOptions {
  /** 是否在 onMounted 时自动加载传入的字典项，默认为 true */
  immediate?: boolean
}

/**
 * 字典加载与数据转换通用 Hook
 * @param typeCodes 需要预先加载的字典类型编码数组
 * @param options 配置项
 */
export const useSystemDict = (typeCodes: string[] = [], options: UseSystemDictOptions = {}) => {
  const { immediate = true } = options
  const loading = ref(false)
  const dictMap = ref<Record<string, SystemDictData[]>>({})

  /**
   * 加载指定的一个或多个字典类型
   */
  const loadDicts = async (codes: string[] = typeCodes) => {
    const targetCodes = Array.from(new Set(codes.filter(Boolean)))
    if (targetCodes.length === 0) return

    loading.value = true
    try {
      const responses = await Promise.all(
        targetCodes.map((code) => getEnabledDictData(code))
      )
      targetCodes.forEach((code, index) => {
        dictMap.value[code] = responses[index]?.data || []
      })
    } catch (err) {
      console.warn('加载系统字典失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取指定类型的字典项列表
   */
  const getDict = (typeCode: string): SystemDictData[] => {
    return dictMap.value[typeCode] || []
  }

  /**
   * 将指定字典类型的字典项转换为控件选项（如 Select、Radio）
   */
  const getOptions = <T = string>(
    typeCode: string,
    convert: (val: string) => T = (val) => val as unknown as T
  ): SystemDictOption<T>[] => {
    const items = getDict(typeCode)
    return toSystemDictOptions(items, convert)
  }

  /**
   * 翻译指定字典类型的值为对应的显示标签
   */
  const getLabel = (typeCode: string, value: unknown): string => {
    const items = getDict(typeCode)
    return getSystemDictLabel(items, value)
  }

  if (immediate && typeCodes.length > 0) {
    onMounted(() => {
      void loadDicts(typeCodes)
    })
  }

  return {
    dictMap,
    loading,
    loadDicts,
    getDict,
    getOptions,
    getLabel,
  }
}
