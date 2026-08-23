import { chromium, type Locator, type Page, type Video } from 'playwright'
import { mkdir, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { demoData } from '../demo/demo-data.ts'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const viewport = { width: 400, height: 500 }
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'artoir-organization-mobile-demo.webm')
const finalVideo = resolve('public/videos/create-organization-mobile.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')
const typeDelay = Number(process.env.DEMO_TYPE_DELAY || 32)
const existingOrgSlug = process.env.DEMO_EXISTING_ORG_SLUG || ''
let fallbackOrgSlug = existingOrgSlug

await mkdir(outputDir, { recursive: true })

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
          position: fixed;
          left: 0;
          top: 0;
          z-index: 2147483647;
          width: 27px;
          height: 31px;
          pointer-events: none;
          transform: translate3d(330px, 420px, 0);
          opacity: 0;
          transition: transform var(--move-duration, 460ms) cubic-bezier(.22, 1, .36, 1), opacity 120ms ease;
          filter: drop-shadow(0 2px 4px rgba(31, 27, 23, .16));
          transform-origin: 12px 3px;
        }
        #demo-finger svg { display: block; width: 100%; height: 100%; }
        #demo-touch-ring {
          position: fixed;
          z-index: 2147483646;
          width: 14px;
          height: 14px;
          border: 1px solid rgba(190, 85, 61, .55);
          border-radius: 999px;
          opacity: 0;
          pointer-events: none;
        }
        #demo-finger.demo-tap { animation: demo-finger-tap 280ms ease-out; }
        #demo-touch-ring.demo-tap { animation: demo-touch-ring 520ms ease-out; }
        .demo-target-pressed { filter: brightness(.94) !important; transition: filter 180ms ease !important; }
        @keyframes demo-finger-tap {
          0%, 100% { scale: 1; }
          45% { scale: .95; }
        }
        @keyframes demo-touch-ring {
          0% { opacity: .5; transform: translate(-50%, -50%) scale(.45); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
      `
      document.head.appendChild(style)
      const finger = document.createElement('div')
      finger.id = 'demo-finger'
      finger.innerHTML = `
        <svg viewBox="0 0 76 88" aria-hidden="true">
          <path d="M34 8c5 0 9 4 9 9v24l4-12c2-5 9-6 12-2 2 2 2 5 1 8l-8 28c-2 8-9 14-18 14h-5c-8 0-15-5-18-12L3 47c-2-5 0-10 5-12 4-1 8 1 10 5l7 12V17c0-5 4-9 9-9Z" fill="#F7F3EC" stroke="#4A413A" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M34 8v42" fill="none" stroke="#4A413A" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      `
      document.body.appendChild(finger)
      const ring = document.createElement('div')
      ring.id = 'demo-touch-ring'
      document.body.appendChild(ring)
    })
  }

  async moveTo(locator: Locator, duration = 460, placement: 'center' | 'text-start' | 'icon' = 'center') {
    await locator.scrollIntoViewIfNeeded()
    let box = await locator.boundingBox()
    if (!box) throw new Error('Finger target has no bounding box')
    if (placement === 'icon') {
      const icon = locator.locator('svg')
      if (await icon.count()) box = await icon.first().boundingBox() || box
    }
    const tipX = placement === 'text-start'
      ? box.x + Math.min(22, Math.max(14, box.width * .08))
      : box.x + box.width / 2
    const tipY = box.y + box.height / 2
    const x = tipX - 12
    const y = tipY - 3
    await this.page.evaluate(({ x, y, duration }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      finger.style.setProperty('--move-duration', `${duration}ms`)
      finger.style.opacity = '1'
      finger.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }, { x, y, duration })
    await this.page.waitForTimeout(duration + 70)
    return { box, tipX, tipY }
  }

  async tap(locator: Locator, after = 500, placement: 'center' | 'icon' = 'center', performClick = true) {
    const { tipX, tipY } = await this.moveTo(locator, 460, placement)
    await this.page.evaluate(({ x, y, element }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      const ring = document.querySelector<HTMLElement>('#demo-touch-ring')!
      ring.style.left = `${x}px`
      ring.style.top = `${y}px`
      element.classList.add('demo-target-pressed')
      finger.classList.remove('demo-tap')
      ring.classList.remove('demo-tap')
      void finger.offsetWidth
      finger.classList.add('demo-tap')
      ring.classList.add('demo-tap')
    }, { x: tipX, y: tipY, element: await locator.elementHandle() })
    await this.page.waitForTimeout(190)
    if (performClick) await locator.click()
    await locator.evaluate((element) => element.classList.remove('demo-target-pressed')).catch(() => {})
    await this.page.waitForTimeout(after)
  }

  async fill(locator: Locator, value: string) {
    const { box, tipX, tipY } = await this.moveTo(locator, 380, 'text-start')
    await this.page.evaluate(({ x, y, element }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      const ring = document.querySelector<HTMLElement>('#demo-touch-ring')!
      ring.style.left = `${x}px`
      ring.style.top = `${y}px`
      element.classList.add('demo-target-pressed')
      finger.classList.remove('demo-tap')
      ring.classList.remove('demo-tap')
      void finger.offsetWidth
      finger.classList.add('demo-tap')
      ring.classList.add('demo-tap')
    }, { x: tipX, y: tipY, element: await locator.elementHandle() })
    await this.page.waitForTimeout(180)
    await locator.click({ position: { x: tipX - box.x, y: tipY - box.y } })
    await locator.evaluate((element) => element.classList.remove('demo-target-pressed'))
    await this.page.evaluate(() => { document.querySelector<HTMLElement>('#demo-finger')!.style.opacity = '0' })
    await locator.fill('')
    await locator.pressSequentially(value, { delay: typeDelay })
    await this.page.waitForTimeout(140)
  }
}

