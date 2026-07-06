# 修正指示: 3Dギャラリービューの不具合2件

対象ブランチ: 現在チェックアウト済みのブランチ(feature/3d-gallery-r3f)。**git commit はしないこと。**
既存コードのスタイル(セミコロンなし・シングルクォート)を維持し、無関係な行を変更しないこと。

## 不具合1: ドラッグの見回し方向が直感と逆

`app/src/components/gallery3d/GalleryScene.jsx` の onPointerMove。

現在は「右にドラッグ → 右を向く」だが、Google ストリートビュー等の標準である
**「世界を掴んで動かす」方式(右にドラッグ → 視界が左に回る)** に両軸とも反転する:

- `state.targetYaw -= dx * LOOK_SENSITIVITY` → `state.targetYaw += dx * LOOK_SENSITIVITY`
- pitch も同様に `- dy` → `+ dy` に反転(クランプはそのまま)

## 不具合2: 画像をロードできない作品が「白い無題の額」として展示され続ける

`image_url` に値はあるがテクスチャのロードに失敗する作品(壊れたURL等)が、
プレースホルダー(白いマット+「無題」プラーク)のまま壁に残る。

**ロードに失敗した作品は額ごと部屋から撤去する**:

1. `app/src/components/gallery3d/ArtworkFrame.jsx`:
   TextureLoader の onError で、新しい prop `onTextureError?.(artwork.id)` を呼ぶ
   (現在の `setTexture(null)` の箇所)。
2. `app/src/components/gallery3d/GalleryScene.jsx`:
   - `failedIds` state(Set)を持ち、`handleTextureError = useCallback((id) => setFailedIds(prev => 新Set追加), [])` を定義
   - `createGalleryLayout` に渡す作品配列を `artworks.filter(a => !failedIds.has(String(a.id)))` にする
     (`useMemo` の deps に failedIds を追加)
   - ArtworkFrame に `onTextureError={handleTextureError}` を渡す
   - 失敗作品が消えるとレイアウト・視点マーカーも自動で再計算される(既存の仕組みのまま)
3. ロード中(pending)のプレースホルダー表示は現状のまま変えない。
4. 全作品が失敗した場合は既存の中央フォールバック視点が使われる(変更不要)。

## 検証(必須)

- `cd app && npm run lint` がパスすること
- `cd app && npm run build` がパスすること
