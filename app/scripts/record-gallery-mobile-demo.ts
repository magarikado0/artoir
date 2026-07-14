import { chromium, type Locator, type Page, type Video } from 'playwright'
import { copyFile, mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const viewport = { width: 400, height: 500 }
const imagePath = resolve(process.env.DEMO_ARTWORK || '/Users/yoshida/Downloads/ART1.png')
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'gallery-tour-mobile-raw.webm')
const finalVideo = resolve('public/videos/gallery-tour-mobile.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')

const artwork = {
  title: 'HaNA',
  description: '赤と黒の力強い筆致が、内なる情熱と生命の躍動を描く抽象作品。',
}

await mkdir(outputDir, { recursive: true })
await mkdir(resolve('public/videos'), { recursive: true })

class DemoFinger {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async init() {
    await this.page.evaluate(() => {
      if (document.querySelector('#demo-finger')) return
      const style = document.createElement('style')
      style.textContent = `
        * { cursor: none !important; }
        #demo-finger {
          position: fixed; left: 0; top: 0; z-index: 2147483647;
          width: 27px; height: 31px; pointer-events: none;
          transform: translate3d(340px, 430px, 0); opacity: 0;
          transition: transform var(--move-duration, 360ms) cubic-bezier(.22,1,.36,1), opacity 120ms ease;
          filter: drop-shadow(0 2px 4px rgba(31,27,23,.16)); transform-origin: 12px 3px;
        }
        #demo-finger svg { display: block; width: 100%; height: 100%; }
        #demo-touch-ring {
          position: fixed; z-index: 2147483646; width: 14px; height: 14px;
          border: 1px solid rgba(190,85,61,.55); border-radius: 999px;
          opacity: 0; pointer-events: none;
        }
        #demo-finger.demo-tap { animation: demo-finger-tap 260ms ease-out; }
        #demo-touch-ring.demo-tap { animation: demo-touch-ring 480ms ease-out; }
        .demo-target-pressed { filter: brightness(.94) !important; transition: filter 160ms ease !important; }
        @keyframes demo-finger-tap { 0%,100% { scale: 1; } 45% { scale: .95; } }
        @keyframes demo-touch-ring {
          0% { opacity: .5; transform: translate(-50%,-50%) scale(.45); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(2.2); }
        }
      `
      document.head.appendChild(style)
      const finger = document.createElement('div')
      finger.id = 'demo-finger'
      finger.innerHTML = `<svg viewBox="0 0 76 88" aria-hidden="true"><path d="M34 8c5 0 9 4 9 9v24l4-12c2-5 9-6 12-2 2 2 2 5 1 8l-8 28c-2 8-9 14-18 14h-5c-8 0-15-5-18-12L3 47c-2-5 0-10 5-12 4-1 8 1 10 5l7 12V17c0-5 4-9 9-9Z" fill="#F7F3EC" stroke="#4A413A" stroke-width="2.2" stroke-linejoin="round"/><path d="M34 8v42" fill="none" stroke="#4A413A" stroke-width="2.2" stroke-linecap="round"/></svg>`
      document.body.appendChild(finger)
      const ring = document.createElement('div')
      ring.id = 'demo-touch-ring'
      document.body.appendChild(ring)
    })
  }

  async moveToPoint(x: number, y: number, duration = 320) {
    await this.page.evaluate(({ x, y, duration }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      finger.style.setProperty('--move-duration', `${duration}ms`)
      finger.style.opacity = '1'
      finger.style.transform = `translate3d(${x - 12}px, ${y - 3}px, 0)`
    }, { x, y, duration })
    await this.page.waitForTimeout(duration + 40)
  }

  async moveTo(locator: Locator, duration = 320, textStart = false) {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('Finger target has no bounding box')
    const x = textStart ? box.x + Math.min(22, Math.max(14, box.width * .08)) : box.x + box.width / 2
    const y = box.y + box.height / 2
    await this.moveToPoint(x, y, duration)
    return { box, x, y }
  }

