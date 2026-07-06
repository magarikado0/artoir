# 実装プラン: 展覧会3Dギャラリービュー (react-three-fiber版)

## 背景とゴール

展覧会ページ(`app/src/pages/ExhibitionPage.jsx`)に「3D空間で巡る」ボタンを追加し、
クリックすると全画面オーバーレイでバーチャルギャラリー(部屋の壁に作品が掛かった3D空間)が
開くようにする。以前 CSS 3D transform の手書き実装で試作されたが、カメラ行列のバグが多発した
ため破棄された。今回は three.js + @react-three/fiber (R3F) で正しく作り直す。

対象リポジトリ: このリポジトリ。アプリ本体は `app/` ディレクトリ(React 19 + Vite + Tailwind)。
作業はすべて現在チェックアウト済みのブランチ上で行うこと。**git commit はしないこと**(レビュー後に人間がコミットする)。

## 必読ファイル(実装前に読むこと)

- `app/src/pages/ExhibitionPage.jsx` — 統合先。`viewMode` state と ribbon ビューの起動ボタンが既にある
- `app/src/components/ExhibitionRibbonView.jsx` — 既存の全画面オーバーレイの作法(Escape処理、role="dialog"等)の参考
- `app/src/lib/imageUrl.js` — 画像URL変換(Cloudinary)。テクスチャには `getWallThumbnailUrl(url)`(800px)を使う
- `app/src/components/ArtworkModal.jsx` — 作品クリックで開く既存モーダル(z-index: 500)
- `app/src/index.css` — 既存のUIトークン・`.ui-immersive-launch` 等のクラス

## 依存関係

`app/` で以下を追加する:

```
npm install three @react-three/fiber @react-three/drei
```

- React 19 なので @react-three/fiber は v9系、@react-three/drei は v10系になるはず。バージョン整合を確認すること。
- **three.js を main バンドルに入れないこと。** 3Dビュー本体は `React.lazy(() => import(...))` で遅延ロードし、
  Vite のコード分割で three が別チャンクに入ることをビルド出力で確認する。

## 新規ファイル構成

```
app/src/components/Exhibition3DGalleryView.jsx   # オーバーレイ本体(default export、lazy対象)
app/src/components/Exhibition3DGalleryView.css   # HUD(DOM側)のスタイル
app/src/components/gallery3d/GalleryScene.jsx    # Canvas内: 部屋・作品・マーカー・カメラ制御
app/src/components/gallery3d/ArtworkFrame.jsx    # 額縁+作品テクスチャ+プラーク(1作品分)
app/src/components/gallery3d/layout.js           # 純関数のレイアウト計算(壁割り当て・配置・視点)
```

分割は目安。ただし **layout.js は副作用なしの純関数のみ** にすること(検証しやすさのため)。

## 座標系・部屋の仕様(単位: メートル)

- y-up。床が y=0、目線の高さ y=1.5。
- 部屋: 幅12 (x: -6..6)、奥行き12 (z: -6..6)、天井高 3.2。
- 壁の呼称: front = z=-6 の壁、right = x=+6、back = z=+6、left = x=-6。
- マテリアルは軽量に。壁: 暖白 `#efede7`、床: 木目風の茶 `#4b3017`(単色+わずかなroughness差でよい。
  テクスチャ画像アセットは追加しない)、天井: `#dfdfdb`。
- ライティング: `ambientLight`(intensity ~0.9) + `directionalLight` 1灯程度。**シャドウマップは使わない**(モバイル性能優先)。

## 作品の配置 (layout.js)

入力: `artworks`(`image_url` を持つものだけ。呼び出し側でフィルタ済みの前提にしない —
layout 側でも `image_url` でフィルタしてよい)と、各作品のアスペクト比マップ。

1. **壁への割り当て**: 作品の `order` 順(配列順)を保ったまま、front → right → back → left の順に
   連続ブロックで割り当てる。ブロックサイズは均等割(差は最大1、例: 10作品 → 3/3/2/2)。
   使わない壁は空でよい。鑑賞者が右回りに部屋を巡ると展示順どおりに見られることが狙い。
