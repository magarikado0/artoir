#!/usr/bin/env node

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:5173'
const USER_DATA_DIR = process.env.DEMO_USER_DATA_DIR || '.playwright-demo-profile'
const VIDEO_DIR = process.env.DEMO_VIDEO_DIR || 'demo-recordings'
const RECORD_VIDEO = process.env.DEMO_RECORD_VIDEO !== '0'
const SLOW = Number(process.env.DEMO_SLOW || 1)
const HOLD_MS = Number(process.env.DEMO_HOLD_MS || 10000)
const VIEWPORT = {
  width: Number(process.env.DEMO_WIDTH || 1470),
  height: Number(process.env.DEMO_HEIGHT || 956),
}

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error([
    'Playwright is not installed.',
    'Install it in app/: npm install -D playwright',
    'Then run: npm run demo:record-flow',
  ].join('\n'))
  process.exit(1)
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms * SLOW))

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const cursorInitScript = () => {
  const CURSOR_ID = 'demo-cursor'
  const RIPPLE_ID = 'demo-click-ripple'
  const STYLE_ID = 'demo-cursor-style'

  function ensureCursorOverlay() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        html.demo-hide-native-cursor, html.demo-hide-native-cursor * {
          cursor: none !important;
        }
        #${CURSOR_ID} {
          position: fixed;
          left: 0;
          top: 0;
          width: 60px;
          height: 60px;
          z-index: 2147483647;
          pointer-events: none;
          transform: translate3d(var(--demo-cursor-x, 50vw), var(--demo-cursor-y, 50vh), 0) scale(var(--demo-cursor-scale, 1));
          transform-origin: 7px 7px;
          transition: transform 72ms ease-out;
          will-change: transform;
        }
        #${CURSOR_ID}.is-pressed {
          --demo-cursor-scale: 0.82;
        }
        #${CURSOR_ID} svg {
          display: block;
          width: 60px;
          height: 60px;
          filter:
            drop-shadow(0 0 0 #fff7c2)
            drop-shadow(0 0 7px rgba(255, 220, 94, 0.95))
            drop-shadow(0 7px 12px rgba(0, 0, 0, 0.38));
        }
        #${RIPPLE_ID} {
          position: fixed;
          left: 0;
          top: 0;
          width: 22px;
          height: 22px;
          margin-left: -11px;
          margin-top: -11px;
          border-radius: 999px;
          border: 4px solid rgba(31, 27, 23, 0.86);
          background: rgba(255, 230, 104, 0.26);
          z-index: 2147483646;
          pointer-events: none;
          opacity: 0;
          transform: translate3d(-100px, -100px, 0) scale(0.25);
        }
        #${RIPPLE_ID}.is-active {
          animation: demo-click-ripple 520ms ease-out forwards;
        }
        @keyframes demo-click-ripple {
          0% { opacity: 0.75; transform: translate3d(var(--demo-ripple-x), var(--demo-ripple-y), 0) scale(0.25); }
          100% { opacity: 0; transform: translate3d(var(--demo-ripple-x), var(--demo-ripple-y), 0) scale(3.2); }
        }
      `
      document.head.appendChild(style)
    }

    document.documentElement.classList.add('demo-hide-native-cursor')

    let cursor = document.getElementById(CURSOR_ID)
    if (!cursor) {
      cursor = document.createElement('div')
      cursor.id = CURSOR_ID
      cursor.setAttribute('aria-hidden', 'true')
      cursor.innerHTML = `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M10.5 7.5 51 39.5 33.2 42.4 24.2 58.5 10.5 7.5Z"
            fill="none"
            stroke="#ffd84f"
            stroke-width="8"
            stroke-linejoin="round"
            opacity="0.88"
          />
          <path
            d="M10.5 7.5 51 39.5 33.2 42.4 24.2 58.5 10.5 7.5Z"
            fill="#fffdf8"
            stroke="#1f1b17"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <path
            d="M33.2 42.4 45.6 58"
            fill="none"
            stroke="#1f1b17"
            stroke-width="4"
            stroke-linecap="round"
          />
        </svg>
      `
      ;(document.body || document.documentElement).appendChild(cursor)
    }

    if (!document.getElementById(RIPPLE_ID)) {
      const ripple = document.createElement('div')
      ripple.id = RIPPLE_ID
      ripple.setAttribute('aria-hidden', 'true')
      ;(document.body || document.documentElement).appendChild(ripple)
    }
  }

  ensureCursorOverlay()

  const observer = new MutationObserver(() => ensureCursorOverlay())
  observer.observe(document.documentElement, { childList: true, subtree: true })

  window.__demoCursor = {
    ensure: ensureCursorOverlay,
    setPosition(x, y) {
      ensureCursorOverlay()
      const cursor = document.getElementById(CURSOR_ID)
      cursor.style.setProperty('--demo-cursor-x', `${x}px`)
      cursor.style.setProperty('--demo-cursor-y', `${y}px`)
    },
    setPressed(pressed) {
      ensureCursorOverlay()
      document.getElementById(CURSOR_ID).classList.toggle('is-pressed', Boolean(pressed))
    },
    ripple(x, y) {
      ensureCursorOverlay()
      const ripple = document.getElementById(RIPPLE_ID)
      ripple.classList.remove('is-active')
      ripple.style.setProperty('--demo-ripple-x', `${x}px`)
      ripple.style.setProperty('--demo-ripple-y', `${y}px`)
      void ripple.offsetWidth
      ripple.classList.add('is-active')
    },
  }
}

class DemoDriver {
  constructor(page) {
    this.page = page
    this.x = VIEWPORT.width * 0.63
    this.y = VIEWPORT.height * 0.72
  }

  async ensureCursor() {
    await this.page.evaluate(() => window.__demoCursor?.ensure?.())
    await this.page.evaluate(({ x, y }) => window.__demoCursor?.setPosition?.(x, y), { x: this.x, y: this.y })
  }

  async centerOf(locator) {
    await locator.waitFor({ state: 'visible', timeout: 15000 })
    await locator.scrollIntoViewIfNeeded()
    await delay(180)
    const box = await locator.boundingBox()
    if (!box) throw new Error('Could not resolve locator bounds')
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  async moveTo(locator, options = {}) {
    const target = await this.centerOf(locator)
    await this.moveToPoint(target.x, target.y, options)
  }

  async moveToPoint(targetX, targetY, options = {}) {
    const duration = options.duration ?? 700
    const steps = Math.max(14, Math.round(duration / 16))
    const startX = this.x
    const startY = this.y

    for (let i = 1; i <= steps; i += 1) {
      const t = easeInOutCubic(i / steps)
      const x = startX + (targetX - startX) * t
      const y = startY + (targetY - startY) * t
      await this.page.mouse.move(x, y)
      await this.page.evaluate((point) => window.__demoCursor?.setPosition?.(point.x, point.y), { x, y })
      await delay(duration / steps)
    }

    this.x = targetX
    this.y = targetY
  }

  async click(locator, options = {}) {
    await this.moveTo(locator, { duration: options.moveDuration ?? 680 })
    await delay(options.before ?? 120)
    await this.page.evaluate(() => window.__demoCursor?.setPressed?.(true))
    await this.page.mouse.down()
    await delay(options.hold ?? 95)
    await this.page.evaluate(({ x, y }) => window.__demoCursor?.ripple?.(x, y), { x: this.x, y: this.y })
    await this.page.mouse.up()
    await this.page.evaluate(() => window.__demoCursor?.setPressed?.(false))
    await delay(options.after ?? 360)
  }

  async fill(locator, value, options = {}) {
    await this.click(locator, { moveDuration: options.moveDuration ?? 620, after: 120 })
    await this.page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await delay(120)
    await this.page.keyboard.type(value, { delay: options.keyDelay ?? 62 })
    await delay(options.after ?? 340)
  }
}

function field(page, labelText) {
  return page
    .locator('.ui-form-field')
    .filter({ has: page.locator('.ui-form-label', { hasText: labelText }) })
    .locator('input, textarea')
    .first()
}

async function clickFirstVisible(driver, locators, options) {
  if (await tryClickFirstVisible(driver, locators, options)) return true
  throw new Error('No visible target was found for the requested demo action.')
}

async function tryClickFirstVisible(driver, locators, options) {
  for (const locator of locators) {
    try {
      if (await locator.first().isVisible({ timeout: 900 })) {
        await driver.click(locator.first(), options)
        return true
      }
    } catch {
      // Try the next candidate.
    }
  }
  return false
}

async function waitForScreen(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 })
}

async function ensureAuthenticated(page) {
  const loginCta = page.getByRole('button', { name: /ログイン \/ 新規登録/ })
  if (await loginCta.isVisible({ timeout: 500 }).catch(() => false)) {
    await loginCta.click()
    await page.waitForURL((url) => String(url).includes('/login'), { timeout: 10000 })
  }

  const onLoginPage = page.url().includes('/login') ||
    await page.getByRole('button', { name: /Google で続ける/ }).isVisible({ timeout: 500 }).catch(() => false)
  if (!onLoginPage) return

  console.log([
    'The demo browser profile is not logged in.',
    `Log in in the opened Playwright browser profile (${USER_DATA_DIR}).`,
    'After login completes, this script will continue. For a clean recording, run it once more with the saved profile.',
  ].join(' '))
  await page.waitForURL((url) => !String(url).includes('/login'), { timeout: 0 })
  await delay(1500)
}

const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: false,
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  ...(RECORD_VIDEO ? {
    recordVideo: {
      dir: VIDEO_DIR,
      size: VIEWPORT,
    },
  } : {}),
  args: ['--disable-blink-features=AutomationControlled'],
})

const page = context.pages()[0] || await context.newPage()
await page.addInitScript(cursorInitScript)
await page.goto(`${BASE_URL}/exhibitions`, { waitUntil: 'domcontentloaded' })

const demo = new DemoDriver(page)
await demo.ensureCursor()
await delay(1200)

const clickedAccount = await tryClickFirstVisible(demo, [
  page.getByRole('link', { name: 'アカウント' }),
  page.getByText('アカウント', { exact: true }),
])
if (!clickedAccount) {
  await demo.moveToPoint(VIEWPORT.width * 0.58, 158, { duration: 620 })
  await page.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded' })
  await demo.ensureCursor()
}
await delay(900)
await ensureAuthenticated(page)

if (await tryClickFirstVisible(demo, [
  page.getByRole('link', { name: /管理/ }),
  page.getByRole('button', { name: /管理/ }),
  page.getByText('管理', { exact: true }),
], { moveDuration: 560 })) {
  await delay(900)
}

const clickedCreateOrganization = await tryClickFirstVisible(demo, [
  page.getByRole('link', { name: /団体を作成/ }),
  page.getByRole('button', { name: /団体を作成/ }),
  page.getByText('団体を作成', { exact: true }),
])
if (!clickedCreateOrganization) {
  await demo.moveToPoint(VIEWPORT.width * 0.85, 258, { duration: 650 })
  await page.goto(`${BASE_URL}/account/organizations/new`, { waitUntil: 'domcontentloaded' })
  await demo.ensureCursor()
}

await waitForScreen(page, '団体を作成')
await delay(700)
await demo.fill(field(page, '団体名'), 'Artoir同好会')
await demo.fill(field(page, 'ID'), 'artoir_net')
await demo.fill(field(page, '説明文'), '学生の展示活動と作品記録をまとめるための団体ページです。')
await demo.click(page.getByRole('button', { name: /作成する/ }), { moveDuration: 760, after: 900 })

await waitForScreen(page, 'SNSリンクを登録')
await delay(700)
await demo.fill(field(page, 'INSTAGRAM'), 'artoir_net')
await demo.fill(field(page, 'X (TWITTER)'), 'artoir')
await demo.fill(field(page, 'WEBSITE'), 'https://artoir.net')
await demo.click(page.getByRole('button', { name: /保存して次へ/ }), { moveDuration: 760, after: 1100 })

await waitForScreen(page, '展覧会')
await delay(800)
await demo.click(page.getByRole('button', { name: /展覧会を作成/ }), { moveDuration: 720, after: 900 })

await waitForScreen(page, '新しい展覧会')
await delay(600)
await demo.fill(field(page, 'タイトル'), 'Artoir研究会')
await demo.fill(field(page, 'START').first(), '2026-10-11', { keyDelay: 45 })
await demo.fill(field(page, 'START TIME'), '10:00', { keyDelay: 45 })
await demo.fill(field(page, 'END').first(), '2026-10-12', { keyDelay: 45 })
await demo.fill(field(page, 'END TIME'), '18:00', { keyDelay: 45 })
await demo.fill(field(page, '会場'), 'オンラインギャラリー')
await demo.fill(field(page, '説明文'), '研究会メンバーによる試作と記録を公開する小さな展覧会です。')
await demo.click(page.getByRole('button', { name: /^保存$/ }), { moveDuration: 760, after: 1200 })

await clickFirstVisible(demo, [
  page.getByRole('button', { name: /作品を管理/ }),
  page.getByText('作品を管理', { exact: true }),
])
await waitForScreen(page, '作品')
await delay(900)

const addArtwork = page.getByLabel('作品追加').or(page.getByText('作品追加', { exact: true })).first()
const chooserPromise = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null)
await demo.click(addArtwork, { moveDuration: 760, after: 900 })
await chooserPromise

if (process.env.DEMO_KEEP_OPEN === '1') {
  console.log('Demo finished. Browser will stay open because DEMO_KEEP_OPEN=1.')
  await new Promise(() => {})
} else {
  await delay(HOLD_MS)
  const video = page.video()
  await context.close()
  if (video) {
    const videoPath = await video.path()
    console.log(`Demo video saved: ${videoPath}`)
  }
}
