"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Bookmark, Clock, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveVideoPositionAction, addLessonBookmarkAction } from "@/app/actions/retention";
import { isMuxVideo, getMuxPlaybackId } from "@/lib/mux";
import MuxPlayer from "@mux/mux-player-react";

type VideoPlayerProps = {
  lessonId: string;
  videoUrl: string;
  initialPositionSeconds?: number;
  onPositionUpdate?: (seconds: number) => void;
  onMarkComplete?: () => void;
  tenantSlug: string;
  courseSlug: string;
  lessonTitle: string;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function isYouTube(url: string) {
  return url.includes("youtube") || url.includes("youtu.be");
}

function getYouTubeEmbed(url: string) {
  // Very basic converter; production would be more robust
  let id = "";
  if (url.includes("watch?v=")) id = url.split("watch?v=")[1].split("&")[0];
  else if (url.includes("youtu.be/")) id = url.split("youtu.be/")[1].split("?")[0];
  else if (url.includes("/embed/")) id = url.split("/embed/")[1].split("?")[0];
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1`;
}

function getMuxPlaybackUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function VideoPlayer({
  lessonId,
  videoUrl,
  initialPositionSeconds = 0,
  onPositionUpdate,
  onMarkComplete,
  tenantSlug,
  courseSlug,
  lessonTitle,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const onCompleteRef = useRef(onMarkComplete);
  onCompleteRef.current = onMarkComplete;

  const ytEmbedUrl = isYouTube(videoUrl) ? getYouTubeEmbed(videoUrl) : null;
  const muxPlaybackId = isMuxVideo(videoUrl) ? getMuxPlaybackId(videoUrl) : null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Resume playback position (native only for full control)
  useEffect(() => {
    if (!videoRef.current || hasResumed) return;

    const tryResume = () => {
      if (initialPositionSeconds && initialPositionSeconds > 3 && videoRef.current) {
        videoRef.current.currentTime = initialPositionSeconds;
        setCurrentTime(initialPositionSeconds);
        setHasResumed(true);
        toast.info(`Resuming from ${Math.floor(initialPositionSeconds / 60)}:${String(Math.floor(initialPositionSeconds % 60)).padStart(2, "0")}`, {
          description: lessonTitle,
        });
      }
    };

    const vid = videoRef.current;
    if (vid.readyState >= 1) {
      tryResume();
    } else {
      vid.addEventListener("loadedmetadata", tryResume, { once: true });
    }
  }, [initialPositionSeconds, hasResumed, lessonTitle]);

  // Throttled position saver for retention (resume magic) — calls server action
  const savePosition = useCallback(
    (seconds: number) => {
      const pos = Math.floor(seconds);
      if (onPositionUpdate) onPositionUpdate(pos);

      // Non-blocking, fire and forget
      saveVideoPositionAction(lessonId, pos, tenantSlug, courseSlug).catch(() => {
        // position saves are best-effort
      });
    },
    [lessonId, onPositionUpdate, tenantSlug, courseSlug]
  );

  const savePositionRef = useRef(savePosition);
  savePositionRef.current = savePosition;

  // Native video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Save every ~6 seconds
    if (Math.floor(t) % 6 === 0) {
      savePosition(t);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, []);

  const addBookmarkHere = useCallback(() => {
    const pos = Math.floor(currentTime);
    const fd = new FormData();
    fd.append("lessonId", lessonId);
    fd.append("positionSeconds", String(pos));
    fd.append("tenantSlug", tenantSlug);
    fd.append("courseSlug", courseSlug);
    addLessonBookmarkAction(fd).then(() => {
      toast.success("Bookmark added", { description: `At ${formatTime(pos)}` });
    }).catch(() => {
      toast.error("Failed to add bookmark");
    });
  }, [currentTime, lessonId, tenantSlug, courseSlug]);

  // Mux via @mux/mux-player-react (reliable HLS, no blank-video issues)
  if (muxPlaybackId) {
    return (
      <div className="video-player group">
        <div className="relative aspect-video w-full bg-black">
          <MuxPlayer
            playbackId={muxPlaybackId}
            className="h-full w-full"
            accentColor="#f97316"
            onTimeUpdate={(e: any) => {
              const t = e.target?.currentTime ?? 0;
              setCurrentTime(t);
              if (Math.floor(t) % 6 === 0) {
                savePositionRef.current(t);
              }
            }}
            onLoadedMetadata={(e: any) => setDuration(e.target?.duration ?? 0)}
            onPlaying={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onCompleteRef.current) onCompleteRef.current();
              toast.success("Lesson finished — great work!", { description: "Progress saved." });
            }}
            onError={() => toast.error("Playback error — try refreshing")}
          />

          {/* Bookmark overlay */}
          <div className="absolute bottom-20 right-4 z-20">
            <button onClick={addBookmarkHere} className="player-btn" title="Bookmark this moment">
              <Bookmark className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-black/70 px-4 py-1.5 text-[10px] text-white/50">
          <div>Mux Player • Adaptive HLS • Quality selection • Captions • Resume • Bookmarks</div>
          <div className="font-mono">{lessonTitle}</div>
        </div>
      </div>
    );
  }

  // YT fallback (limited custom controls, but still beautiful container + note callout)
  if (ytEmbedUrl) {
    return (
      <div className="video-player">
        <div className="aspect-video w-full">
          <iframe
            src={ytEmbedUrl}
            title={lessonTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-black/80 px-4 py-2 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5" /> YouTube • Limited custom controls
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-white/80 hover:text-white" onClick={onMarkComplete}>
            Mark complete anyway
          </Button>
        </div>
        <div className="border-t border-white/10 p-3 text-[11px] text-white/60">
          Pro tip: Use the native video upload in admin for full speed control, resume, notes &amp; bookmarks.
        </div>
      </div>
    );
  }

  // Native video (the delightful retention experience)
  return (
    <div className="video-player group">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            if (onMarkComplete) onMarkComplete();
            toast.success("Lesson finished — great work!", { description: "Progress saved." });
          }}
          playsInline
        />

        {/* Big center play overlay when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition hover:bg-black/20"
            aria-label="Play video"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
              <Play className="ml-0.5 size-7" />
            </div>
          </button>
        )}

        {/* Bottom controls */}
        <div className="video-controls opacity-100 transition-opacity group-hover:opacity-100">
          {/* Scrub bar */}
          <div
            className="mb-2.5 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              seek(pct * (duration || 0));
            }}
          >
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="player-btn">
                {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
              </button>

              <button
                onClick={() => seek(Math.max(0, currentTime - 10))}
                className="player-btn"
                title="Back 10s"
              >
                <RotateCcw className="size-4" />
              </button>

              <div className="ml-1 font-mono text-xs tabular-nums text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed control */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="player-btn flex items-center gap-1.5 px-3 text-xs"
                  title="Playback speed"
                >
                  <Gauge className="size-3.5" /> {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-11 right-0 z-20 rounded-xl border border-white/15 bg-black/95 p-1 text-xs shadow-2xl">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`block w-full rounded px-3 py-1 text-left hover:bg-white/10 ${s === playbackRate ? "text-primary" : ""}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={addBookmarkHere} className="player-btn" title="Bookmark this moment">
                <Bookmark className="size-4" />
              </button>

              {onMarkComplete && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 border-white/30 bg-white/10 text-white hover:bg-white/20"
                  onClick={onMarkComplete}
                >
                  Mark complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-black/70 px-4 py-1.5 text-[10px] text-white/50">
        <div>Premium player • Resume • {SPEEDS.length} speeds • Bookmarks</div>
        <div className="font-mono">{lessonTitle}</div>
      </div>
    </div>
  );
}
