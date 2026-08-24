"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Adaptive video player.
 *
 * SOURCE SELECTION (automatic):
 *  - CMS "Premium player URL" (playback_url) that is a direct media file
 *    (.mp4/.webm/.mov/.m4v) or an HLS stream (.m3u8 — Mux/Cloudflare/Bunny)
 *    → native HTML5 <video> (with hls.js for HLS on non-Safari browsers).
 *  - YouTube/Vimeo links in the CMS → normalised embed <iframe>.
 *  - Anything else (including Google Drive preview) → <iframe>.
 *
 * GOOGLE DRIVE CONTROLS:
 * The default source is a Drive preview iframe. Google owns that iframe's UI
 * (play/pause, seek, captions, settings, quality menu). We cannot reach inside
 * it (cross-origin) and cannot rebuild or override those controls. We only size
 * the container responsively and leave playback/quality to Google. Do NOT add
 * fake controls here that cannot actually drive the iframe.
 *
 * QUALITY (HTML5/HLS only, never Drive):
 * For HLS we load hls.js and, on manifest parse, automatically lock playback to
 * the highest-bitrate rendition that actually exists (prefers 1080p when
 * present; never fabricates a level). A small quality menu lets the visitor
 * switch manually. Safari/iOS use the native HLS player (OS-managed quality).
 *
 * ASPECT RATIO:
 * The container matches the REAL video aspect ratio, not a hard-coded 16:9.
 *  - Landscape (ratio >= 1): full-width, height derived from the ratio.
 *  - Portrait (ratio < 1): natural ratio, height-capped and horizontally
 *    centred so it is never oversized and never overflows the viewport.
 * For Drive we use the video's pixel dimensions from the Drive API. For HTML5
 * sources we measure the decoded frame via `loadedmetadata`.
 */

type VideoPlayerProps = {
  src: string;
  title: string;
  poster?: string;
  /** Natural pixel width (from Drive metadata) — used to size the iframe shell. */
  aspectWidth?: number;
  /** Natural pixel height (from Drive metadata). */
  aspectHeight?: number;
  /** Called once when the player is meaningfully engaged (iframe load, or first video play). */
  onEngaged?: () => void;
};

type ResolvedSource = { kind: "iframe"; url: string } | { kind: "video"; url: string; hls: boolean };

