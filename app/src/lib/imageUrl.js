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

export function getThumbnailUrl(url, size = 400) {
  return getResizedImageUrl(url, {
    width: size,
    height: size,
    crop: 'fill',
  })
}

export function getHeroImageUrl(url, width = 800) {
  return getResizedImageUrl(url, {
    width,
    crop: 'fit',
  })
}

export function getFullImageUrl(url, maxWidth = 1920) {
  return getResizedImageUrl(url, {
    width: maxWidth,
    crop: 'fit',
  })
}
