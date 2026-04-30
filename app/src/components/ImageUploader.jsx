import { useRef, useState } from 'react'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function ImageUploader({ onUploaded, onBeforeUpload, children }) {
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(null) // 0-100 or null
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const hasUploadConfig = Boolean(CLOUD_NAME && UPLOAD_PRESET)

  async function upload(file) {
    if (!file) return
    if (!hasUploadConfig) {
      const configError = 'Cloudinary の設定が不足しています（VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET）'
      setError(configError)
      return Promise.reject(new Error(configError))
    }
    setError('')
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText)
          setProgress(null)
          onUploaded(data.secure_url, { fileName: file.name, fileSize: file.size })
          resolve(data.secure_url)
        } else {
          setProgress(null)
          setError('アップロードに失敗しました')
          reject(new Error('Upload failed'))
        }
      }

      xhr.onerror = () => {
        setProgress(null)
        setError('ネットワークエラーが発生しました')
        reject(new Error('Network error'))
      }

      xhr.send(formData)
    })
  }

  async function handleFiles(files) {
    const file = files[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('画像ファイルを選択してください')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('画像サイズは10MB以下にしてください')
      return
    }
    if (onBeforeUpload) {
      const ok = await onBeforeUpload(file)
      if (!ok) return
    }
    try {
      await upload(file)
    } catch {
      // upload() updates error state. catch here to avoid unhandled rejection.
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={!hasUploadConfig}
        onClick={() => {
          if (!hasUploadConfig) {
            setError('Cloudinary の設定が不足しています')
            return
          }
          inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && hasUploadConfig) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!hasUploadConfig) {
            setError('Cloudinary の設定が不足しています')
            return
          }
          void handleFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${dragging ? '#1a1612' : 'rgba(26,22,18,0.2)'}`,
          borderRadius: '2px',
          padding: '2rem',
          textAlign: 'center',
          cursor: hasUploadConfig ? 'pointer' : 'not-allowed',
          background: dragging ? 'rgba(26,22,18,0.04)' : 'transparent',
          transition: 'all 0.2s',
          opacity: hasUploadConfig ? 1 : 0.65,
        }}
      >
        {children}
        {progress !== null ? (
          <div>
            <div style={{
              height: '2px',
              background: 'rgba(26,22,18,0.1)',
              borderRadius: '1px',
              overflow: 'hidden',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: '#1a1612',
                transition: 'width 0.2s',
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#9a9088' }}>{progress}%</span>
          </div>
        ) : (
          <span style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            color: '#9a9088',
          }}>
            クリックまたはドラッグ&ドロップで画像を選択
          </span>
        )}
      </div>
      {error && (
        <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.5rem' }}>{error}</p>
      )}
      {!hasUploadConfig && (
        <p style={{ fontSize: '0.75rem', color: '#9a9088', marginTop: '0.5rem' }}>
          Cloudinary 側の unsigned preset はアップロード先フォルダ・形式・サイズ制限を必ず設定してください。
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { void handleFiles(e.target.files) }}
      />
    </div>
  )
}
