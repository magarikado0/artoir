import artoirMark from '../assets/artoir_logo.svg'

export default function BrandMark({ className = '', size = 'default' }) {
  return (
    <img
      className={`ui-brand-mark ui-brand-mark-${size} ${className}`.trim()}
      src={artoirMark}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  )
}

export function BrandLockup({ className = '' }) {
  return (
    <span className={`ui-brand-lockup ${className}`.trim()}>
      <span className="ui-brand-lockup-mark">
        <img
          className="ui-brand-mark ui-brand-mark-lockup"
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          decoding="async"
        />
      </span>
      <span className="ui-brand-lockup-word">Artoir<span className="ui-brand-lockup-dot">.</span></span>
    </span>
  )
}
