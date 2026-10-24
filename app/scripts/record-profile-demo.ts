import { chromium, type Locator, type Page } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { DemoCursor } from './demo-cursor.ts'

// 公開プロフィールを操作する様子を録画する(ログイン不要)
// 先頭(ウォール表示・最上部)で始まり同じ状態で終わるので、LP でループ再生しても自然につながる
const profileUrl = process.env.DEMO_PROFILE_URL || 'https://artoir.net/profile/callignao_'
const outputDir = resolve('artifacts/demo')

const variants = [
  {
    name: 'desktop',
    viewport: { width: 1280, height: 720 },
    output: { width: 1920, height: 1080 },
    isMobile: false,
    video: resolve('public/videos/for-creators.mp4'),
    poster: resolve('public/images/for-creators-poster.webp'),
  },
  {
    name: 'mobile',
    viewport: { width: 400, height: 500 },
    output: { width: 1080, height: 1350 },
    isMobile: true,
    video: resolve('public/videos/for-creators-mobile.mp4'),
    poster: resolve('public/images/for-creators-poster-mobile.webp'),
  },
]

// モバイル用の指カーソル(record-gallery-mobile-demo.ts と同じ見た目)
class DemoFinger {
  private page: Page
  constructor(page: Page) { this.page = page }
  async init() {
    await this.page.evaluate(() => {
      if (document.querySelector('#demo-finger')) return
      const style = document.createElement('style')
      style.textContent = `*{cursor:none!important}#demo-finger{position:fixed;left:0;top:0;z-index:2147483647;width:27px;height:31px;pointer-events:none;transform:translate3d(300px,420px,0);transition:transform var(--d,360ms) cubic-bezier(.22,1,.36,1);filter:drop-shadow(0 2px 4px rgba(31,27,23,.16));transform-origin:12px 3px}#demo-finger svg{display:block;width:100%;height:100%}#demo-touch-ring{position:fixed;z-index:2147483646;width:14px;height:14px;border:1px solid rgba(190,85,61,.55);border-radius:999px;opacity:0;pointer-events:none}#demo-finger.demo-tap{animation:demo-finger-tap 260ms ease-out}#demo-touch-ring.demo-tap{animation:demo-touch-ring 480ms ease-out}@keyframes demo-finger-tap{0%,100%{scale:1}45%{scale:.95}}@keyframes demo-touch-ring{0%{opacity:.5;transform:translate(-50%,-50%) scale(.45)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}}`
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
  async demoClick(locator: Locator) {
    const box = await locator.boundingBox()
    if (!box) throw new Error('Finger target has no bounding box')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await this.page.evaluate(({ x, y }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      finger.style.transform = `translate3d(${x - 12}px,${y - 3}px,0)`
    }, { x, y })
    await this.page.waitForTimeout(400)
    await this.page.evaluate(({ x, y }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      const ring = document.querySelector<HTMLElement>('#demo-touch-ring')!
      ring.style.left = `${x}px`; ring.style.top = `${y}px`
      finger.classList.remove('demo-tap'); ring.classList.remove('demo-tap')
      void finger.offsetWidth
      finger.classList.add('demo-tap'); ring.classList.add('demo-tap')
    }, { x, y })
    await this.page.waitForTimeout(150)
    await locator.click()
    await this.page.waitForTimeout(150)
  }
  // 指を横に払う動きを見せ、ビューアのキーボード操作で次の作品へ送る
  async swipe(fromX: number, toX: number, y: number) {
    const moveFinger = (x: number, duration: number) => this.page.evaluate(({ x, y, duration }) => {
      const finger = document.querySelector<HTMLElement>('#demo-finger')!
      finger.style.setProperty('--d', `${duration}ms`)
      finger.style.transform = `translate3d(${x - 12}px,${y - 3}px,0)`
    }, { x, y, duration })
    await moveFinger(fromX, 200)
    await this.page.waitForTimeout(220)
    await moveFinger(toX, 160)
    await this.page.waitForTimeout(60)
    await this.page.keyboard.press('ArrowRight')
    await this.page.waitForTimeout(100)
  }
}

async function smoothScrollTo(page: Page, top: number, duration: number) {
  await page.evaluate(async ({ top, duration }) => {
    const from = window.scrollY
    const start = performance.now()
    await new Promise<void>((done) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        window.scrollTo(0, from + (top - from) * eased)
        if (t < 1) requestAnimationFrame(step)
        else done()
      }
      requestAnimationFrame(step)
    })
  }, { top, duration })
}

function run(args: string[]) {
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('ffmpeg failed')
}

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch()
try {
  const only = process.env.DEMO_ONLY
  for (const variant of variants.filter((v) => !only || v.name === only)) {
    const videoDir = resolve(outputDir, `profile-${variant.name}-${Date.now()}`)

    const context = await browser.newContext({
      viewport: variant.viewport,
      isMobile: variant.isMobile,
      hasTouch: variant.isMobile,
      recordVideo: { dir: videoDir, size: variant.viewport },
    })
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    const recordingStart = Date.now()
    await page.goto(profileUrl, { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}' })
    await page.waitForFunction(() => [...document.images].every((img) => img.complete))
    const pointer = variant.isMobile ? new DemoFinger(page) : new DemoCursor(page)
    await pointer.init()
    await page.waitForTimeout(500)
    const trimStart = (Date.now() - recordingStart) / 1000

    const main = page.locator('main')
    // 1. グリッド表示に切り替え
    await page.waitForTimeout(500)
    await pointer.demoClick(main.getByRole('button', { name: 'グリッド', exact: true }))
    await page.waitForTimeout(700)

    // 2. 少し下へ流して作品を開く
    await smoothScrollTo(page, variant.isMobile ? 360 : 260, 900)
    await page.waitForTimeout(250)
    const artwork = main.getByRole('button', { name: '火星人の詳細を見る' })
    await pointer.demoClick(artwork)
    await page.waitForTimeout(1200)

    // 3. ビューアで次の作品へ送り、作品情報を開く
    const dialog = page.getByRole('dialog')
    // モバイルは矢印が出ないので、指でスワイプして回す
    for (let i = 0; i < 4; i += 1) {
      if (pointer instanceof DemoFinger) {
        await pointer.swipe(290, 190, 250)
      } else {
        await pointer.demoClick(dialog.getByRole('button', { name: '次の作品' }))
      }
      await page.waitForTimeout(380)
    }
    await page.waitForTimeout(300)
    await pointer.demoClick(dialog.getByRole('button', { name: '作品情報を開く' }))
    await page.waitForTimeout(1500)

    // 4. 閉じて先頭に戻り、ウォール表示へ戻す(ループの頭と同じ状態)
    await pointer.demoClick(dialog.getByRole('button', { name: '作品詳細を閉じる' }))
    await page.waitForTimeout(500)
    await smoothScrollTo(page, 0, 900)
    await page.waitForTimeout(200)
    await pointer.demoClick(main.getByRole('button', { name: 'ウォール', exact: true }))
    await page.waitForTimeout(900)

    const duration = (Date.now() - recordingStart) / 1000 - trimStart
    const rawVideo = await page.video()!.path()
    await context.close()

    const { width, height } = variant.output
    run([
      '-ss', trimStart.toFixed(2), '-t', duration.toFixed(2), '-i', rawVideo,
      '-vf', `setpts=0.62*PTS,fps=30,scale=${width}:${height}:flags=lanczos,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', '-an', variant.video,
    ])
    run(['-i', variant.video, '-frames:v', '1', '-quality', '80', variant.poster])
    console.log(`${variant.name}: ${(duration * 0.62).toFixed(1)}s -> ${variant.video}`)
  }
} finally {
  await browser.close()
}
