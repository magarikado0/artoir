import { chromium, type Locator, type Page, type Video } from 'playwright'
import { mkdir, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { exhibitionDemoData as data } from '../demo/exhibition-demo-data.ts'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const viewport = { width: 400, height: 500 }
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'create-exhibition-mobile-raw.webm')
const finalVideo = resolve('public/videos/create-exhibition-mobile.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')
const thumbnailPath = resolve(process.env.DEMO_THUMBNAIL || '/Users/yoshida/Downloads/abstract_geometric_painting.png')
const typeDelay = Number(process.env.DEMO_TYPE_DELAY || 30)

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

  async moveTo(locator: Locator, duration = 320, textStart = false) {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('Finger target has no bounding box')
    const tipX = textStart ? box.x + Math.min(22, Math.max(14, box.width * .08)) : box.x + box.width / 2
    const tipY = box.y + box.height / 2
    await this.page.evaluate(({ x, y, duration }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      finger.style.setProperty('--move-duration', `${duration}ms`)
      finger.style.opacity = '1'
      finger.style.transform = `translate3d(${x - 12}px, ${y - 3}px, 0)`
    }, { x: tipX, y: tipY, duration })
    await this.page.waitForTimeout(duration + 40)
    return { box, tipX, tipY }
  }

  async tap(locator: Locator, after = 260, performClick = true) {
    const { tipX, tipY } = await this.moveTo(locator)
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
    }, { x: tipX, y: tipY, element })
    await this.page.waitForTimeout(150)
    await locator.evaluate((node) => node.classList.remove('demo-target-pressed'))
    if (performClick) await locator.click()
    await this.page.waitForTimeout(after)
  }

  async type(locator: Locator, value: string) {
    const { box, tipX, tipY } = await this.moveTo(locator, 280, true)
    await locator.click({ position: { x: tipX - box.x, y: tipY - box.y } })
    await this.page.evaluate(() => { document.querySelector<HTMLElement>('#demo-finger')!.style.opacity = '0' })
    await locator.fill('')
    await locator.pressSequentially(value, { delay: typeDelay })
  }

  async fill(locator: Locator, value: string) {
    await this.tap(locator, 80, false)
    await locator.fill(value)
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
      console.log('録画専用Chromeでログインしてください。ログイン完了後、自動で録画を開始します。')
      const login = page.getByRole('button', { name: 'ログイン / 新規登録', exact: true })
      if (await login.count() && await login.isVisible()) {
        await login.click()
        await page.waitForURL(/\/login/, { timeout: 15000 })
      }
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 300000 })
      await page.goto(`${baseURL}/account`, { waitUntil: 'networkidle' })
      await createOrganization.waitFor({ state: 'visible', timeout: 300000 })
    }
    const organizationRows = page.locator('.ui-account-org-pick-btn')
    if (!(await organizationRows.count())) throw new Error('録画に使用できる団体がありません')
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
let organizationSlug = ''
try {
  const page = context.pages()[0] || await context.newPage()
  recordedVideo = page.video()
  await page.goto(`${baseURL}/exhibitions`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) throw new Error(`Demo profile is not signed in: ${page.url()}`)

  const finger = new DemoFinger(page)
  await finger.init()

  const firstCreate = page.getByRole('button', { name: '展覧会を作成', exact: true })
  await firstCreate.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/account$/, { timeout: 15000 }),
    finger.tap(firstCreate),
  ])
  await finger.init()

  const organizationRows = page.locator('.ui-account-org-pick-btn')
  const organizationCount = await organizationRows.count()
  if (!organizationCount) throw new Error('録画に使用できる団体がありません')
  await Promise.all([
    page.waitForURL(/\/dashboard$/, { timeout: 15000 }),
    finger.tap(organizationRows.first()),
  ])
  organizationSlug = new URL(page.url()).pathname.split('/')[1]
  await finger.init()

  const secondCreate = page.getByRole('button', { name: '展覧会を作成', exact: true })
  await secondCreate.waitFor({ state: 'visible' })
  await Promise.all([
    page.waitForURL(/\/dashboard\/exhibitions\/new$/, { timeout: 15000 }),
    finger.tap(secondCreate),
  ])
  await finger.init()

  const title = page.locator('.ui-form-field').filter({ has: page.getByText('タイトル', { exact: true }) }).locator('input')
  const dates = page.locator('.ui-exhibition-date-grid input[type="date"]')
  const times = page.locator('.ui-exhibition-date-grid input[type="time"]')
  if (await dates.count() !== 2 || await times.count() !== 2) throw new Error('Expected date and time inputs')
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
  await finger.type(title, data.title)
  await finger.fill(startDate, data.startDate)
  await finger.fill(startTime, data.startTime)
  await finger.fill(endDate, data.endDate)
  await finger.fill(endTime, data.endTime)
  await finger.type(location, data.location)
  await finger.type(description, data.description)
  await finger.tap(publicOption)

  const chooserPromise = page.waitForEvent('filechooser')
  await finger.tap(uploadTrigger, 120)
  const chooser = await chooserPromise
  await chooser.setFiles(thumbnailPath)
  await uploadedPreview.waitFor({ state: 'visible', timeout: 30000 })

  await finger.tap(save, 120, false)
  await page.goto(`${baseURL}/${organizationSlug}/dashboard`, { waitUntil: 'networkidle' })
  await finger.init()
  await page.waitForTimeout(1800)
} finally {
  await context.close()
}

if (!recordedVideo) throw new Error('Playwright did not produce a video')
const recordedPath = await recordedVideo.path()
await copyFile(recordedPath, rawVideo)

const ffmpeg = spawnSync('ffmpeg', [
  '-y', '-ss', '0.4', '-i', rawVideo,
  '-vf', 'setpts=0.87*PTS,fps=30,scale=1080:1350:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2',
  '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', '-an', finalVideo,
], { stdio: 'inherit' })
if (ffmpeg.status !== 0) throw new Error('ffmpeg conversion failed')
console.log(finalVideo)
