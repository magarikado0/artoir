const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function getArtworkUploadConfigError() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) return 'Cloudinary の設定が不足しています'
  return ''
}

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
          resolve(data.secure_url)
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
