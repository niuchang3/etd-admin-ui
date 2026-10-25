import { ref, computed } from 'vue'
import {
  getSquareConnections,
  getSquareConnectionDetail,
  getSquareModelDetail,
  getSquareModelPage,
} from '@/apis/ai/square'
import type { SquareConnectionRecord, SquareModelRecord } from '@/apis/ai/square/type'
import { useSystemDict } from '@/composables/useSystemDict'
import { AI_DICT_TYPE, COMMON_STATUS } from '@/constant'

const ALLOWED_DIMENSIONS = [768, 1024, 1536]

export interface ConnectionOption {
  id: string
  modelId: string
  modelName: string
  modelCode: string
  modelType: string
  providerCode: string
  providerName: string
  remark?: string | null
  embeddingDimensions: number[]
  label: string
}

export const useModelConnections = () => {
  const { getLabel: getDictLabel } = useSystemDict([AI_DICT_TYPE.MODEL_PROVIDER])

  const loading = ref(false)
  const isForbidden = ref(false)
  const connections = ref<SquareConnectionRecord[]>([])
  const models = ref<SquareModelRecord[]>([])

  const invalidRerankConnection = ref(false)
  const invalidRerankReason = ref<string | null>(null)

  const getProviderName = (code: string) => {
    return getDictLabel(AI_DICT_TYPE.MODEL_PROVIDER, code) || code || '未知服务商'
  }

  const loadConnectionsAndModels = async () => {
    loading.value = true
    isForbidden.value = false
    try {
      // 1. 查询启用的全部连接
      const connPromise = getSquareConnections({ dataStatus: COMMON_STATUS.ENABLED })

      // 2. 分页循环加载全部模型，避免默认第一页遗漏
      const loadAllModels = async () => {
        let current = 1
        const size = 200
        let allModels: SquareModelRecord[] = []
        let total = 0
        do {
          const modelRes = await getSquareModelPage({ current, size })
          const data = modelRes.data
          const records = data?.records || []
          if (!records.length) break
          total = data?.total || records.length
          allModels = allModels.concat(records)
          current += 1
        } while (allModels.length < total && current <= Math.ceil(total / size))
        return allModels
      }

      const [connRes, allModels] = await Promise.all([connPromise, loadAllModels()])

      const rawConnData = connRes.data as any
      const connList: SquareConnectionRecord[] = Array.isArray(rawConnData)
        ? rawConnData
        : (Array.isArray(rawConnData?.records) ? rawConnData.records : [])

      connections.value = connList
      models.value = allModels.filter((m) => m.dataStatus !== 0)
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.status === 403 || err?.code === 403) {
        isForbidden.value = true
      }
      console.error('加载模型连接器与模型信息失败', err)
    } finally {
      loading.value = false
    }
  }

  const modelMap = computed(() => {
    const map = new Map<string, SquareModelRecord>()
    models.value.forEach((m) => {
      map.set(String(m.id), m)
    })
    return map
  })

  // 融合连接信息与模型信息
  const enrichedConnections = computed<ConnectionOption[]>(() => {
    return connections.value.map((c) => {
      const model = modelMap.value.get(String(c.modelId))
      const modelName = c.modelName || model?.modelName || '未知模型'
      const modelCode = c.modelCode || model?.modelCode || ''
      const modelType = c.modelType || model?.modelType || ''
      const providerCode = c.providerCode || model?.providerCode || ''
      const providerName = getProviderName(providerCode)
      const embeddingDimensions = Array.isArray(model?.embedding) ? model.embedding : []

      const desc = c.remark ? ` - ${c.remark}` : ''
      const label = `${modelName}${desc} (${providerName})`

      return {
        id: String(c.id),
        modelId: String(c.modelId),
        modelName,
        modelCode,
        modelType,
        providerCode,
        providerName,
        remark: c.remark,
        embeddingDimensions,
        label,
      }
    })
  })

  // 向量连接选项（模型类型为 embedding）
  const embeddingConnectionOptions = computed(() => {
    return enrichedConnections.value.filter(
      (c) => c.modelType.toLowerCase() === 'embedding'
    )
  })

  // 重排连接选项（所有重排序模型连接，不再限制服务商）
  const rerankConnectionOptions = computed(() => {
    return enrichedConnections.value.filter(
      (c) => c.modelType.toLowerCase() === 'rerank'
    )
  })

  // 检查并回显已保存的重排连接
  const echoRerankConnection = async (connectionId: string) => {
    if (!connectionId) {
      invalidRerankConnection.value = false
      invalidRerankReason.value = null
      return null
    }

    // 若当前已在候选列表中
    const exists = rerankConnectionOptions.value.find((c) => c.id === String(connectionId))
    if (exists) {
      invalidRerankConnection.value = false
      invalidRerankReason.value = null
      return exists
    }

    // 若不在候选列表中，单查详情验证连接与模型状态
    try {
      const connRes = await getSquareConnectionDetail(String(connectionId))
      const conn = connRes.data
      if (!conn || conn.dataStatus !== COMMON_STATUS.ENABLED) {
        invalidRerankConnection.value = true
        invalidRerankReason.value = '当前知识库已保存的重排连接已停用或失效，请重新选择可用连接'
        return null
      }

      const modelRes = await getSquareModelDetail(String(conn.modelId))
      const model = modelRes.data
      if (!model || model.dataStatus === 0) {
        invalidRerankConnection.value = true
        invalidRerankReason.value = '当前知识库已保存的重排模型已停用，请重新选择可用连接'
        return null
      }

      invalidRerankConnection.value = false
      invalidRerankReason.value = null

      // 加入模型与连接列表
      if (!models.value.some((m) => String(m.id) === String(model.id))) {
        models.value.unshift(model)
      }
      if (!connections.value.some((c) => String(c.id) === String(conn.id))) {
        connections.value.unshift(conn)
      }

      return rerankConnectionOptions.value.find((c) => c.id === String(connectionId)) || null
    } catch {
      invalidRerankConnection.value = true
      invalidRerankReason.value = '无法获取已保存重排连接的详细数据，连接可能已被删除，请重新选择可用连接'
      return null
    }
  }

  // 根据选中的向量连接 ID，获取与 [768, 1024, 1536] 的交集可选维度
  const getDimensionsForConnection = (connectionId: string | null | undefined): number[] => {
    if (!connectionId) return ALLOWED_DIMENSIONS
    const conn = enrichedConnections.value.find((c) => c.id === String(connectionId))
    if (!conn || !conn.embeddingDimensions?.length) {
      return ALLOWED_DIMENSIONS
    }
    const intersection = conn.embeddingDimensions.filter((dim) =>
      ALLOWED_DIMENSIONS.includes(dim)
    )
    return intersection.length ? intersection : ALLOWED_DIMENSIONS
  }

  // 根据连接 ID 获取展示标签
  const getConnectionLabel = (connectionId: string | null | undefined): string => {
    if (!connectionId) return '未配置'
    const found = enrichedConnections.value.find((c) => c.id === String(connectionId))
    return found ? found.label : `连接 ${connectionId}`
  }

  return {
    loading,
    isForbidden,
    loadConnectionsAndModels,
    embeddingConnectionOptions,
    rerankConnectionOptions,
    invalidRerankConnection,
    invalidRerankReason,
    echoRerankConnection,
    getDimensionsForConnection,
    getConnectionLabel,
  }
}
