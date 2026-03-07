import { readFile } from 'node:fs/promises'
import { createFileRoute } from '@tanstack/react-router'
import { ImageResponse } from '@vercel/og'

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const DEFAULT_TITLE = 'KALOT MUNICIPALES'
const DEFAULT_SUBTITLE =
  'Vote pour les meilleures musiques de campagne des municipales 2026.'

const oswald700Path = new URL(
  '../../node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff',
  import.meta.url,
)
const inter400Path = new URL(
  '../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff',
  import.meta.url,
)
const inter700Path = new URL(
  '../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff',
  import.meta.url,
)

const fontDataPromise = Promise.all([
  readFile(oswald700Path),
  readFile(inter400Path),
  readFile(inter700Path),
])

function normalizeCopy(value: string | null, fallback: string, maxLength: number) {
  const normalized = value?.trim().replace(/\s+/g, ' ')

  if (!normalized) {
    return fallback
  }

  return normalized.slice(0, maxLength)
}

export const Route = createFileRoute('/api/og')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const title = normalizeCopy(url.searchParams.get('title'), DEFAULT_TITLE, 90)
        const subtitle = normalizeCopy(
          url.searchParams.get('subtitle'),
          DEFAULT_SUBTITLE,
          160,
        )
        const [oswald700, inter400, inter700] = await fontDataPromise

        return new ImageResponse(
          (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#090909',
                backgroundImage:
                  'radial-gradient(circle at 18% 18%, rgba(57,255,20,0.20), transparent 34%), radial-gradient(circle at 86% 22%, rgba(0,180,216,0.16), transparent 36%), radial-gradient(circle at 52% 88%, rgba(255,107,53,0.15), transparent 40%), linear-gradient(180deg, #0b0b0b 0%, #050505 100%)',
                color: '#ffffff',
                fontFamily: 'Inter',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 24,
                  borderRadius: 28,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background:
                    'linear-gradient(165deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))',
                  boxShadow:
                    '0 0 0 1px rgba(255,255,255,0.03), 0 24px 90px rgba(0,0,0,0.42)',
                }}
              />

              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: '100%',
                  padding: '58px 62px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      color: '#39ff14',
                      fontFamily: 'Oswald',
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        background: '#39ff14',
                        boxShadow: '0 0 22px rgba(57,255,20,0.9)',
                      }}
                    />
                    KalotMunicipales
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 18px',
                      borderRadius: 999,
                      border: '1px solid rgba(0,180,216,0.45)',
                      color: '#00b4d8',
                      fontFamily: 'Oswald',
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    Vote 2026
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    maxWidth: 940,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      fontFamily: 'Oswald',
                      fontSize: 88,
                      fontWeight: 700,
                      lineHeight: 0.92,
                      letterSpacing: -4,
                      textTransform: 'uppercase',
                      textShadow:
                        '0 0 18px rgba(255,255,255,0.18), 0 0 30px rgba(57,255,20,0.14)',
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      width: 180,
                      height: 6,
                      marginTop: 28,
                      borderRadius: 999,
                      background:
                        'linear-gradient(90deg, #39ff14 0%, #00b4d8 56%, #ff6b35 100%)',
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      marginTop: 26,
                      color: 'rgba(255,255,255,0.72)',
                      fontFamily: 'Inter',
                      fontSize: 30,
                      fontWeight: 400,
                      lineHeight: 1.35,
                      maxWidth: 920,
                    }}
                  >
                    {subtitle}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        color: '#ffffff',
                        fontFamily: 'Oswald',
                        fontSize: 26,
                        fontWeight: 700,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                      }}
                    >
                      Sons de campagne • Classement • Duels
                    </div>
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.58)',
                        fontFamily: 'Inter',
                        fontSize: 20,
                      }}
                    >
                      kalotmunicipales.fr
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      color: '#ff6b35',
                      fontFamily: 'Oswald',
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                    }}
                  >
                    Guadeloupe
                    <div
                      style={{
                        color: '#00b4d8',
                        marginTop: 6,
                      }}
                    >
                      Municipales 2026
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          {
            width: IMAGE_WIDTH,
            height: IMAGE_HEIGHT,
            fonts: [
              {
                name: 'Oswald',
                data: oswald700,
                weight: 700,
                style: 'normal',
              },
              {
                name: 'Inter',
                data: inter400,
                weight: 400,
                style: 'normal',
              },
              {
                name: 'Inter',
                data: inter700,
                weight: 700,
                style: 'normal',
              },
            ],
          },
        )
      },
    },
  },
})
