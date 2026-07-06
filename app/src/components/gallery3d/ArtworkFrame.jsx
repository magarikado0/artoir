import { useEffect, useRef, useState } from 'react'
import { LinearFilter, SRGBColorSpace, Texture } from 'three'
import { useCursor } from '@react-three/drei'
import { getWallTextureHighResolutionUrl, getWallTextureUrl } from '../../lib/imageUrl'

export default function ArtworkFrame({
  frame,
  highQuality,
  onOpenArtwork,
  onAspectLoaded,
  onTextureError,
  ignoreNextClickRef,
}) {
  const { artwork, outerWidth, outerHeight, imageWidth, imageHeight, position, rotation } = frame
  const [texture, setTexture] = useState(null)
  const [hovered, setHovered] = useState(false)
  const imageMaterialRef = useRef(null)
  useCursor(hovered)

  useEffect(() => {
    let cancelled = false
    let texture
    const url = highQuality
      ? getWallTextureHighResolutionUrl(artwork.image_url)
      : getWallTextureUrl(artwork.image_url)

    // 重要: three の TextureLoader は img の load 時点で GPU へアップロードするが、
    // 2D グリッドが 36 枚を先にデコード中だと load がデコード完了前に発火し、
    // 真っ白のまま GPU に上がって二度と更新されない(version=1 のまま固定)。
    // img.decode() でピクセル確定を待ってから Texture を生成し、この競合を防ぐ。
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.src = url
    img
      .decode()
      .then(() => {
        if (cancelled) return
        if (img.naturalWidth && img.naturalHeight) {
          onAspectLoaded?.(artwork.id, img.naturalWidth, img.naturalHeight)
        }
        texture = new Texture(img)
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = 8
        // 詳細画面と同じ元画像を常に直接サンプリングする。
        // mipmap を使うと距離に応じて低解像度層へ落ち、拡大時にぼやける。
        texture.generateMipmaps = false
        texture.minFilter = LinearFilter
        texture.magFilter = LinearFilter
        texture.needsUpdate = true
        setTexture(texture)
      })
      .catch(() => {
        if (cancelled) return
        console.warn(`3D gallery: artwork texture failed to decode: ${url}`)
        setTexture(null)
        onTextureError?.(artwork.id)
      })

    return () => {
      cancelled = true
      img.src = ''
      texture?.dispose()
    }
  }, [artwork.id, artwork.image_url, highQuality, onAspectLoaded, onTextureError])

  useEffect(() => {
    const material = imageMaterialRef.current
    if (!material) return

    // map の有無はシェーダー構成を変える。初回描画時は map=null なので、
    // 画像設定後にマテリアルを再コンパイルしないと白一色のままになる。
    material.needsUpdate = true
  }, [texture])

  const matZ = 0.034
  const imageZ = 0.036

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (ignoreNextClickRef?.current) return
        onOpenArtwork?.(artwork)
      }}
    >
      <mesh position={[0, 0, matZ]}>
        <planeGeometry args={[outerWidth, outerHeight]} />
        <meshBasicMaterial color="#fbfaf7" toneMapped={false} />
      </mesh>
      {/* 見切り線: 白地の作品(書道など)が白いマットに溶けて
          空の額に見えるのを防ぐため、画像領域の輪郭を細く示す */}
      <mesh position={[0, 0, imageZ - 0.001]}>
        <planeGeometry args={[imageWidth + 0.024, imageHeight + 0.024]} />
        <meshBasicMaterial color="#b7b0a3" />
      </mesh>
      <mesh position={[0, 0, imageZ]}>
        <planeGeometry args={[imageWidth, imageHeight]} />
        {/* 単一のマテリアル要素を維持する。条件分岐で要素を差し替えると
            R3F が除去された color を黒にリセットし、map があっても真っ黒になる */}
        <meshBasicMaterial
          ref={imageMaterialRef}
          map={texture || null}
          color={texture ? '#ffffff' : '#efe9df'}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