  async tap(locator: Locator, after = 260, performClick = true) {
    const { x, y } = await this.moveTo(locator)
    const element = await locator.elementHandle()
    if (!element) throw new Error('Finger target has no element')
    await this.page.evaluate(({ x, y, element }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      const ring = document.querySelector<HTMLElement>('#demo-touch-ring')!
      ring.style.left = `${x}px`; ring.style.top = `${y}px`
      element.classList.add('demo-target-pressed')
      finger.classList.remove('demo-tap'); ring.classList.remove('demo-tap')
      void finger.offsetWidth
      finger.classList.add('demo-tap'); ring.classList.add('demo-tap')
    }, { x, y, element })
    await this.page.waitForTimeout(150)
    await locator.evaluate((node) => node.classList.remove('demo-target-pressed'))
    if (performClick) await locator.click()
    await this.page.waitForTimeout(after)
  }

  async type(locator: Locator, value: string, delay: number) {
    const { box, x, y } = await this.moveTo(locator, 280, true)
    await locator.click({ position: { x: x - box.x, y: y - box.y } })
    await this.page.evaluate(() => { document.querySelector<HTMLElement>('#demo-finger')!.style.opacity = '0' })
    await locator.fill('')
    await locator.pressSequentially(value, { delay })
  }
}

async function ensureSignedIn() {
  const authContext = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 400, height: 700 },
    deviceScaleFactor: 1,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  try {
    const page = authContext.pages()[0] || await authContext.newPage()
    await page.goto(`${baseURL}/account`, { waitUntil: 'networkidle' })
    const createOrganization = page.locator('a[href="/account/organizations/new"]')
    if (!(await createOrganization.count() && await createOrganization.isVisible())) {
      console.log('録画専用ブラウザでログインしてください。ログイン完了後、自動で録画を開始します。')
      const login = page.getByRole('button', { name: 'ログイン / 新規登録', exact: true })
      if (await login.count() && await login.isVisible()) {
        await login.click()
        await page.waitForURL(/\/login/, { timeout: 15000 })
      }
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 300000 })
      await page.goto(`${baseURL}/account`, { waitUntil: 'networkidle' })
      await createOrganization.waitFor({ state: 'visible', timeout: 300000 })
    }
  } finally {
    await authContext.close()
  }
}

await ensureSignedIn()

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport,
  deviceScaleFactor: 1,
  recordVideo: { dir: outputDir, size: viewport },
  args: ['--hide-scrollbars', '--disable-blink-features=AutomationControlled'],
})

