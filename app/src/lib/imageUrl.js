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

/**
 * 作品ウォールの表示用。枠いっぱいまで拡大して表示する（contain で片辺が枠に接する）ため、
 * 320 ではボケる。大画面・Retina の縦長セル（最大 ~600px 表示）を見込んで 800。
 */
export function getWallThumbnailUrl(url) {
  return getThumbnailUrl(url, 800)
}

/**
 * 3D ギャラリーの WebGL テクスチャ専用 URL。
 * getWallThumbnailUrl と別 URL にするのが要点:
 *   1) 2D グリッドは同じ 800px 画像を通常の <img>(crossOrigin なし)で読むため、
 *      同一 URL だとブラウザのキャッシュを WebGL の crossOrigin リクエストが
 *      流用して tainted 扱いになり、テクスチャが真っ白になる。
 *   2) f_auto は環境により AVIF を返すが、AVIF は一部 GPU で texImage2D に
 *      アップロードできず真っ白になる。f_jpg で確実にアップロード可能にする。
 */
export function getWallTextureUrl(url) {
  return getResizedImageUrl(url, {
    width: 2000,
    height: 2000,
    crop: 'limit',
    quality: 'auto:best',
    format: 'jpg',
  })
}

/** 現在の3D視点にある作品用。詳細画面と同じ元画像を、別キャッシュキーで取得する。 */
export function getWallTextureHighResolutionUrl(url) {
  if (!isCloudinaryUrl(url)) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}artoir_3d=original`
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
