import type { Component } from 'vue'
import {
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileImageOutlined,
  FileZipOutlined,
  CustomerServiceOutlined,
  PlaySquareOutlined,
  TableOutlined,
  FileOutlined,
} from '@ant-design/icons-vue'

export interface FileTypeMeta {
  icon: Component
  color: string
  label: string
}

export const DEFAULT_FILE_META: FileTypeMeta = {
  icon: FileOutlined,
  color: '#8c95a6',
  label: '文件',
}

/**
 * 文件扩展名到图标与语义颜色的集中映射表
 * 统一收敛，便于全局统一维护与拓展
 */
export const FILE_TYPE_MAP: Record<string, FileTypeMeta> = {
  // PDF
  pdf: { icon: FilePdfOutlined, color: '#ef4444', label: 'PDF' },

  // Word 文档
  doc: { icon: FileWordOutlined, color: '#2563eb', label: 'Word' },
  docx: { icon: FileWordOutlined, color: '#2563eb', label: 'Word' },

  // Excel 表格
  xls: { icon: FileExcelOutlined, color: '#16a34a', label: 'Excel' },
  xlsx: { icon: FileExcelOutlined, color: '#16a34a', label: 'Excel' },

  // 演示文稿
  ppt: { icon: FilePptOutlined, color: '#ea580c', label: 'PPT' },
  pptx: { icon: FilePptOutlined, color: '#ea580c', label: 'PPT' },

  // 纯文本
  txt: { icon: FileTextOutlined, color: '#64748b', label: 'TXT' },

  // Markdown
  md: { icon: FileMarkdownOutlined, color: '#6366f1', label: 'Markdown' },
  markdown: { icon: FileMarkdownOutlined, color: '#6366f1', label: 'Markdown' },

  // 表格数据 CSV
  csv: { icon: TableOutlined, color: '#0d9488', label: 'CSV' },

  // 图片格式
  png: { icon: FileImageOutlined, color: '#8b5cf6', label: 'PNG' },
  jpg: { icon: FileImageOutlined, color: '#8b5cf6', label: 'JPG' },
  jpeg: { icon: FileImageOutlined, color: '#8b5cf6', label: 'JPEG' },
  gif: { icon: FileImageOutlined, color: '#8b5cf6', label: 'GIF' },
  webp: { icon: FileImageOutlined, color: '#8b5cf6', label: 'WEBP' },
  bmp: { icon: FileImageOutlined, color: '#8b5cf6', label: 'BMP' },
  svg: { icon: FileImageOutlined, color: '#8b5cf6', label: 'SVG' },
  ico: { icon: FileImageOutlined, color: '#8b5cf6', label: 'ICO' },
  tif: { icon: FileImageOutlined, color: '#8b5cf6', label: 'TIF' },
  tiff: { icon: FileImageOutlined, color: '#8b5cf6', label: 'TIFF' },

  // 压缩文件
  zip: { icon: FileZipOutlined, color: '#d97706', label: 'ZIP' },
  rar: { icon: FileZipOutlined, color: '#d97706', label: 'RAR' },
  '7z': { icon: FileZipOutlined, color: '#d97706', label: '7Z' },
  gz: { icon: FileZipOutlined, color: '#d97706', label: 'GZ' },
  tar: { icon: FileZipOutlined, color: '#d97706', label: 'TAR' },
  bz2: { icon: FileZipOutlined, color: '#d97706', label: 'BZ2' },
  xz: { icon: FileZipOutlined, color: '#d97706', label: 'XZ' },

  // 音频文件
  mp3: { icon: CustomerServiceOutlined, color: '#06b6d4', label: 'MP3' },
  wav: { icon: CustomerServiceOutlined, color: '#06b6d4', label: 'WAV' },
  flac: { icon: CustomerServiceOutlined, color: '#06b6d4', label: 'FLAC' },
  aac: { icon: CustomerServiceOutlined, color: '#06b6d4', label: 'AAC' },
  ogg: { icon: CustomerServiceOutlined, color: '#06b6d4', label: 'OGG' },
  m4a: { icon: CustomerServiceOutlined, color: '#06b6d4', label: 'M4A' },

  // 视频文件
  mp4: { icon: PlaySquareOutlined, color: '#ec4899', label: 'MP4' },
  avi: { icon: PlaySquareOutlined, color: '#ec4899', label: 'AVI' },
  mov: { icon: PlaySquareOutlined, color: '#ec4899', label: 'MOV' },
  mkv: { icon: PlaySquareOutlined, color: '#ec4899', label: 'MKV' },
  webm: { icon: PlaySquareOutlined, color: '#ec4899', label: 'WEBM' },
}

/**
 * 根据文件类型获取对应的图标组件与样式配置
 * 直接基于后端返回的 fileType 判断，无需猜测或从文件名反推
 */
export function getFileTypeMeta(rawType?: string | null): FileTypeMeta {
  if (!rawType || typeof rawType !== 'string') return DEFAULT_FILE_META
  const normalized = rawType.trim().toLowerCase().replace(/^\.+/, '')
  if (!normalized || normalized === 'unknown') return DEFAULT_FILE_META
  return FILE_TYPE_MAP[normalized] || DEFAULT_FILE_META
}
