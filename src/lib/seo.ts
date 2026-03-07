const rawSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()

export const SITE_NAME = 'KalotMunicipales'
export const SITE_URL = (rawSiteUrl || 'https://kalotmunicipales.fr').replace(
  /\/+$/,
  '',
)
export const DEFAULT_OG_IMAGE_PATH = '/logo512.png'
export const DEFAULT_DESCRIPTION =
  'Vote pour les meilleures musiques de campagne des municipales 2026 en Guadeloupe, consulte le classement en direct et propose un son.'

type SeoOptions = {
  title: string
  description?: string
  path?: string
  imagePath?: string
  robots?: string
  type?: 'website' | 'article'
}

export function toAbsoluteUrl(path = '/') {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export function buildSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  imagePath = DEFAULT_OG_IMAGE_PATH,
  robots = 'index,follow',
  type = 'website',
}: SeoOptions) {
  const resolvedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const canonicalUrl = toAbsoluteUrl(path)
  const imageUrl = toAbsoluteUrl(imagePath)

  return {
    meta: [
      { title: resolvedTitle },
      { name: 'description', content: description },
      { name: 'keywords', content: 'municipales 2026, Guadeloupe, musique de campagne, vote, classement, KalotMunicipales' },
      { name: 'robots', content: robots },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:type', content: type },
      { property: 'og:title', content: resolvedTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: imageUrl },
      { property: 'og:image:alt', content: 'Visuel KalotMunicipales' },
      { property: 'og:image:width', content: '512' },
      { property: 'og:image:height', content: '512' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: resolvedTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ],
    links: [{ rel: 'canonical', href: canonicalUrl }],
  }
}
