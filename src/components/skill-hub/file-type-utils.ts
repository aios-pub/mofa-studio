/**
 * File Type Utilities
 * Provides file type detection and icon mapping for file tree display
 */

import { FileText, FileCode, File, Image, Music, Video, Archive } from 'lucide-react'

export type IconComponentType = typeof File

/**
 * Maps file extensions to icon components
 */
const FILE_ICONS: Record<string, IconComponentType> = {
  // Text files
  txt: FileText,
  md: FileText,
  readme: FileText,
  license: FileText,
  changelog: FileText,

  // Code files
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  py: FileCode,
  rs: FileCode,
  go: FileCode,
  java: FileCode,
  cpp: FileCode,
  c: FileCode,
  cs: FileCode,
  php: FileCode,
  rb: FileCode,
  kt: FileCode,
  swift: FileCode,
  scala: FileCode,

  // Config files
  json: FileCode,
  xml: FileCode,
  yaml: FileCode,
  yml: FileCode,
  toml: FileCode,
  ini: FileCode,
  conf: FileCode,
  config: FileCode,

  // Web files
  html: FileCode,
  css: FileCode,
  scss: FileCode,
  less: FileCode,
  sass: FileCode,

  // Media files
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  svg: Image,
  webp: Image,
  ico: Image,

  mp3: Music,
  wav: Music,
  ogg: Music,
  flac: Music,

  mp4: Video,
  avi: Video,
  mkv: Video,
  webm: Video,
  mov: Video,

  // Archives
  zip: Archive,
  tar: Archive,
  gz: Archive,
  rar: Archive,
  '7z': Archive,
}

/**
 * Gets the appropriate icon component for a file based on its name/extension
 *
 * @param fileName - The file name to analyze
 * @returns Lucide icon component
 */
export function getFileIcon(fileName: string): IconComponentType {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const name = fileName.toLowerCase()

  // Check for special filenames first
  if (name === 'readme.md' || name === 'readme') return FILE_ICONS.readme
  if (name === 'license' || name === 'license.md') return FILE_ICONS.license
  if (name === 'changelog' || name === 'changelog.md') return FILE_ICONS.changelog

  // Then check by extension
  return FILE_ICONS[ext] || File
}

/**
 * Gets a human-readable file type category
 *
 * @param fileName - The file name to analyze
 * @returns File type category string
 */
export function getFileCategory(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const name = fileName.toLowerCase()

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return 'image'
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return 'audio'
  }
  if (['mp4', 'avi', 'mkv', 'webm', 'mov'].includes(ext)) {
    return 'video'
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return 'archive'
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'rs', 'go', 'java'].includes(ext)) {
    return 'code'
  }
  if (['json', 'xml', 'yaml', 'yml', 'toml'].includes(ext)) {
    return 'config'
  }

  return 'file'
}
