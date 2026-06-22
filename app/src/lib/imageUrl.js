const CLOUDINARY_REGEX = /res\.cloudinary\.com\/[^/]+\/image\/upload\//

function isCloudinaryUrl(url) {
  if (!url) return false
  return CLOUDINARY_REGEX.test(url)
}

function transformCloudinaryUrl(url, params) {
  if (!params.length) return url
  const transformation = params.join(',')
  return url.replace(
    'image/upload/',
    `image/upload/${transformation}/`,
  )
}

export function getResizedImageUrl(url, options = {}) {
  if (!isCloudinaryUrl(url)) return url

  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options
  const params = []

  if (width) params.push(`w_${width}`)
  if (height) params.push(`h_${height}`)
  params.push(`c_${crop}`)
  params.push(`q_${quality}`)
  params.push(`f_${format}`)

  return transformCloudinaryUrl(url, params)
}

/** 一覧・カード用（正方形枠内に収める。縦長も高さが膨らまない） */
export function getThumbnailUrl(url, size = 400) {
  return getResizedImageUrl(url, {
    width: size,
    height: size,
    crop: 'limit',
  })
}

/** 公開ページの作品グリッド（表示 ~150px 想定、Retina 用に 320） */
export function getGalleryThumbnailUrl(url) {
  return getThumbnailUrl(url, 320)
}

export function getHeroImageUrl(url, width = 800) {
  return getResizedImageUrl(url, {
    width,
    crop: 'fit',
  })
}

export function getFullImageUrl(url, maxWidth = 1400) {
  return getResizedImageUrl(url, {
    width: maxWidth,
    crop: 'fit',
  })
}

/** 作品モーダル用（ビューア最大 ~1320×620px 想定、縦長もファイルサイズを抑える） */
export function getModalImageUrl(url) {
  return getResizedImageUrl(url, {
    width: 1200,
    height: 900,
    crop: 'limit',
  })
}

/** 作品詳細で軽量版の後に表示する、アップロード済みの最高解像度画像 */
export function getArtworkHighResolutionUrl(url) {
  return url
}

const preloadedUrls = new Set()

export function preloadImageUrl(url) {
  if (!url || preloadedUrls.has(url)) return
  preloadedUrls.add(url)
  const img = new Image()
  img.decoding = 'async'
  img.src = url
}
