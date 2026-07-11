import type { Locator, Page } from 'playwright'

export class DemoCursor {
  private page: Page
  constructor(page: Page) { this.page = page }
  async init() {
    await this.page.evaluate(() => {
      if (document.querySelector('#demo-cursor')) return
      const style = document.createElement('style'); style.textContent = `*{cursor:none!important}#demo-cursor{position:fixed;left:0;top:0;width:42px;height:52px;z-index:2147483647;pointer-events:none;transition:transform var(--d,400ms) cubic-bezier(.22,1,.36,1);filter:drop-shadow(0 5px 5px #0006)}#demo-ripple{position:fixed;width:18px;height:18px;border:3px solid #1f1b17;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0}.demo-ripple{animation:ripple .5s ease-out}@keyframes ripple{0%{opacity:.8;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(3)}}`
      document.head.appendChild(style)
      const c = document.createElement('div'); c.id='demo-cursor'; c.innerHTML=`<svg viewBox="0 0 48 58"><path d="M5 3L39 34l-16 2 10 16-8 4-9-17-11 12z" fill="#fffdf4" stroke="#171411" stroke-width="3" stroke-linejoin="round"/></svg>`; document.body.appendChild(c)
      const r = document.createElement('div'); r.id='demo-ripple'; document.body.appendChild(r)
    })
  }
  async moveDemoCursorTo(locator: Locator, options: { duration?: number; offsetX?: number; offsetY?: number } = {}) {
    const box = await locator.boundingBox(); if (!box) throw new Error('Cursor target has no bounding box')
    const x=box.x+box.width/2+(options.offsetX??0), y=box.y+box.height/2+(options.offsetY??0), duration=options.duration??420
    await this.page.evaluate(({x,y,duration})=>{const c=document.querySelector<HTMLElement>('#demo-cursor')!;c.style.setProperty('--d',`${duration}ms`);c.style.transform=`translate3d(${x}px,${y}px,0)`},{x,y,duration})
    await this.page.waitForTimeout(duration)
  }
  async demoClick(locator: Locator) {
    await this.moveDemoCursorTo(locator); await this.page.waitForTimeout(100); await locator.click()
    await this.page.evaluate(()=>{const c=document.querySelector<HTMLElement>('#demo-cursor')!,r=document.querySelector<HTMLElement>('#demo-ripple')!;const m=c.style.transform.match(/[-\d.]+/g)??['0','0'];r.style.left=`${m[0]}px`;r.style.top=`${m[1]}px`;r.classList.remove('demo-ripple');void r.offsetWidth;r.classList.add('demo-ripple')})
    await this.page.waitForTimeout(150)
  }
}
