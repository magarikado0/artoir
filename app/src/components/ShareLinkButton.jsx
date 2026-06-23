import { useState } from 'react'
import { Icon } from './Header'

export default function ShareLinkButton({ className = 'ui-pill-action' }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(el)
      }
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={copyLink}
      type="button"
      className={`${className} ${copied ? 'ui-pill-action--accent' : ''}`}
    >
      <Icon name={copied ? 'check' : 'share'} size={16} />
      <span>{copied ? 'コピー済み' : 'リンクを共有'}</span>
    </button>
  )
}
