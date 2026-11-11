# Multi-platform manifest digest, verified from the official Docker Hub registry.
FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
ENV LAB_BUILD=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid 1001 --no-create-home app \
    && rm -rf /usr/local/lib/node_modules/npm /opt/yarn* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn*
COPY --from=build --chown=1001:1001 /app/.next/standalone ./
USER 1001:1001
EXPOSE 3000
CMD ["node", "start.mjs"]
