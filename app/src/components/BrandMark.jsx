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
