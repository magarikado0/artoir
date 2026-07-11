import { chromium } from 'playwright'
import { copyFile, mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { DemoCamera } from './demo-camera.ts'
import { DemoCursor } from './demo-cursor.ts'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const imagePath = resolve(process.env.DEMO_ARTWORK || '/Users/yoshida/Downloads/ART1.png')
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'gallery-tour-raw.webm')
const finalVideo = resolve('public/videos/gallery-tour.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')

const artwork = {
  title: 'HaNA',
  description: '赤と黒の力強い筆致が、内なる情熱と生命の躍動を描く抽象作品。',
}

await mkdir(outputDir, { recursive: true })
await mkdir(resolve('public/videos'), { recursive: true })

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
  args: ['--hide-scrollbars'],
})

let recordedPath = ''
try {
  const page = context.pages()[0] || await context.newPage()
  const video = page.video()
  await page.goto(`${baseURL}/orgs`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) throw new Error('録画用ブラウザのログインが必要です')

  const camera = new DemoCamera(page, process.env.DEMO_CAMERA_DEBUG === 'true')
  const cursor = new DemoCursor(page)
  await camera.init(); await cursor.init(); await camera.resetCamera(0)

  const exhibitionsLink = page.getByRole('link', { name: '展覧会', exact: true })
  await Promise.all([
    page.waitForURL(/\/exhibitions$/, { timeout: 15000 }),
    cursor.demoClick(exhibitionsLink),
  ])

  const exhibitionLinks = page.getByRole('link', { name: /maruとサンカク/ })
  const exhibitionCount = await exhibitionLinks.count()
  if (exhibitionCount < 1) throw new Error('「maruとサンカク」が見つかりません')
  const exhibitionLink = exhibitionLinks.first()
  await Promise.all([
    page.waitForURL(/\/exhibition\//, { timeout: 15000 }),
    cursor.demoClick(exhibitionLink),
  ])
  const publicUrl = page.url()

  const manage = page.getByRole('link', { name: '展覧会を管理', exact: true })
  await manage.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/dashboard\/exhibitions\/[^/]+\/artworks$/, { timeout: 15000 }),
    cursor.demoClick(manage),
  ])

  const addArtwork = page.getByRole('button', { name: '作品追加', exact: true })
  await addArtwork.waitFor({ state: 'visible' })
  const chooserPromise = page.waitForEvent('filechooser')
  await cursor.demoClick(addArtwork)
  const chooser = await chooserPromise
  await chooser.setFiles(imagePath)

  const dialog = page.getByRole('dialog', { name: '作品を追加', exact: true })
  await dialog.waitFor({ state: 'visible' })
  const cropSvg = dialog.locator('.ui-artwork-create-cropbox svg')
  await cropSvg.waitFor({ state: 'visible', timeout: 15000 })
  await camera.resetCamera(300)

  const cropTargets = [
    { name: '左上の角', x: 0.313, y: 0.247 },
    { name: '右上の角', x: 0.689, y: 0.247 },
    { name: '右下の角', x: 0.689, y: 0.725 },
    { name: '左下の角', x: 0.313, y: 0.725 },
  ]

  async function setCursorPoint(x: number, y: number, duration = 180) {
    await page.evaluate(({ x, y, duration }) => {
      const el = document.querySelector<HTMLElement>('#demo-cursor')
      if (!el) return
      el.style.setProperty('--d', `${duration}ms`)
      el.style.transform = `translate3d(${x}px,${y}px,0)`
    }, { x, y, duration })
  }

  async function dragCropHandle(name: string, ratioX: number, ratioY: number) {
    const handle = dialog.getByRole('slider', { name, exact: true })
    await handle.waitFor({ state: 'visible' })
    const cropBox = await cropSvg.boundingBox()
    if (!cropBox) throw new Error(`${name}の座標を取得できません`)
    const start = {
      x: cropBox.x + (name.startsWith('右') ? cropBox.width - 4 : 4),
      y: cropBox.y + (name.includes('下') ? cropBox.height - 4 : 4),
    }
    const target = { x: cropBox.x + cropBox.width * ratioX, y: cropBox.y + cropBox.height * ratioY }
    await setCursorPoint(start.x, start.y, 180)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    const steps = 18
    for (let i = 1; i <= steps; i += 1) {
      const p = i / steps
      const eased = 1 - Math.pow(1 - p, 3)
      const x = start.x + (target.x - start.x) * eased
      const y = start.y + (target.y - start.y) * eased
      await page.mouse.move(x, y)
      await setCursorPoint(x, y, 0)
      await page.waitForTimeout(12)
    }
    await page.mouse.up()
    await page.waitForTimeout(90)
  }

  for (const target of cropTargets) {
    await dragCropHandle(target.name, target.x, target.y)
  }

  const confirmImage = page.getByRole('button', { name: '画像を確定', exact: true })
  await cursor.demoClick(confirmImage)
  const title = page.getByPlaceholder('作品名を入力')
  const description = page.getByPlaceholder('説明文を入力')
  await title.waitFor({ state: 'visible', timeout: 15000 })
  await camera.focusCameraOn(title, { scale: 2, duration: 360, offsetY: -70 })
  await title.click(); await title.pressSequentially(artwork.title, { delay: 55 })
  await camera.focusCameraOn(description, { scale: 2, duration: 280, offsetY: -60 })
  await description.click(); await description.pressSequentially(artwork.description, { delay: 34 })

  const save = page.getByRole('button', { name: '保存する', exact: true })
  await camera.focusCameraOn(save, { scale: 2, duration: 280, offsetY: -130 })
  await cursor.demoClick(save)
  await dialog.waitFor({ state: 'hidden', timeout: 30000 })
  await page.locator('.ui-artwork-sort-card-title').filter({ hasText: artwork.title }).first().waitFor({ state: 'visible', timeout: 15000 })

  await camera.resetCamera(400)
  await page.goto(publicUrl, { waitUntil: 'networkidle' })
  await camera.init(); await cursor.init(); await camera.resetCamera(0)
  const launch3d = page.getByRole('button', { name: '3D空間で巡る', exact: true })
  await launch3d.waitFor({ state: 'visible', timeout: 20000 })
  await cursor.demoClick(launch3d)

  const gallery = page.getByRole('dialog', { name: '3Dギャラリービュー', exact: true })
  await gallery.waitFor({ state: 'visible', timeout: 20000 })
  const canvas = gallery.locator('canvas')
  await canvas.waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(1800)

  const canvasBox = await canvas.boundingBox()
  if (!canvasBox) throw new Error('3D canvasの座標を取得できません')
  const center = { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height / 2 }
  await page.mouse.move(center.x, center.y)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(900)
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x - 340, center.y + 25, { steps: 48 })
  await page.mouse.up()
  await page.waitForTimeout(800)
  const nextView = page.getByRole('button', { name: '次の視点へ移動', exact: true })
  await cursor.demoClick(nextView)
  await page.mouse.move(center.x, center.y)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(1100)
  await cursor.demoClick(nextView)
  await page.mouse.move(center.x, center.y)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(900)
  await page.mouse.down()
  await page.mouse.move(center.x + 360, center.y - 20, { steps: 48 })
  await page.mouse.up()
  await page.waitForTimeout(1800)

  if (video) recordedPath = await video.path()
} finally {
  await context.close()
}

if (!recordedPath) throw new Error('Playwright did not produce a video')
await copyFile(recordedPath, rawVideo)
const ffmpeg = spawnSync('ffmpeg', [
  '-y', '-ss', process.env.DEMO_TRIM_START || '0.4', '-i', rawVideo,
  '-vf', 'setpts=0.62*PTS,fps=30,scale=1920:1080:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2',
  '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', '-an', finalVideo,
], { stdio: 'inherit' })
if (ffmpeg.status !== 0) throw new Error('ffmpeg conversion failed')
console.log(finalVideo)
