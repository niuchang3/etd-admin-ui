import { Sha256 } from './sha256'
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const file = event.data
    const hash = new Sha256()
    const readSize = 4 * 1024 * 1024
    for (let offset = 0; offset < file.size; offset += readSize) {
      hash.update(new Uint8Array(await file.slice(offset, offset + readSize).arrayBuffer()))
      self.postMessage({ progress: Math.min(100, Math.round((offset + readSize) / file.size * 100)) })
    }
    self.postMessage({ digest: hash.digest() })
  } catch {
    self.postMessage({ error: '文件读取失败，请重新选择文件' })
  }
}
