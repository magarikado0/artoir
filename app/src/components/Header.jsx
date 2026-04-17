import { Link } from 'react-router-dom'

const S = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem clamp(2rem, 5vw, 5rem)',
    borderBottom: '1px solid rgba(26,22,18,0.12)',
    position: 'sticky',
    top: 0,
    background: 'rgba(245,240,232,0.92)',
    backdropFilter: 'blur(8px)',
    zIndex: 100,
  },
  logo: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: '1.5rem',
    fontWeight: 300,
    letterSpacing: '0.15em',
    color: '#1a1612',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    color: '#9a9088',
  },
  navLink: {
    color: '#9a9088',
    textDecoration: 'none',
  },
}

export default function Header({ orgName, orgSlug }) {
  return (
    <header style={S.header}>
      <Link to="/" style={S.logo}>
        art<span style={{ color: '#c0392b' }}>port</span>
      </Link>
      {orgSlug && (
        <div style={S.nav}>
          <Link to={`/${orgSlug}`} style={S.navLink}>{orgName}</Link>
          <Link to="/" style={S.navLink}>すべての展覧会</Link>
        </div>
      )}
    </header>
  )
}
