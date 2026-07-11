# 3Dビュー録画手順

## 1. アプリを起動

```powershell
cd path\to\artport\app
npm run dev
```

## 2. Chromeで録画URLを開く

```text
http://localhost:5173/kushodo/exhibition/137?reel=1&record=1&seconds=20&fps=30&bitrate=45000000&textureTimeoutMs=8000
```

開くと自動で3Dビューが立ち上がり、録画完了後に `.webm` がダウンロードされます。

## 3. Instagram向けMP4に変換

Instagramなどに投稿する場合は、`Downloads` に落ちた `artoir-reel-xxxx.webm` をMP4に変換します。
`2160x3840` のままH.264にするとQuickTime系のプレイヤーで崩れることがあるため、`1080x1920 / 30fps` に落として変換します。

```powershell
ffmpeg -y -i "$env:USERPROFILE\Downloads\artoir-reel-xxxx.webm" `
  -vf "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p" `
  -c:v libx264 -profile:v high -level:v 4.2 -preset slow -crf 17 `
  -movflags +faststart -an `
  "$env:USERPROFILE\Downloads\artoir-reel-20s.mp4"
```

## 調整

- ゆっくりにする: `seconds=24`
- 画質を上げる: `bitrate=60000000`
- 今回の標準: `seconds=20`
