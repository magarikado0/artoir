const CACHE_MAX_AGE = 3600

const STATIC_URLS = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/orgs', changefreq: 'weekly', priority: '0.8' },
]

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname === '/sitemap.xml') {
      return handleSitemap(request, env, ctx)
    }
    return env.ASSETS.fetch(request)
  },
}

async function handleSitemap(request, env, ctx) {
  const siteUrl = (env.SITE_URL || 'https://artoir.net').replace(/\/$/, '')
  const cache = caches.default
  const cacheKey = new Request(`${siteUrl}/sitemap.xml`, { method: 'GET' })

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const urls = await collectUrls(env, siteUrl)
  const xml = buildSitemapXml(urls)
  const response = new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
    },
  })

  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

async function collectUrls(env, siteUrl) {
  const urls = STATIC_URLS.map(({ loc, changefreq, priority }) => ({
    loc: `${siteUrl}${loc}`,
    changefreq,
    priority,
  }))

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return urls
  }

  const supabaseEnv = { SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: supabaseKey }

  try {
    const orgs = await fetchSupabase(
      supabaseEnv,
      'organizations?select=slug&order=slug.asc',
    )
    for (const org of orgs) {
      if (!org?.slug) continue
      urls.push({
        loc: `${siteUrl}/${encodeURIComponent(org.slug)}`,
        changefreq: 'weekly',
        priority: '0.7',
      })
    }

    const exhibitions = await fetchSupabase(
      supabaseEnv,
      'exhibitions?select=slug,organizations(slug)&order=slug.asc',
    )
    for (const exhibition of exhibitions) {
      const orgSlug = exhibition?.organizations?.slug
      if (!orgSlug || !exhibition?.slug) continue
      urls.push({
        loc: `${siteUrl}/${encodeURIComponent(orgSlug)}/exhibition/${encodeURIComponent(exhibition.slug)}`,
        changefreq: 'weekly',
        priority: '0.9',
      })
    }
  } catch {
    /* fall back to static URLs only */
  }

  return urls
}

async function fetchSupabase(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Supabase request failed: ${res.status}`)
  }
  return res.json()
}

function buildSitemapXml(urls) {
  const body = urls
    .map(
      ({ loc, changefreq, priority }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
