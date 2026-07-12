import { useEffect, useRef, useState } from 'react'
import { LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, Texture } from 'three'
import { useCursor } from '@react-three/drei'
import { getWallTextureHighResolutionUrl, getWallTextureUrl } from '../../lib/imageUrl'
import { getArtwork3DImage } from '../../lib/artworkImages'

export default function ArtworkFrame({
  frame,
  highQuality,
  onOpenArtwork,
  onAspectLoaded,
  onTextureError,
  onTextureReady,
  ignoreNextClickRef,
}) {
  const { artwork, imageWidth, imageHeight, position, rotation } = frame
  const [texture, setTexture] = useState(null)
  const [hovered, setHovered] = useState(false)
  const imageMaterialRef = useRef(null)
  const currentTextureRef = useRef(null)
  const retiredTexturesRef = useRef(new Set())
  useCursor(hovered)
  const galleryImageUrl = getArtwork3DImage(artwork)?.url || artwork.image_url

  useEffect(() => {
    let cancelled = false
    const url = highQuality
      ? getWallTextureHighResolutionUrl(galleryImageUrl)
      : getWallTextureUrl(galleryImageUrl)

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
        const nextTexture = new Texture(img)
        nextTexture.colorSpace = SRGBColorSpace
        nextTexture.anisotropy = 16
        // 数千pxの元画像を遠距離で直接サンプリングすると細い文字線が欠落する。
        // trilinear mipmapで縮小時の線を平均化し、拡大時は自動的に元解像度へ戻す。
        nextTexture.generateMipmaps = true
        nextTexture.minFilter = LinearMipmapLinearFilter
        nextTexture.magFilter = LinearFilter

        const previousTexture = currentTextureRef.current
        if (previousTexture) retiredTexturesRef.current.add(previousTexture)

        // 新TextureがGPUへ上がるまでは旧Textureを破棄しない。
        // 視点移動時の低解像度→元画像切り替えで黒いフレームが出るのを防ぐ。
        nextTexture.onUpdate = () => {
          nextTexture.onUpdate = null
          retiredTexturesRef.current.forEach((retiredTexture) => retiredTexture.dispose())
          retiredTexturesRef.current.clear()
        }
        nextTexture.needsUpdate = true
        currentTextureRef.current = nextTexture
        setTexture(nextTexture)
        onTextureReady?.(artwork.id, { highQuality })
      })
      .catch(() => {
        if (cancelled) return
        console.warn(`3D gallery: artwork texture failed to decode: ${url}`)
        // 高画質版だけ失敗した場合は、表示中の低解像度版を維持する。
        if (!currentTextureRef.current) {
          setTexture(null)
          onTextureError?.(artwork.id)
        }
      })

    return () => {
      cancelled = true
      img.src = ''
    }
  }, [artwork.id, galleryImageUrl, highQuality, onAspectLoaded, onTextureError, onTextureReady])

  useEffect(() => () => {
    currentTextureRef.current?.dispose()
    currentTextureRef.current = null
    retiredTexturesRef.current.forEach((retiredTexture) => retiredTexture.dispose())
    retiredTexturesRef.current.clear()
  }, [])

  useEffect(() => {
    const material = imageMaterialRef.current
    if (!material) return

    // map の有無はシェーダー構成を変える。初回描画時は map=null なので、
    // 画像設定後にマテリアルを再コンパイルしないと白一色のままになる。
    material.needsUpdate = true
  }, [texture])

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