async function ensureSignedIn() {
  const authContext = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 390, height: 720 },
    deviceScaleFactor: 1,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  try {
    const authPage = authContext.pages()[0] || await authContext.newPage()
    await authPage.goto(`${baseURL}/account`, { waitUntil: 'networkidle' })
    const createOrganization = authPage.locator('a[href="/account/organizations/new"]')
    if (!(await createOrganization.count() && await createOrganization.isVisible())) {
      console.log('録画専用Chromeでログインしてください。ログイン完了後、自動で録画を開始します。')
      const login = authPage.getByRole('button', { name: 'ログイン / 新規登録', exact: true })
      if (await login.count() && await login.isVisible()) {
        await login.click()
        await authPage.waitForURL(/\/login/, { timeout: 15000 })
      }
      await authPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 300000 })
      await authPage.goto(`${baseURL}/account`, { waitUntil: 'networkidle' })
      await createOrganization.waitFor({ state: 'visible', timeout: 300000 })
    }

    const organizationRows = authPage.locator('.ui-account-org-pick-btn')
    const organizationCount = await organizationRows.count()
    if (!organizationCount) throw new Error('録画に使用できる既存団体がありません')
    await organizationRows.first().click()
    await authPage.waitForURL(/\/[^/]+\/dashboard(?:\/|$)/, { timeout: 15000 })
    fallbackOrgSlug = new URL(authPage.url()).pathname.split('/')[1]
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
  await page.goto(`${baseURL}/account/organizations/new`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) throw new Error(`Demo profile is not signed in: ${page.url()}`)

  const finger = new DemoFinger(page)
  await finger.init()
  await page.waitForTimeout(140)

  const name = page.getByPlaceholder('例: Artoir.同好会')
  const slug = page.getByPlaceholder('例: artoir_academy')
  const description = page.getByPlaceholder('団体の説明文を入力...')
  await name.waitFor({ state: 'visible' })
  await finger.fill(name, demoData.organizationName)
  await finger.fill(slug, demoData.organizationId)
  await finger.fill(description, demoData.description)

  const create = page.getByRole('button', { name: '作成する', exact: true })
  if (fallbackOrgSlug) {
    await finger.tap(create, 120, 'center', false)
    await page.goto(`${baseURL}/account/organizations/${fallbackOrgSlug}/links`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(580)
  } else {
    await Promise.all([
      page.waitForURL(/\/account\/organizations\/[^/]+\/links/, { timeout: 20000 }),
      finger.tap(create, 700),
    ])
  }
  await finger.init()

  const instagram = page.locator('.ui-form-field').filter({ hasText: 'INSTAGRAM' }).getByPlaceholder('username')
  const x = page.locator('.ui-form-field').filter({ hasText: 'X (TWITTER)' }).getByPlaceholder('username')
  const website = page.getByPlaceholder('https://example.com')
  await instagram.waitFor({ state: 'visible' })
  await finger.fill(instagram, demoData.instagram)
  await finger.fill(x, demoData.x)
  await finger.fill(website, demoData.website)

  const save = page.getByRole('button', { name: '保存して次へ', exact: true })
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 20000 }),
    finger.tap(save, 900),
  ])
  await finger.init()
  await page.waitForTimeout(1800)
} finally {
  await context.close()
}

if (!recordedVideo) throw new Error('Playwright did not produce a video')
const recordedPath = await recordedVideo.path()
await copyFile(recordedPath, rawVideo)
const ffmpeg = spawnSync('ffmpeg', [
  '-y',
  '-ss', '0.65',
  '-i', rawVideo,
  '-t', '15.8',
  '-vf', 'fps=30,scale=1080:1350:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264',
  '-profile:v', 'high',
  '-level', '4.2',
  '-preset', 'slow',
  '-crf', '18',
  '-movflags', '+faststart',
  '-an',
  finalVideo,
], { stdio: 'inherit' })
if (ffmpeg.status !== 0) throw new Error('ffmpeg conversion failed')
console.log(finalVideo)
