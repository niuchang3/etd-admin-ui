import { confirmKnowledgePart, getKnowledgePartUrl } from '@/apis/ai/document'
import type { KnowledgeDocumentDetail, UploadPart } from '@/apis/ai/document/type'

export function calculateFileHash(file: File, signal: AbortSignal, onProgress: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module' })
    const cleanup = () => { worker.terminate(); signal.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); reject(new DOMException('已暂停', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    worker.onmessage = (event: MessageEvent<{ progress?: number; digest?: string; error?: string }>) => {
      if (event.data.progress !== undefined) onProgress(event.data.progress)
      if (event.data.digest) { cleanup(); resolve(event.data.digest) }
      if (event.data.error) { cleanup(); reject(new Error(event.data.error)) }
    }
    worker.onerror = () => { cleanup(); reject(new Error('文件摘要计算失败，请重新选择文件')) }
    worker.postMessage(file)
  })
}

/** 对象存储直传：禁止走应用请求实例、携带 JWT 或凭证。 */
async function putPart(url: string, body: Blob, signal: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 120_000)
  try {
    if (signal.aborted) abort()
    const response = await fetch(url, { method: 'PUT', body, signal: controller.signal, credentials: 'omit' })
    if (!response.ok) throw new Error(`分片传输失败（HTTP ${response.status}），可重试失败分片`)
    const etag = response.headers.get('ETag')
    if (!etag) throw new Error('对象存储未返回可读取的 ETag，请检查 MinIO CORS 的 ETag 暴露配置')
    return etag
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

export async function uploadMissingParts(
  file: File, detail: KnowledgeDocumentDetail, signal: AbortSignal,
  canWrite: () => boolean, onProgress: (parts: UploadPart[]) => void,
) {
  const confirmed = new Map((detail.uploadParts || []).map((part) => [part.partNumber, part]))
  const pending = Array.from({ length: detail.partCount }, (_, index) => index + 1).filter((number) => !confirmed.has(number))
  const assertActive = () => {
    if (signal.aborted || !canWrite()) throw new DOMException('已暂停', 'AbortError')
  }
  // 单个会话最多两个分片并发；重试时总是重新申请签名地址。
  let cursor = 0
  let stopped = false
  let failure: unknown
  async function loadPart() {
    while (!stopped && cursor < pending.length) {
      assertActive()
      const number = pending[cursor++]
      const partSizeBytes = Number(detail.partSizeBytes)
      const start = (number - 1) * partSizeBytes
      const body = file.slice(start, Math.min(start + partSizeBytes, file.size))
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          assertActive()
          const { data: url } = await getKnowledgePartUrl(detail.id, number)
          assertActive()
          const etag = await putPart(url, body, signal)
          assertActive()
          await confirmKnowledgePart(detail.id, number, etag)
          confirmed.set(number, { partNumber: number, etag, size: body.size })
          onProgress(Array.from(confirmed.values()))
          break
        } catch (error) {
          if (signal.aborted || !canWrite() || attempt === 2) {
            failure = error; stopped = true; return
          }
        }
      }
    }
  }
  // 等待所有在途分片收束后才允许用户继续或取消，避免旧回执污染新一轮进度。
  const results = await Promise.allSettled([loadPart(), loadPart()])
  const rejected = results.find((result) => result.status === 'rejected')
  if (failure) throw failure
  if (rejected?.status === 'rejected') throw rejected.reason
  assertActive()
}