const DIRECT_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)(?:[?#]|$)/i;
const HLS_EXT = /\.m3u8(?:[?#]|$)/i;
const DRIVE_PROXY = /^\/api\/drive-stream\//;

function resolveSource(src: string): ResolvedSource {
  const trimmed = src.trim();
  if (HLS_EXT.test(trimmed)) return { kind: "video", url: trimmed, hls: true };
  if (DIRECT_EXT.test(trimmed)) return { kind: "video", url: trimmed, hls: false };
  if (DRIVE_PROXY.test(trimmed)) return { kind: "video", url: trimmed, hls: false };
  const yt = trimmed.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe", url: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", url: `https://player.vimeo.com/video/${vm[1]}` };
  // Drive preview, Mux/Cloudflare/Bunny embed pages, and anything else → iframe.
  return { kind: "iframe", url: trimmed };
}

type Level = { index: number; label: string; bitrate: number };

export default function VideoPlayer({ src, title, poster, aspectWidth, aspectHeight, onEngaged }: VideoPlayerProps) {
  const source = useMemo(() => resolveSource(src), [src]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRef = useRef<any>(null);
  const engagedRef = useRef(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [menuOpen, setMenuOpen] = useState(false);
  // Measured frame ratio for HTML5 sources (Drive uses the known dimensions prop).
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);

  const knownRatio = aspectWidth && aspectHeight && aspectWidth > 0 && aspectHeight > 0 ? aspectWidth / aspectHeight : null;
  const ratio = measuredRatio ?? knownRatio;
  const isPortrait = ratio !== null && ratio < 1;

  const holderStyle = {
    "--player-ratio": ratio ? String(ratio) : String(16 / 9),
  } as React.CSSProperties;

  const engage = () => {
    if (engagedRef.current) return;
    engagedRef.current = true;
    onEngaged?.();
  };

  useEffect(() => {
    if (source.kind === "iframe") return;
    const video = videoRef.current;
    if (!video) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hls: any = null;
    let cancelled = false;

    const teardown = () => {
      cancelled = true;
      if (hls) {
        try {
          hls.destroy();
        } catch {
          // ignore
        }
        hls = null;
      }
    };

    if (source.hls) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari / iOS: native HLS player; the OS picks quality automatically.
        video.src = source.url;
      } else {
        import("hls.js")
          .then(({ default: Hls }) => {
            if (cancelled) return;
            if (!Hls.isSupported()) {
              video.src = source.url;
              return;
            }
            hls = new Hls();
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              const parsed: Level[] = (hls.levels ?? []).map((level: { height?: number; bitrate?: number }, i: number) => ({
                index: i,
                label: level.height ? `${level.height}p` : `${Math.round((level.bitrate ?? 0) / 1000)} kbps`,
                bitrate: level.bitrate ?? 0,
              }));
              setLevels(parsed);
              // Automatically select the HIGHEST available rendition (prefers
              // 1080p when present; never claims a level that does not exist).
              let best = -1;
              let bestRate = -1;
              parsed.forEach((p) => {
                if (p.bitrate > bestRate) {
                  bestRate = p.bitrate;
                  best = p.index;
                }
              });
              if (best >= 0) {
                hls.currentLevel = best;
                setCurrentLevel(best);
              }
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (_e: unknown, data: { level: number }) => {
              setCurrentLevel(typeof data.level === "number" ? data.level : -1);
            });
            hls.loadSource(source.url);
            hls.attachMedia(video);
          })
          .catch(() => {
            if (!cancelled) video.src = source.url;
          });
      }
    } else {
      // Single direct file: the file itself is the only rendition.
      video.src = source.url;
    }

    return teardown;
  }, [source]);

  const selectLevel = (index: number) => {
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = index; // -1 = auto
    setCurrentLevel(index);
    setMenuOpen(false);
  };

  // Once the decoded frame is known, size the container to its true aspect
  // ratio (handles portrait direct/HLS sources). Note: we deliberately do NOT
  // register a view here — a view is only counted on actual playback (onPlay),
  // not merely because the player loaded.
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v && v.videoWidth > 0 && v.videoHeight > 0) {
      setMeasuredRatio(v.videoWidth / v.videoHeight);
    }
  };

  const holderClass = `player-holder${isPortrait ? " player-holder--portrait" : ""}`;

  if (source.kind === "iframe") {
    return (
      <div className={holderClass} style={holderStyle}>
        <iframe
          src={source.url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="origin-when-cross-origin"
          onLoad={engage}
        />
      </div>
    );
  }

  const currentLabel = currentLevel === -1 ? "Auto" : (levels.find((l) => l.index === currentLevel)?.label ?? "Auto");

  return (
    <div className={holderClass} style={holderStyle}>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        onPlay={engage}
        onLoadedMetadata={handleLoadedMetadata}
      />
      {source.hls && levels.length > 1 && (
        <div className="quality-menu">
          <button
            type="button"
            className="quality-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-label="Video quality"
          >
            <span aria-hidden>⚙</span> {currentLabel}
          </button>
          {menuOpen && (
            <div className="quality-dropdown" role="listbox" aria-label="Select quality">
              <button
                type="button"
                role="option"
                aria-selected={currentLevel === -1}
                onClick={() => selectLevel(-1)}
              >
                Auto
              </button>
              {[...levels]
                .sort((a, b) => b.bitrate - a.bitrate)
                .map((level) => (
                  <button
                    type="button"
                    role="option"
                    key={level.index}
                    aria-selected={currentLevel === level.index}
                    onClick={() => selectLevel(level.index)}
                  >
                    {level.label}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
