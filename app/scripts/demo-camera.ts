import type { Locator, Page } from 'playwright'

export type CameraOptions = { scale: number; x: number; y: number; duration: number; easing?: string }
export type FocusOptions = { scale: number; duration: number; anchorX?: number; anchorY?: number; offsetX?: number; offsetY?: number; easing?: string }

const VIEWPORT = { width: 1920, height: 1080 }
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export class DemoCamera {
  private state = { scale: 1, x: 0, y: 0 }
  private page: Page
  private debug: boolean
  constructor(page: Page, debug = false) { this.page = page; this.debug = debug }

  async init() {
    await this.page.evaluate(({ debug }) => {
      const root = document.querySelector<HTMLElement>('#root')
      if (!root) throw new Error('#root not found')
      root.style.transformOrigin = '0 0'
      root.style.willChange = 'transform'
      document.documentElement.style.overflow = 'hidden'
      if (debug && !document.querySelector('#demo-camera-debug')) {
        const el = document.createElement('pre'); el.id = 'demo-camera-debug'
        Object.assign(el.style, { position:'fixed', left:'12px', top:'12px', zIndex:'2147483645', background:'#111', color:'#fff', padding:'8px', font:'14px monospace', pointerEvents:'none' })
        document.body.appendChild(el)
      }
    }, { debug: this.debug })
  }

  async setCamera({ scale, x, y, duration, easing = EASE }: CameraOptions) {
    const minX = Math.min(0, VIEWPORT.width - VIEWPORT.width * scale)
    const minY = Math.min(0, VIEWPORT.height - VIEWPORT.height * scale)
    x = Math.max(minX, Math.min(0, x)); y = Math.max(minY, Math.min(0, y))
    this.state = { scale, x, y }
    await this.page.evaluate(({ scale, x, y, duration, easing, debug }) => {
      const root = document.querySelector<HTMLElement>('#root')!
      root.style.transition = `transform ${duration}ms ${easing}`
      root.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
      const panel = document.querySelector<HTMLElement>('#demo-camera-debug')
      if (debug && panel) panel.textContent = `scale ${scale.toFixed(2)}\nx ${x.toFixed(1)}\ny ${y.toFixed(1)}\nanchor 50%, 45%`
    }, { scale, x, y, duration, easing, debug: this.debug })
    if (duration) await this.page.waitForTimeout(duration)
  }

  async focusCameraOn(locator: Locator, options: FocusOptions) {
    const box = await locator.boundingBox(); if (!box) throw new Error('Target has no bounding box')
    const baseX = (box.x - this.state.x) / this.state.scale
    const baseY = (box.y - this.state.y) / this.state.scale
    const baseW = box.width / this.state.scale; const baseH = box.height / this.state.scale
    const anchorX = options.anchorX ?? VIEWPORT.width * .5
    const anchorY = options.anchorY ?? VIEWPORT.height * .45
    const x = anchorX - (baseX + baseW / 2) * options.scale + (options.offsetX ?? 0)
    const y = anchorY - (baseY + baseH / 2) * options.scale + (options.offsetY ?? 0)
    await this.setCamera({ ...options, x, y })
  }

  async resetCamera(duration = 500) { await this.setCamera({ scale: 1, x: 0, y: 0, duration }) }
}
