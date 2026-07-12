import { chromium, type Locator, type Page } from 'playwright'
import { mkdir, copyFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const viewport = { width: 390, height: 488 }
const outputDir = resolve('artifacts/demo')
const rawVideo = resolve(outputDir, 'artoir-organization-mobile-demo.webm')
const finalVideo = resolve('public/videos/create-organization-mobile.mp4')
const profileDir = resolve(process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile')
const typeDelay = Number(process.env.DEMO_TYPE_DELAY || 32)
const existingOrgSlug = process.env.DEMO_EXISTING_ORG_SLUG || ''

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
          width: 38px;
          height: 44px;
          pointer-events: none;
          transform: translate3d(330px, 420px, 0);
          transition: transform var(--move-duration, 420ms) cubic-bezier(.22, 1, .36, 1);
          filter: drop-shadow(0 6px 8px rgba(31, 27, 23, .28));
          transform-origin: 19px 5px;
        }
        #demo-finger svg { display: block; width: 100%; height: 100%; }
        #demo-touch-ring {
          position: fixed;
          z-index: 2147483646;
          width: 18px;
          height: 18px;
          border: 2px solid #BE553D;
          border-radius: 999px;
          opacity: 0;
          pointer-events: none;
        }
        #demo-finger.demo-tap { animation: demo-finger-tap 280ms ease-out; }
        #demo-touch-ring.demo-tap { animation: demo-touch-ring 520ms ease-out; }
        @keyframes demo-finger-tap {
          0%, 100% { scale: 1; }
          45% { scale: .82; }
        }
        @keyframes demo-touch-ring {
          0% { opacity: .85; transform: translate(-50%, -50%) scale(.35); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.8); }
        }
      `
      document.head.appendChild(style)
      const finger = document.createElement('div')
      finger.id = 'demo-finger'
      finger.innerHTML = `
        <svg viewBox="0 0 76 88" aria-hidden="true">
          <path d="M34 8c5 0 9 4 9 9v24l4-12c2-5 9-6 12-2 2 2 2 5 1 8l-8 28c-2 8-9 14-18 14h-5c-8 0-15-5-18-12L3 47c-2-5 0-10 5-12 4-1 8 1 10 5l7 12V17c0-5 4-9 9-9Z" fill="#FBF8F3" stroke="#1F1B17" stroke-width="3.5" stroke-linejoin="round"/>
          <path d="M34 8v42" fill="none" stroke="#1F1B17" stroke-width="3.5" stroke-linecap="round"/>
        </svg>
      `
      document.body.appendChild(finger)
      const ring = document.createElement('div')
      ring.id = 'demo-touch-ring'
      document.body.appendChild(ring)
    })
  }

  async moveTo(locator: Locator, duration = 420) {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('Finger target has no bounding box')
    const x = box.x + box.width / 2 - 19
    const y = box.y + box.height / 2 - 5
    await this.page.evaluate(({ x, y, duration }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      finger.style.setProperty('--move-duration', `${duration}ms`)
      finger.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }, { x, y, duration })
    await this.page.waitForTimeout(duration + 100)
  }

  async tap(locator: Locator, after = 500) {
    await this.moveTo(locator)
    const box = await locator.boundingBox()
    if (!box) throw new Error('Tap target has no bounding box')
    await this.page.evaluate(({ x, y }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      const ring = document.querySelector<HTMLElement>('#demo-touch-ring')!
      ring.style.left = `${x}px`
      ring.style.top = `${y}px`
      finger.classList.remove('demo-tap')
      ring.classList.remove('demo-tap')
      void finger.offsetWidth
      finger.classList.add('demo-tap')
      ring.classList.add('demo-tap')
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
    await this.page.waitForTimeout(120)
    await locator.click()
    await this.page.waitForTimeout(after)
  }

  async fill(locator: Locator, value: string) {
    await this.moveTo(locator, 320)
    await locator.click()
    await locator.fill('')
    await locator.pressSequentially(value, { delay: typeDelay })
    await this.page.waitForTimeout(180)
  }
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.count() && await locator.first().isVisible()) return locator.first()
  }
  return null
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
    if (await createOrganization.count() && await createOrganization.isVisible()) return

    console.log('録画専用Chromeでログインしてください。ログイン完了後、自動で録画を開始します。')
    const login = authPage.getByRole('button', { name: 'ログイン / 新規登録', exact: true })
    if (await login.count() && await login.isVisible()) await login.click()
    await createOrganization.waitFor({ state: 'visible', timeout: 300000 })
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

let recordedPath = ''
try {
  const page = context.pages()[0] || await context.newPage()
  const video = page.video()
  await page.goto(`${baseURL}/exhibitions`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) throw new Error(`Demo profile is not signed in: ${page.url()}`)

  const finger = new DemoFinger(page)
  await finger.init()
  await page.waitForTimeout(700)

  const account = await firstVisible([
    page.getByRole('link', { name: 'アカウント', exact: true }),
    page.getByRole('button', { name: 'アカウント', exact: true }),
    page.getByText('アカウント', { exact: true }),
  ])
  if (!account) throw new Error('「アカウント」が見つかりません')
  await Promise.all([
    page.waitForURL(/\/(?:account|profile\/[^/?]+)(?:\?.*)?$/, { timeout: 15000 }),
    finger.tap(account, 650),
  ])
  await finger.init()

  if (!/\/account(?:\?.*)?$/.test(page.url())) {
    await page.getByRole('link', { name: '管理', exact: true }).waitFor({ state: 'visible', timeout: 20000 })
    const manage = await firstVisible([
      page.getByRole('link', { name: '管理', exact: true }),
      page.getByText('管理', { exact: true }),
    ])
    if (!manage) throw new Error('「管理」が見つかりません')
    await Promise.all([
      page.waitForURL(/\/account(?:\?.*)?$/, { timeout: 15000 }),
      finger.tap(manage, 650),
    ])
    await finger.init()
  }

  await page.getByRole('link', { name: /団体を作成/ }).waitFor({ state: 'visible', timeout: 20000 })

  const createOrganization = await firstVisible([
    page.getByRole('link', { name: /団体を作成/ }),
    page.getByRole('button', { name: /団体を作成/ }),
    page.getByText('団体を作成', { exact: true }),
  ])
  if (!createOrganization) throw new Error('「団体を作成」が見つかりません')
  await Promise.all([
    page.waitForURL(/\/account\/organizations\/new/, { timeout: 15000 }),
    finger.tap(createOrganization, 500),
  ])
  await finger.init()

  const name = page.getByPlaceholder('例: Artoir.同好会')
  const slug = page.getByPlaceholder('例: artoir_academy')
  const description = page.getByPlaceholder('団体の説明文を入力...')
  await name.waitFor({ state: 'visible' })
  await finger.fill(name, 'Artoir同好会')
  await finger.fill(slug, 'rotor_net')
  await finger.fill(description, '展覧会と作品登録をまとめるための団体です。')

  const create = page.getByRole('button', { name: '作成する', exact: true })
  if (existingOrgSlug) {
    await finger.tap(create, 120)
    await page.goto(`${baseURL}/account/organizations/${existingOrgSlug}/links`, { waitUntil: 'networkidle' })
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
  await finger.fill(instagram, 'artier_net')
  await finger.fill(x, 'artoir')
  await finger.fill(website, 'https://artoir.net')

  const save = page.getByRole('button', { name: '保存して次へ', exact: true })
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 20000 }),
    finger.tap(save, 900),
  ])
  await finger.init()
  await page.waitForTimeout(1800)
  if (video) recordedPath = await video.path()
} finally {
  await context.close()
}

if (!recordedPath) throw new Error('Playwright did not produce a video')
await copyFile(recordedPath, rawVideo)
const ffmpeg = spawnSync('ffmpeg', [
  '-y',
  '-i', rawVideo,
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