2. **壁内の配置**: 各作品の額縁サイズはアスペクト比に合わせる。
   - 額縁の最大外形: 幅2.0 × 高さ2.2。最小幅 0.9。
   - 額縁チローム(縁+マット): 画像の内側サイズ + 縁0.08 + マット0.10(各辺)。
     つまり外形 = 内側画像サイズ + 0.36(両側合計)。内側画像はアスペクト比を保って最大枠にフィット。
   - 中心の高さ y=1.5 で横一列。隣接額縁の**端と端の間隔は一定 0.5**。
   - 壁の使用可能スパン = 12 - 1.5(両端0.75ずつ空ける)。収まらない場合は全額縁を等率縮小し、
     間隔も最小0.25まで詰めてよい。
   - 壁面から 0.02 だけ手前にオフセットして z-fighting を防ぐ。
3. **視点(立ち位置)**: 壁ごとに、その壁の作品を最大3点ずつのグループに分け、
   各グループのスパン中心の正面・壁から3.2m の位置に視点を置く(y=1.5、向き=壁の正面)。
   作品が1つもない場合でも部屋中心に視点を1つ置く。
   初期カメラ位置 = 最初の視点。

アスペクト比の取得: 別途 `Image()` でプリロードせず、three のテクスチャロード完了時に
`texture.image.width / texture.image.height` から得る。ロード完了までは 0.8 を仮値として配置し、
確定したら再レイアウトする(state 更新)。

## カメラ制御(自作の簡易FPSコントロール)

drei の OrbitControls / CameraControls は使わず、以下を自作する(オービット系は一人称視点に合わないため):

- 状態: `position (Vector3)`, `yaw`, `pitch`。カメラは毎フレーム
  `camera.position` と `camera.rotation`(YXZ order: `rotation.set(pitch, yaw, 0, 'YXZ')`)に反映。
- **ドラッグで見回し**: canvas 上の pointerdown→pointermove で yaw/pitch を変更。
  感度 ~0.005 rad/px、pitch は ±40° にクランプ。`useFrame` 内で目標値に向けて減衰補間(damping)して滑らかに。
  マルチタッチ対策として、追跡する pointerId を1つに固定する(`isPrimary` のみ処理)。
- **クリックとドラッグの区別**: pointerdown からの移動量が 6px を超えたら「ドラッグ」とし、
  その pointerup 直後の R3F の onClick(作品・マーカー)を無視するフラグを立てる。
- **テレポート**: マーカーの onClick で目標位置・目標yawへ約0.9秒の ease-out トゥイーンで移動。
  yaw は最短回転方向に正規化。トゥイーン中に別のマーカーがクリックされた場合は**無視**し、
  そのときアクティブマーカー表示も変更しないこと(状態と実際のカメラがズレるのを防ぐ)。
- アクティブ視点のハイライト: 現在の視点IDを state で持ち、ドラッグで見回した程度では解除しない
  (テレポートでのみ切り替わる)。

## 作品(ArtworkFrame)

- 構成: 額縁(BoxGeometry の枠 or 前面に矩形4辺。濃色 `#141312`)+ マット(白 `#fbfbf8` の平面)+
  作品画像の平面(`meshBasicMaterial` + テクスチャで可。ライティングの影響を受けず色が正確)。
- テクスチャ: `getWallThumbnailUrl(artwork.image_url)` を `useTexture` か `TextureLoader` でロード。
  `texture.colorSpace = SRGBColorSpace`、`anisotropy = 4`。ロード中はマット色の無地プレースホルダー。
  ロード失敗時はタイトル文字なしの無地額縁のままにする(クラッシュしないこと)。
- **プラーク(作品名板)**: 額縁の下に小さな板。テキストは**作品タイトルのみ**
  (**作者名は表示しない** — プロダクト方針)。タイトルが空なら「無題」。
  日本語を含むため drei の `<Text>`(troika: デフォルトフォントがCJK非対応)は使わないこと。
  **オフスクリーン canvas に 2D で文字を描いて `CanvasTexture` を貼る**方式にする
  (devicePixelRatio 考慮、長いタイトルは省略記号)。
- インタラクション: click で `onOpenArtwork(artwork)`(既存の ArtworkModal が開く)。
  hover でカーソルを pointer に(drei の `useCursor` 可)。

## 床マーカー(視点)

