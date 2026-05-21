function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    image.src = src
  })
}

function normalizeMimeType(mimeType) {
  if (mimeType === 'image/png' || mimeType === 'image/webp' || mimeType === 'image/jpeg') return mimeType
  return 'image/jpeg'
}

function calculateDimensions(sourceWidth, sourceHeight, maxWidth) {
  if (sourceWidth <= maxWidth) return { width: sourceWidth, height: sourceHeight }
  const ratio = maxWidth / sourceWidth
  return {
    width: Math.round(sourceWidth * ratio),
    height: Math.round(sourceHeight * ratio),
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

  const targetMimeType = normalizeMimeType(mimeType)
  const quality = targetMimeType === 'image/jpeg' ? 0.8 : undefined

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
