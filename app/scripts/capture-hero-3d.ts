import { chromium, type Page } from 'playwright'
import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

// LP ヒーロー背景用に、Artoir同好会「maruとサンカク」の 3D 展示室を UI なしで撮影する
// 横長ビューポート + 画角最大 + 部屋の角へ視線を振って、作品が複数入る構図にする
const exhibitionUrl = process.env.DEMO_EXHIBITION_URL || 'https://artoir.net/rtoir_net/exhibition/maru'
const viewport = { width: 1800, height: 800 }
const viewpointIndex = Number(process.env.DEMO_VIEWPOINT ?? 2)
const yawDrag = Number(process.env.DEMO_YAW_DRAG ?? -160)
const rawPng = resolve('artifacts/demo/hero-3d.png')
const output = resolve('public/images/lp-hero-3d.webp')

async function drag(page: Page, dx: number) {
  const x = viewport.width / 2
  const y = viewport.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(x + (dx * i) / 10, y)
    await page.waitForTimeout(20)
  }
  await page.mouse.up()
  await page.waitForTimeout(1500)
}

await mkdir(resolve('artifacts/demo'), { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: 1.5 })).newPage()
  await page.goto(exhibitionUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '3D空間で巡る' }).click()
  const next = page.getByRole('button', { name: '次の視点へ移動' })
  await next.waitFor()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3500)
  for (let i = 0; i < viewpointIndex; i += 1) {
    await next.click()
    await page.waitForTimeout(2500)
  }

  // ホイールで画角を最大まで広げる
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  for (let i = 0; i < 20; i += 1) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(1000)
  await drag(page, yawDrag)

  // 3D ビューの上に重なる操作 UI を隠す
  await page.addStyleTag({ content: 'button { visibility: hidden !important; }' })
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (el.children.length === 0 && el.textContent?.trim() === '3D空間を巡る') el.style.visibility = 'hidden'
    }
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: rawPng })
} finally {
  await browser.close()
}

const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawPng, '-quality', '80', output], { stdio: 'inherit' })
if (result.status !== 0) throw new Error('ffmpeg failed')
console.log(output)
