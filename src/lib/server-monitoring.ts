import { randomUUID } from 'node:crypto'
import { json } from '@tanstack/react-start'

const viteEnv = import.meta.env as Record<string, string | undefined>

function readEnv(name: string) {
  if (!process.env[name]) {
    process.env[name] = viteEnv[name]
  }

  return process.env[name]?.trim()
}

function getPostHogConfig() {
  const apiKey = readEnv('VITE_POSTHOG_KEY')
  const apiHost = readEnv('VITE_POSTHOG_HOST') || 'https://us.i.posthog.com'

  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    apiHost: apiHost.replace(/\/+$/, ''),
  }
}

export function getRequestId(request: Request) {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-nf-request-id') ||
    request.headers.get('cf-ray') ||
    randomUUID()
  )
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown server error'
}

function toErrorStack(error: unknown) {
  if (error instanceof Error && error.stack) {
    return error.stack.slice(0, 4000)
  }

  return undefined
}

export async function captureServerError(input: {
  request: Request
  requestId?: string
  route: string
  error: unknown
  properties?: Record<string, unknown>
}) {
  const config = getPostHogConfig()

  if (!config) {
    return
  }

  const url = new URL(input.request.url)
  const requestId = input.requestId || getRequestId(input.request)

  const payload = {
    api_key: config.apiKey,
    event: 'server_function_error',
    properties: {
      distinct_id: `server:${input.route}`,
      requestId,
      route: input.route,
      method: input.request.method,
      path: url.pathname,
      host: url.host,
      search: url.search || undefined,
      userAgent: input.request.headers.get('user-agent') || undefined,
      errorMessage: toErrorMessage(input.error),
      errorStack: toErrorStack(input.error),
      ...input.properties,
    },
  }

  await fetch(`${config.apiHost}/capture/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}

export function withServerErrorLogging<TContext extends { request: Request }>(
  route: string,
  handler: (context: TContext) => Promise<Response>,
) {
  return async (context: TContext) => {
    const requestId = getRequestId(context.request)

    try {
      return await handler(context)
    } catch (error) {
      await captureServerError({
        request: context.request,
        requestId,
        route,
        error,
      })

      return json(
        {
          ok: false,
          code: 'INTERNAL_ERROR',
          message: `Erreur serveur (${requestId}).`,
          requestId,
        },
        { status: 500 },
      )
    }
  }
}
