const IMAGE_PICKER_TYPES = [{
  description: '画像',
  accept: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
  },
}]

/**
 * 対応ブラウザではダウンロードフォルダから画像選択を開始する。
 * Safari など File System Access API 非対応環境では従来の input に戻す。
 */
export async function openImageFilePicker({ multiple = false, fallbackInput } = {}) {
  if (typeof window.showOpenFilePicker !== 'function') {
    fallbackInput?.click()
    return null
  }

  try {
    const handles = await window.showOpenFilePicker({
      multiple,
      startIn: 'downloads',
      types: IMAGE_PICKER_TYPES,
      excludeAcceptAllOption: true,
    })
    return Promise.all(handles.map((handle) => handle.getFile()))
  } catch (error) {
    if (error?.name === 'AbortError') return null
    fallbackInput?.click()
    return null
  }
}
