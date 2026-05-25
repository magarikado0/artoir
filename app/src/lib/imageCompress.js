const SKIP_TYPES = new Set(['image/gif'])
const MIN_REENCODE_BYTES = 400 * 1024

export function calculateDimensions(sourceWidth, sourceHeight, maxDimension) {
  const longest = Math.max(sourceWidth, sourceHeight)
  if (longest <= maxDimension) {
    return { width: sourceWidth, height: sourceHeight }
  }
  const ratio = maxDimension / longest
  return {
    width: Math.round(sourceWidth * ratio),
    height: Math.round(sourceHeight * ratio),
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像の読み込みに失敗しました'))
    }
    image.src = url
  })
}

function getOutputMimeType(inputType) {
  if (inputType === 'image/png') return 'image/png'
  if (inputType === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

function getExtension(mimeType) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('画像の圧縮に失敗しました'))
        return
      }
      resolve(blob)
    }, mimeType, quality)
  })
}

function buildCompressedFile(blob, originalName, mimeType) {
  const baseName = originalName?.replace(/\.[^.]+$/, '') || 'image'
  const extension = getExtension(mimeType)
  return new File([blob], `${baseName}.${extension}`, { type: mimeType, lastModified: Date.now() })
}

/**
 * アップロード前に画像をリサイズ・再エンコードしてファイルサイズを抑える。
 * GIF（アニメーション）はそのまま返す。
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxDimension = 1920,
    quality = 0.82,
  } = options

  if (!file?.type?.startsWith('image/') || SKIP_TYPES.has(file.type)) {
    return file
  }

  const image = await loadImageFromFile(file)
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  if (!naturalWidth || !naturalHeight) return file

  const { width, height } = calculateDimensions(naturalWidth, naturalHeight, maxDimension)
  const needsResize = width !== naturalWidth || height !== naturalHeight
  const needsReencode = file.size >= MIN_REENCODE_BYTES || needsResize

  if (!needsReencode) return file

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return file

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const outputMimeType = getOutputMimeType(file.type)
  const outputQuality = outputMimeType === 'image/jpeg' ? quality : undefined
  const blob = await canvasToBlob(canvas, outputMimeType, outputQuality)

  if (blob.size >= file.size && !needsResize) return file

  return buildCompressedFile(blob, file.name, outputMimeType)
}
