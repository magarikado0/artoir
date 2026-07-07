const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function getArtworkUploadConfigError() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) return 'Cloudinary の設定が不足しています'
  return ''
}

/**
 * Cloudinary へ unsigned アップロードする。
 * @returns {Promise<{url:string, width:number|null, height:number|null}>}
 *   url = secure_url。width/height はアップロード応答のピクセル寸法（artworks.image_width/height に保存する）。
 */
export function uploadArtworkImage(file, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error(getArtworkUploadConfigError()))
      return
    }

    const formData = new FormData()
    formData.append('file', file, fileName || file.name || 'upload.jpg')
    formData.append('upload_preset', UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve({
            url: data.secure_url,
            width: Number.isFinite(data.width) ? data.width : null,
            height: Number.isFinite(data.height) ? data.height : null,
          })
        } catch {
          reject(new Error('Cloudinary の応答を解析できませんでした'))
        }
        return
      }
      reject(new Error('アップロードに失敗しました'))
    }

    xhr.onerror = () => reject(new Error('ネットワークエラーが発生しました'))
    xhr.send(formData)
  })
}

/**
 * image_width / image_height カラム未適用の DB に対する insert/update 失敗かを判定する。
 * docs/sql/add-artwork-image-dimensions.sql 適用後はこのフォールバック（呼び出し側のリトライ）ごと削除可。
 */
export function isMissingImageDimensionColumnError(error) {
  if (!error) return false
  const code = error.code || ''
  const message = String(error.message || '')
  return (code === 'PGRST204' || code === '42703') && /image_(width|height)/.test(message)
}

/** ペイロードから寸法フィールドを除いたコピーを返す（カラム未適用 DB へのリトライ用）。 */
export function omitImageDimensionFields(payload) {
  const rest = { ...payload }
  delete rest.image_width
  delete rest.image_height
  return rest
}
