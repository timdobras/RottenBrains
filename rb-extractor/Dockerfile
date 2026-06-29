# Headless-browser HLS extractor for the RottenBrains native (ad-free) player.
# Base image bundles Chromium deps + system libs.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

# xvfb provides a virtual X display for headed (Turnstile) providers; headless
# providers (Videasy) don't need it.
RUN apt-get update && apt-get install -y --no-install-recommends xvfb xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# patchright (stealth) uses its own patched Chromium — install it explicitly.
RUN npx patchright install chromium
COPY lib.mjs server.mjs worker.mjs entrypoint.sh ./
# Browser-free direct resolvers + their integration layer.
COPY direct.mjs vidlink-direct.mjs spencerdevs-direct.mjs vidrock-direct.mjs ./
RUN chmod +x entrypoint.sh

ENV PORT=8790
# Direct (browser-free, ~1s) resolvers first, then Videasy (headless) and
# VidSrc.fyi (headed, patchright+xvfb, beats Turnstile) as browser fallbacks.
ENV PROVIDERS="vidlink.pro,spencerdevs,vidrock,Videasy,VidSrc.fyi"
EXPOSE 8790

# Entrypoint starts Xvfb then runs the worker (which also serves /health).
CMD ["./entrypoint.sh"]
