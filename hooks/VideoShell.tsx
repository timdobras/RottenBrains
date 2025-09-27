"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useVideo } from "./VideoProvider";
import { iframeLinks } from "@/lib/constants/links";
import useIsMobile from "@/hooks/useIsMobile";
import { getHrefFromMedia } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "./UserContext";

export default function VideoShell() {
  // — all hooks at top
  const { state } = useVideo();
  const {
    media_type,
    media_id,
    season_number,
    episode_number,
    mode,
    provider: ctxProvider,
  } = state;

  const isMobile = useIsMobile(); // ← new
  const [provider, setProvider] = useState(ctxProvider);

  const { user } = useUser();

  const { setState } = useVideo();

  // watch localStorage like before…
  useEffect(() => {
    const valid = (n: string | null) =>
      n !== null && iframeLinks.some((l) => l.name === n);

    const stored = localStorage.getItem("video_provider");
    if (valid(stored)) setProvider(stored!);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "video_provider") {
        if (valid(e.newValue)) setProvider(e.newValue!);
        else setProvider(iframeLinks[0].name);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // reposition root on mode change
  useEffect(() => {
    // pick the right pad based on mini/full & mobile/desktop:
    const targetId = "player-root";

    const root = document.getElementById(targetId);
    if (!root) return; // <-- bail out if it’s not in the DOM yet

    if (!media_id || !media_type) {
      Object.assign(root.style, {
        display: "none",
      });
    } else {
      Object.assign(root.style, {
        display: "block",
      });
    }

    if (mode === "mini" && media_id && media_type) {
      root.style.cssText = ""; // let your CSS utility classes take over
    } else {
      const placeholder = document.getElementById("video-inline-placeholder");
      if (!placeholder) return;

      const rect = placeholder.getBoundingClientRect();
      console.log("rect", rect);
      Object.assign(root.style, {
        display: "block",
        position: `${isMobile ? "fixed" : "absolute"}`,
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    }
  }, [mode, state]);

  // bail early
  if (!media_id || !media_type) return null;

  // compute src
  const sel = iframeLinks.find((l) => l.name === provider) || iframeLinks[0];
  const src = sel.template({
    media_type,
    media_id,
    season_number: season_number?.toString(),
    episode_number: episode_number?.toString(),
  });

  // portal always into whichever “mini” container we chose (or desktop pad for full)
  const targetId = "player-root";

  // return ReactDOM.createPortal(
  //   <iframe
  //     src={src}
  //     allowFullScreen
  //     loading="lazy"
  //     frameBorder="0"
  //     style={{ width: "100%", height: "100%" }}
  //   />,
  //   document.getElementById(targetId)!,
  // );
  const container = document.getElementById(targetId);
  if (!container) return null;
  return ReactDOM.createPortal(
    <div className="group relative h-full w-full">
      {!user?.premium ? (
        <>
          <div className="flex h-full w-full items-center justify-center bg-black">
            You need to be a premium user to watch videos.
          </div>
        </>
      ) : (
        <>
          <iframe
            src={src}
            allowFullScreen
            loading="lazy"
            frameBorder="0"
            style={{ width: "100%", height: "100%" }}
          />
        </>
      )}
      {mode === "mini" && (
        <Link
          href={getHrefFromMedia(
            media_type || "movie",
            media_id || 0,
            season_number,
            episode_number,
          )}
          className="absolute left-0 top-0 flex aspect-square h-12 items-center justify-center"
        >
          <img src="/assets/icons/link.svg" alt="" className="invert" />
        </Link>
      )}
      {mode === "mini" && (
        <button
          onClick={() => setState((s) => ({ ...s, media_id: undefined }))}
          className="absolute right-0 top-0 z-50 flex aspect-square h-12 items-center justify-center"
        >
          <p className="text-2xl text-white">x</p>
        </button>
      )}
    </div>,
    container,
  );
}