let recordedVideo: Video | null = null
try {
  const page = context.pages()[0] || await context.newPage()
  recordedVideo = page.video()
  await page.goto(`${baseURL}/orgs`, { waitUntil: 'networkidle' })

  const finger = new DemoFinger(page)
  await finger.init()

  const exhibitionsNav = page.getByRole('button', { name: '展覧会', exact: true })
  await Promise.all([
    page.waitForURL(/\/exhibitions$/, { timeout: 15000 }),
    finger.tap(exhibitionsNav),
  ])
  await finger.init()

  const exhibitionLinks = page.getByRole('link', { name: /maruとサンカク/ })
  const exhibitionCount = await exhibitionLinks.count()
  if (exhibitionCount < 1) throw new Error('「maruとサンカク」が見つかりません')
  const exhibitionLink = exhibitionLinks.first()
  await Promise.all([
    page.waitForURL(/\/exhibition\//, { timeout: 15000 }),
    finger.tap(exhibitionLink),
  ])
  const publicUrl = page.url()
  await finger.init()

  const manage = page.getByRole('link', { name: '展覧会を管理', exact: true })
  await manage.waitFor({ state: 'visible', timeout: 20000 })
  await Promise.all([
    page.waitForURL(/\/dashboard\/exhibitions\/[^/]+\/artworks$/, { timeout: 15000 }),
    finger.tap(manage),
  ])
  await finger.init()

  const addArtwork = page.getByRole('button', { name: '作品追加', exact: true })
  await addArtwork.waitFor({ state: 'visible' })
  const chooserPromise = page.waitForEvent('filechooser')
  await finger.tap(addArtwork)
  const chooser = await chooserPromise
  await chooser.setFiles(imagePath)

  const dialog = page.getByRole('dialog', { name: '画像を調整', exact: true })
  await dialog.waitFor({ state: 'visible' })
  const cropSvg = dialog.locator('.ui-artwork-create-cropbox svg')
  await cropSvg.waitFor({ state: 'visible', timeout: 15000 })

  const cropTargets = [
    { name: '左上の角', x: 0.313, y: 0.247 },
    { name: '右上の角', x: 0.689, y: 0.247 },
    { name: '右下の角', x: 0.689, y: 0.725 },
    { name: '左下の角', x: 0.313, y: 0.725 },
  ]

  for (const target of cropTargets) {
    const cropBox = await cropSvg.boundingBox()
    if (!cropBox) throw new Error(`${target.name}の座標を取得できません`)
    const start = {
      x: cropBox.x + (target.name.startsWith('右') ? cropBox.width - 4 : 4),
      y: cropBox.y + (target.name.includes('下') ? cropBox.height - 4 : 4),
    }
    const end = { x: cropBox.x + cropBox.width * target.x, y: cropBox.y + cropBox.height * target.y }
    await finger.moveToPoint(start.x, start.y, 180)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    for (let index = 1; index <= 18; index += 1) {
      const progress = 1 - Math.pow(1 - index / 18, 3)
      const x = start.x + (end.x - start.x) * progress
      const y = start.y + (end.y - start.y) * progress
      await page.mouse.move(x, y)
      await page.evaluate(({ x, y }) => {
        const node = document.querySelector<HTMLElement>('#demo-finger')!
        node.style.setProperty('--move-duration', '0ms')
        node.style.transform = `translate3d(${x - 12}px, ${y - 3}px, 0)`
      }, { x, y })
      await page.waitForTimeout(12)
    }
    await page.mouse.up()
    await page.waitForTimeout(90)
  }

  const confirmImage = page.getByRole('button', { name: '保存して作品情報へ', exact: true })
  await finger.tap(confirmImage)

  const title = page.getByPlaceholder('作品名を入力')
  const description = page.getByPlaceholder('説明文を入力')
  await title.waitFor({ state: 'visible', timeout: 15000 })
  await finger.type(title, artwork.title, 55)
  await finger.type(description, artwork.description, 34)

  const save = page.getByRole('button', { name: '保存する', exact: true })
  // 操作は録画に見せるが、Cloudinary/Supabaseへの保存は行わない。
  await finger.tap(save, 420, false)
  await page.goto(publicUrl, { waitUntil: 'networkidle' })
  await finger.init()

  const launch3d = page.getByRole('button', { name: '3D空間で巡る', exact: true })
  await launch3d.waitFor({ state: 'visible', timeout: 20000 })
  await finger.tap(launch3d)

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

  await finger.moveToPoint(center.x, center.y, 220)
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x - 120, center.y + 18, { steps: 32 })
  await page.mouse.up()
  await finger.moveToPoint(center.x - 120, center.y + 18, 0)
  await page.waitForTimeout(800)

  const nextView = page.getByRole('button', { name: '次の視点へ移動', exact: true })
  await finger.tap(nextView)
  await page.mouse.move(center.x, center.y)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(1100)
  await finger.tap(nextView)
  await page.mouse.move(center.x, center.y)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(2600)
} finally {
  await context.close()
}

if (!recordedVideo) throw new Error('Playwright did not produce a video')
const recordedPath = await recordedVideo.path()
await copyFile(recordedPath, rawVideo)

const ffmpeg = spawnSync('ffmpeg', [
  '-y', '-ss', process.env.DEMO_TRIM_START || '0.4', '-i', rawVideo,
  '-t', process.env.DEMO_DURATION || '15.1',
  '-vf', 'setpts=0.62*PTS,fps=30,scale=1080:1350:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2',
  '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', '-an', finalVideo,
], { stdio: 'inherit' })
if (ffmpeg.status !== 0) throw new Error('ffmpeg conversion failed')
console.log(finalVideo)
