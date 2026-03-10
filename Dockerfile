FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_CLERK_PUBLISHABLE_KEY=""
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST="https://us.i.posthog.com"
ARG VITE_PUBLIC_SITE_URL="https://kalotmunicipales.fr"

ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server ./server

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
