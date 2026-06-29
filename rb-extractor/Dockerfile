# Headless-browser HLS extractor for the RottenBrains native (ad-free) player.
# Base image bundles Chromium + all system libs. The tag MUST match the
# playwright version in package.json/package-lock.json (1.61.1) so the
# pre-installed browser is reused instead of re-downloaded.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

# xvfb lets us run Chromium *headed* (real Chrome client hints), which defeats
# the "HeadlessChrome" bot-detection some providers use.
RUN apt-get update && apt-get install -y --no-install-recommends xvfb xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY lib.mjs server.mjs worker.mjs ./

ENV PORT=8790
ENV PROVIDERS=Videasy
EXPOSE 8790

# Run the BullMQ worker under a virtual display (it also serves /health on PORT).
CMD ["xvfb-run", "-a", "node", "worker.mjs"]
