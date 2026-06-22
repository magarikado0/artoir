import { calculateDimensions } from './imageCompress'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    image.src = src
  })
}

function getRotatedSize(width, height, degrees) {
  const radians = Math.abs(degrees * Math.PI / 180)
  return {
    width: Math.ceil(Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))),
    height: Math.ceil(Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))),
  }
}

/** 元画像全体を中心基準で回転し、切り抜き操作用の画像を生成する */
export async function getRotatedBlob(imageSrc, degrees, mimeType = 'image/jpeg') {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error('キャンバスを初期化できませんでした')

  const size = getRotatedSize(image.naturalWidth, image.naturalHeight, degrees)
  canvas.width = size.width
  canvas.height = size.height

  context.translate(size.width / 2, size.height / 2)
  context.rotate(degrees * Math.PI / 180)
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

  const targetMimeType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const quality = targetMimeType === 'image/jpeg' ? 0.92 : undefined

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('画像の回転に失敗しました'))
        return
      }
      resolve(blob)
    }, targetMimeType, quality)
  })
}

/** 画面上の crop（表示サイズ基準）を原画像のピクセル座標に変換する */
export function scaleCropToNaturalSize(pixelCrop, image) {
  if (!pixelCrop?.width || !pixelCrop?.height || !image?.naturalWidth) {
    return null
  }
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  return {
    x: Math.round(pixelCrop.x * scaleX),
    y: Math.round(pixelCrop.y * scaleY),
    width: Math.round(pixelCrop.width * scaleX),
    height: Math.round(pixelCrop.height * scaleY),
  }
}

export async function getCroppedBlob(imageSrc, cropPixels, mimeType = 'image/jpeg', maxWidth = 1920) {
  if (!cropPixels) throw new Error('クロップ範囲が未設定です')

  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error('キャンバスを初期化できませんでした')

  const { width: targetWidth, height: targetHeight } = calculateDimensions(
    Math.max(1, Math.round(cropPixels.width)),
    Math.max(1, Math.round(cropPixels.height)),
    maxWidth,
  )

  canvas.width = targetWidth
  canvas.height = targetHeight

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    targetWidth,
    targetHeight,
  )

  const targetMimeType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const quality = targetMimeType === 'image/jpeg' ? 0.82 : undefined

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('画像の切り抜きに失敗しました'))
        return
      }
      resolve(blob)
    }, targetMimeType, quality)
  })
}
