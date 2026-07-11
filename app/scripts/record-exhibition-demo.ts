import { chromium, type Locator } from 'playwright'
import { mkdir, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { exhibitionDemoData as data } from '../demo/exhibition-demo-data.ts'
import { DemoCamera } from './demo-camera.ts'
import { DemoCursor } from './demo-cursor.ts'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'create-exhibition-raw.webm')
const finalVideo = resolve('public/videos/create-exhibition-v2.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')
const typeDelay = Number(process.env.DEMO_TYPE_DELAY || 42)
const thumbnailPath = resolve(process.env.DEMO_THUMBNAIL || '/Users/yoshida/Downloads/abstract_geometric_painting.png')

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
  if (page.url().includes('/login')) {
    console.log('録画用ブラウザでログインしてください。ログイン完了後、自動的に録画を開始します。')
    await page.waitForURL((url) => !String(url).includes('/login'), { timeout: 0 })
    await page.goto(`${baseURL}/orgs`, { waitUntil: 'networkidle' })
  }

  const camera = new DemoCamera(page, process.env.DEMO_CAMERA_DEBUG === 'true')
  const cursor = new DemoCursor(page)
  await camera.init(); await cursor.init(); await camera.resetCamera(0)

  const exhibitionsLink = page.getByRole('link', { name: '展覧会', exact: true })
  await exhibitionsLink.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/exhibitions$/, { timeout: 15000 }),
    cursor.demoClick(exhibitionsLink),
  ])

  const firstCreate = page.getByRole('button', { name: '展覧会を作成', exact: true })
  await firstCreate.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/account$/, { timeout: 15000 }),
    cursor.demoClick(firstCreate),
  ])

  const organization = page.getByRole('button', { name: /Artoir同好会/ })
  await organization.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/dashboard$/, { timeout: 15000 }),
    cursor.demoClick(organization),
  ])

  const secondCreate = page.getByRole('button', { name: '展覧会を作成', exact: true })
  await secondCreate.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/dashboard\/exhibitions\/new$/, { timeout: 15000 }),
    cursor.demoClick(secondCreate),
  ])

  const title = page.locator('.ui-form-field').filter({ has: page.getByText('タイトル', { exact: true }) }).locator('input')
  const dates = page.locator('.ui-exhibition-date-grid input[type="date"]')
  const times = page.locator('.ui-exhibition-date-grid input[type="time"]')
  const startDate = dates.nth(0)
  const endDate = dates.nth(1)
  const startTime = times.nth(0)
  const endTime = times.nth(1)
  const location = page.getByPlaceholder('美術館、ギャラリー名等')
  const description = page.getByPlaceholder('展覧会の説明文を入力...')
  const publicOption = page.locator('.ui-visibility-option').filter({ has: page.getByText('公開', { exact: true }) })
  const uploadTrigger = page.getByRole('button', { name: /画像をアップロード/ })
  const uploadedPreview = page.getByRole('button', { name: 'サムネイルを削除', exact: true })
  const save = page.getByRole('button', { name: '保存', exact: true })

  await title.waitFor({ state: 'visible' })
  if (await dates.count() !== 2 || await times.count() !== 2) throw new Error('Expected date and time inputs')
  await page.waitForTimeout(500)

  async function focus(locator: Locator, duration = 340, offsetY = -50) {
    await locator.scrollIntoViewIfNeeded()
    await camera.focusCameraOn(locator, { scale: 2, duration, offsetY })
    await cursor.moveDemoCursorTo(locator, { duration: 230 })
    await page.waitForTimeout(60)
  }

  async function typeText(locator: Locator, value: string, duration?: number, offsetY?: number) {
    await focus(locator, duration, offsetY)
    await locator.click()
    await locator.pressSequentially(value, { delay: typeDelay })
  }

  await typeText(title, data.title, 480, -90)
  await focus(startDate, 300, -40); await startDate.fill(data.startDate)
  await focus(startTime, 240, -40); await startTime.fill(data.startTime)
  await focus(endDate, 260, -40); await endDate.fill(data.endDate)
  await focus(endTime, 240, -40); await endTime.fill(data.endTime)
  await typeText(location, data.location, 300, -50)
  await typeText(description, data.description, 340, -90)

  await publicOption.scrollIntoViewIfNeeded()
  await camera.focusCameraOn(publicOption, { scale: 2, duration: 300, offsetY: -80 })
  await cursor.demoClick(publicOption)

  await uploadTrigger.scrollIntoViewIfNeeded()
  await camera.focusCameraOn(uploadTrigger, { scale: 2, duration: 320, offsetY: -100 })
  const chooserPromise = page.waitForEvent('filechooser')
  await cursor.demoClick(uploadTrigger)
  const chooser = await chooserPromise
  await chooser.setFiles(thumbnailPath)
  await uploadedPreview.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(350)

  await save.scrollIntoViewIfNeeded()
  await camera.focusCameraOn(save, { scale: 2, duration: 360, offsetY: -170 })
  await page.waitForTimeout(120)
  await Promise.all([
    page.waitForURL(/\/dashboard\/exhibitions\/[^/]+\/edit/, { timeout: 20000 }),
    cursor.demoClick(save),
  ])
  await camera.resetCamera(520)
  await page.waitForTimeout(2100)
  if (video) recordedPath = await video.path()
} finally {
  await context.close()
}

if (!recordedPath) throw new Error('Playwright did not produce a video')
await copyFile(recordedPath, rawVideo)

const trimStart = process.env.DEMO_TRIM_START || '0.4'
const duration = process.env.DEMO_DURATION || '19.2'
const ffmpeg = spawnSync('ffmpeg', [
  '-y', '-ss', trimStart, '-i', rawVideo, '-t', duration,
  '-vf', 'setpts=0.82*PTS,fps=30,scale=1920:1080:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2',
  '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', '-an', finalVideo,
], { stdio: 'inherit' })
if (ffmpeg.status !== 0) throw new Error('ffmpeg conversion failed')
console.log(finalVideo)
