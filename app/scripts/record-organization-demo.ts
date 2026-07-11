import { chromium, type Locator } from 'playwright'
import { mkdir, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { demoData } from '../demo/demo-data.ts'
import { cameraTimeline as t } from '../demo/camera-timeline.ts'
import { DemoCamera } from './demo-camera.ts'
import { DemoCursor } from './demo-cursor.ts'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'artoir-organization-demo.webm')
const finalVideo = resolve(outputDir, 'artoir-organization-demo.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')
const debug = process.env.DEMO_CAMERA_DEBUG === 'true'
const typeDelay = Number(process.env.DEMO_TYPE_DELAY || 40)

await mkdir(outputDir, { recursive: true })
const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
  args: ['--hide-scrollbars'],
})

let recordedPath = ''
try {
  const pages = context.pages()
  const page = pages[0] || await context.newPage()
  const video = page.video()
  await page.goto(`${baseURL}/account/organizations/new`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) throw new Error(`Demo profile is not signed in: ${page.url()}`)

  const camera = new DemoCamera(page, debug)
  const cursor = new DemoCursor(page)
  await camera.init(); await cursor.init(); await camera.resetCamera(0)

  const name = page.getByPlaceholder('例: Artoir.同好会')
  const slug = page.getByPlaceholder('例: artoir_academy')
  const description = page.getByPlaceholder('団体の説明文を入力...')
  const create = page.getByRole('button', { name: '作成する', exact: true })
  await name.waitFor({ state: 'visible' }); await page.waitForTimeout(t.opening.hold)

  async function focusAndType(locator: Locator, value: string, timeline: { scale:number; duration:number; hold:number }, offsetY = 0) {
    await camera.focusCameraOn(locator, { scale: timeline.scale, duration: timeline.duration, offsetY })
    await cursor.moveDemoCursorTo(locator, { duration: 260 }); await page.waitForTimeout(timeline.hold)
    await locator.click(); await locator.pressSequentially(value, { delay: typeDelay })
  }

  await focusAndType(name, demoData.organizationName, t.organizationName, -70)
  await focusAndType(slug, demoData.organizationId, t.organizationId, -30)
  await focusAndType(description, demoData.description, t.description, -80)
  await camera.focusCameraOn(create, { scale: t.createButton.scale, duration: t.createButton.duration, offsetY: -150 })
  await page.waitForTimeout(t.createButton.hold)
  await Promise.all([
    page.waitForURL(/\/account\/organizations\/[^/]+\/links/, { timeout: 20000 }),
    cursor.demoClick(create),
  ])

  await camera.resetCamera(t.afterCreateNavigation.duration); await page.waitForTimeout(t.afterCreateNavigation.hold)
  await camera.init(); await cursor.init()
  const instagramField = page.locator('.ui-form-field').filter({ hasText: 'INSTAGRAM' }).getByPlaceholder('username')
  const xField = page.locator('.ui-form-field').filter({ hasText: 'X (TWITTER)' }).getByPlaceholder('username')
  const website = page.getByPlaceholder('https://example.com')
  const save = page.getByRole('button', { name: '保存して次へ', exact: true })
  await instagramField.waitFor({ state: 'visible' })
  await focusAndType(instagramField, demoData.instagram, t.instagram, -70)
  await focusAndType(xField, demoData.x, t.x, -30)
  await focusAndType(website, demoData.website, t.website, -40)
  await camera.focusCameraOn(save, { scale: t.saveButton.scale, duration: t.saveButton.duration, offsetY: -160 })
  await page.waitForTimeout(t.saveButton.hold)
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 20000 }), cursor.demoClick(save)])
  await camera.resetCamera(t.ending.duration); await page.waitForTimeout(t.ending.hold)
  if (video) recordedPath = await video.path()
} finally {
  await context.close()
}

if (!recordedPath) throw new Error('Playwright did not produce a video')
await copyFile(recordedPath, rawVideo)
const ffmpeg = spawnSync('ffmpeg', ['-y', '-ss', '5.0', '-i', rawVideo, '-t', '15.8', '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', '-an', finalVideo], { stdio: 'inherit' })
if (ffmpeg.status !== 0) throw new Error('ffmpeg conversion failed')
console.log(finalVideo)