- 床上 y=0.01 の円形(RingGeometry + CircleGeometry 程度)。半透明白、アクティブ時はアクセント色 `#be553d`。
- click でテレポート。hover でカーソル pointer。

## オーバーレイ(DOM側)と統合

`Exhibition3DGalleryView.jsx`(DOM側):

- `role="dialog" aria-modal="true" aria-label="3Dギャラリービュー"` の全画面 fixed オーバーレイ。
  背景 `#0c0b0a`。**z-index は 400 にする**(既存 `.ui-artwork-modal` が z-index:500 のため、
  3D内から開いた作品詳細モーダルが必ず手前に来る。CSSにその旨コメントを書く)。
- 中に `<Canvas dpr={[1, 2]} camera={{ fov: 55, near: 0.1, far: 50 }}>`。
  Canvas 内は `<Suspense>` で包み、テクスチャ待ちでも部屋は描画されるようにする。
- HUD: 左上にタイトルピル「3D空間を巡る」、右上に閉じるボタン(×)。
  下部に数秒でフェードアウトする操作説明「ドラッグで見回す / 床のマーカーで移動 / 作品をクリックで詳細」。
- **Escape で閉じる。ただし props の `hasOpenArtwork` が true の間は無視する**
  (ArtworkModal が開いているとき、Escape はモーダル側だけを閉じるべきため)。
- マウント中は `document.body.style.overflow = 'hidden'`、アンマウントで復元。
- マウント時に閉じるボタンへフォーカス、閉じたら起動ボタンへフォーカスを戻す(呼び出し側で管理してよい)。
- WebGL 初期化失敗に備え、Canvas を ErrorBoundary で包み、失敗時は
  「お使いの環境では3D表示を利用できません」+ 閉じるボタンのフォールバックを出す。

`ExhibitionPage.jsx` の変更(**最小差分で。既存コードの再フォーマット禁止**):

- `const Exhibition3DGalleryView = lazy(() => import('../components/Exhibition3DGalleryView'))`
- 既存の「作品を巡る」(ribbon) ボタンの**前**に、同じ `.ui-immersive-launch` スタイルで
  「3D空間で巡る」ボタンを追加(アイコンは家/立方体系の簡単なインラインSVG)。
  `onClick={() => setViewMode('3d')}`。
- ボタンと 3D ビューの表示条件は `viewableArtworks.length > 0` を使う
  (`artworks.length` ではなく。画像なし作品のみの展覧会で空の部屋が開くのを防ぐ)。
  ※ ribbon 側の既存の条件は**変更しない**。
- レンダリング:
  ```jsx
  {viewMode === '3d' && viewableArtworks.length > 0 && (
    <Suspense fallback={null}>
      <Exhibition3DGalleryView
        artworks={viewableArtworks}
        onClose={() => setViewMode('grid')}
        onOpenArtwork={openArtwork}
        hasOpenArtwork={Boolean(selectedArtwork)}
      />
    </Suspense>
  )}
  ```
- ribbon ビューは削除も変更もしないこと。

## コードスタイル

- 既存コードに合わせる: **セミコロンなし・シングルクォート**・関数コンポーネント・JSX(TypeScript化しない)。
- 既存ファイルの無関係な行を変更・再フォーマットしない。
- コメントは「コードから読み取れない制約」だけに絞る(日本語可)。

## 検証(必須)

1. `cd app && npm run lint` がパスすること。
2. `cd app && npm run build` がパスすること。ビルド出力で three 系が
   ExhibitionPage 本体と別のチャンクに分かれていることを確認し、最終レポートにチャンクサイズを書くこと。
3. `layout.js` は node で直接実行できる簡易チェック(一時スクリプトでよい)で
   N=1, 3, 4, 10, 24 のケースを流し、以下を assert すること:
   - 額縁が壁のスパンからはみ出さない
   - 隣接額縁が重ならない
   - 全作品がいずれかの壁に割り当てられ、順序が保たれている
   - 視点が壁から3.2m・部屋の内側にある
   チェック後、一時スクリプトは削除する。
4. dev サーバーでの目視確認は不要(人間が後で行う)。

## やらないこと

- ribbon ビューの変更・削除
- 認証、DB、Supabase まわりの変更
- ルーティング・URL の変更
- package.json の scripts 変更
- git commit / push
