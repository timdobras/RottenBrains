#!/bin/sh
# Start a virtual X display for headed (Turnstile) providers. Headless providers
# (Videasy) work with or without it, so the worker stays useful even if Xvfb
# can't start. Manual Xvfb is more reliable in containers than xvfb-run.
mkdir -p /tmp/.X11-unix 2>/dev/null || true
chmod 1777 /tmp/.X11-unix 2>/dev/null || true
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp >/tmp/xvfb.log 2>&1 &
export DISPLAY=:99
sleep 1
echo "entrypoint: DISPLAY=$DISPLAY (xvfb pid $!)"
exec node worker.mjs
