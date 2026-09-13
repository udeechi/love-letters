"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import type { IAgoraRTCRemoteUser, ILocalVideoTrack } from "agora-rtc-sdk-ng";

interface VideoCallOverlayProps {
  localMediaStreamTrack: MediaStreamTrack | null;
  localAgoraVideoTrack: ILocalVideoTrack | null;
  remoteWebRtcStream: MediaStream | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  videoRoute: "direct" | "agora";
  isCameraOn: boolean;
  isPartnerCameraOn?: boolean;
  isMuted: boolean;
  isPartnerMuted?: boolean;
  isReconnecting?: boolean;
  onToggleCamera: () => void;
  onFlipCamera?: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
  partnerName: string;
  callDuration: number;
}

const SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
  mass: 0.85,
};

export default function VideoCallOverlay({
  localMediaStreamTrack,
  localAgoraVideoTrack,
  remoteWebRtcStream,
  remoteUsers,
  videoRoute,
  isCameraOn,
  isPartnerCameraOn = false,
  isMuted,
  isPartnerMuted = false,
  isReconnecting = false,
  onToggleCamera,
  onFlipCamera,
  onToggleMute,
  onEndCall,
  partnerName,
  callDuration,
}: VideoCallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFeedSwapped, setIsFeedSwapped] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Dynamic window size
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  // Motion values to animate position independently from layout
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const isDraggingRef = useRef(false);
  const pipPosRef = useRef<{ x: number; y: number } | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isMobile = windowSize.width < 640;
  const pipWidth = isMobile ? 164 : 220;
  const pipHeight = isMobile ? 228 : 300;

  const defaultPipX = Math.max(12, windowSize.width - pipWidth - (isMobile ? 16 : 24));
  const defaultPipY = Math.max(12, windowSize.height - pipHeight - (isMobile ? 80 : 96));

  // Detect camera hardware capabilities (front + rear on phones)
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          setHasMultipleCameras(videoInputs.length > 1 || isMobileDevice);
        })
        .catch(() => {
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            setHasMultipleCameras(true);
          }
        });
    }
  }, []);

  // Cinema Mode: Auto-hide controls after 4 seconds of inactivity
  const resetInactivityTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (!isMinimized) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isMinimized]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowSize({ width: w, height: h });

      const currentPipW = w < 640 ? 164 : 220;
      const currentPipH = w < 640 ? 228 : 300;

      if (pipPosRef.current) {
        const clampedX = Math.max(12, Math.min(w - currentPipW - 12, pipPosRef.current.x));
        const clampedY = Math.max(12, Math.min(h - currentPipH - 12, pipPosRef.current.y));
        pipPosRef.current = { x: clampedX, y: clampedY };

        if (isMinimized) {
          x.set(clampedX);
          y.set(clampedY);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMinimized, x, y]);

  // Maximize handler - ALWAYS animates x and y back to exact 0, aligning perfectly with screen
  const handleMaximize = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isDraggingRef.current) return;

      pipPosRef.current = { x: x.get(), y: y.get() };

      setIsMinimized(false);
      setShowControls(true);
      animate(x, 0, SPRING_TRANSITION);
      animate(y, 0, SPRING_TRANSITION);
    },
    [x, y]
  );

  // Minimize handler - animates smoothly to target PiP position
  const handleMinimize = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const targetX = pipPosRef.current?.x ?? defaultPipX;
      const targetY = pipPosRef.current?.y ?? defaultPipY;
      pipPosRef.current = { x: targetX, y: targetY };

      setIsMinimized(true);
      animate(x, targetX, SPRING_TRANSITION);
      animate(y, targetY, SPRING_TRANSITION);
    },
    [x, y, defaultPipX, defaultPipY]
  );

  // WebRTC Native elements
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const miniVideoElRef = useRef<HTMLVideoElement | null>(null);

  // Agora elements
  const localAgoraDivRef = useRef<HTMLDivElement>(null);
  const remoteAgoraDivRef = useRef<HTMLDivElement>(null);
  const miniAgoraDivRef = useRef<HTMLDivElement>(null);

  const remoteUser = remoteUsers[0] || null;
  const hasRemoteAgoraVideo = Boolean(videoRoute === "agora" && remoteUser && remoteUser.videoTrack);
  const hasRemoteWebRtcVideo = Boolean(
    videoRoute === "direct" &&
    isPartnerCameraOn &&
    remoteWebRtcStream &&
    remoteWebRtcStream.getVideoTracks().length > 0
  );
  const hasRemoteVideo = hasRemoteAgoraVideo || hasRemoteWebRtcVideo;

  const setLocalVideoNode = (node: HTMLVideoElement | null) => {
    localVideoElRef.current = node;
    if (node && localMediaStreamTrack) {
      node.muted = true;
      node.setAttribute("playsinline", "true");
      node.setAttribute("webkit-playsinline", "true");
      if (!node.srcObject || (node.srcObject as MediaStream).getTracks()[0] !== localMediaStreamTrack) {
        node.srcObject = new MediaStream([localMediaStreamTrack]);
      }
      node.play().catch(() => {});
    }
  };

  const setRemoteVideoNode = (node: HTMLVideoElement | null) => {
    remoteVideoElRef.current = node;
    if (node && remoteWebRtcStream) {
      node.muted = true;
      node.setAttribute("playsinline", "true");
      node.setAttribute("webkit-playsinline", "true");
      if (node.srcObject !== remoteWebRtcStream) {
        node.srcObject = remoteWebRtcStream;
      }
      node.play().catch(() => {});
    }
  };

  const setMiniVideoNode = (node: HTMLVideoElement | null) => {
    miniVideoElRef.current = node;
    if (!node) return;
    node.muted = true;
    node.setAttribute("playsinline", "true");
    node.setAttribute("webkit-playsinline", "true");

    const trackToPlay = isFeedSwapped ? remoteWebRtcStream : (localMediaStreamTrack ? new MediaStream([localMediaStreamTrack]) : null);
    if (trackToPlay && node.srcObject !== trackToPlay) {
      node.srcObject = trackToPlay;
      node.play().catch(() => {});
    }
  };

  // 1. Play WebRTC direct local video
  useEffect(() => {
    const el = localVideoElRef.current;
    if (el && localMediaStreamTrack) {
      el.muted = true;
      el.setAttribute("playsinline", "true");
      el.setAttribute("webkit-playsinline", "true");
      if (!el.srcObject || (el.srcObject as MediaStream).getTracks()[0] !== localMediaStreamTrack) {
        el.srcObject = new MediaStream([localMediaStreamTrack]);
      }
      el.play().catch(() => {});
    }
  }, [localMediaStreamTrack, isCameraOn, isMinimized, isFeedSwapped]);

  // 2. Play WebRTC direct remote video
  useEffect(() => {
    const el = remoteVideoElRef.current;
    if (el && remoteWebRtcStream) {
      el.muted = true;
      el.setAttribute("playsinline", "true");
      el.setAttribute("webkit-playsinline", "true");
      if (el.srcObject !== remoteWebRtcStream) {
        el.srcObject = remoteWebRtcStream;
      }
      el.play().catch(() => {});
    }
  }, [remoteWebRtcStream, hasRemoteWebRtcVideo, isMinimized, isFeedSwapped]);

  // 3. Play Agora local video
  useEffect(() => {
    const el = isFeedSwapped ? miniAgoraDivRef.current : localAgoraDivRef.current;
    if (localAgoraVideoTrack && el) {
      localAgoraVideoTrack.play(el);
      return () => {
        localAgoraVideoTrack.stop();
      };
    }
  }, [localAgoraVideoTrack, isMinimized, isFeedSwapped]);

  // 4. Play Agora remote video
  useEffect(() => {
    const el = isFeedSwapped ? localAgoraDivRef.current : (miniAgoraDivRef.current || remoteAgoraDivRef.current);
    if (remoteUser && remoteUser.videoTrack && el) {
      remoteUser.videoTrack.play(el);
      return () => {
        remoteUser.videoTrack?.stop();
      };
    }
  }, [remoteUser?.videoTrack, isMinimized, isFeedSwapped]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      style={{ x, y }}
      drag={isMinimized}
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={{
        left: 12,
        top: 12,
        right: Math.max(12, windowSize.width - pipWidth - 12),
        bottom: Math.max(12, windowSize.height - pipHeight - 12),
      }}
      onPointerMove={resetInactivityTimer}
      onTouchStart={resetInactivityTimer}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        // Magnetic Edge Snapping: snap to nearest side (left or right edge)
        const curX = x.get();
        const curY = y.get();
        const midX = (windowSize.width - pipWidth) / 2;
        const snapMargin = isMobile ? 12 : 20;
        const targetSnapX = curX < midX ? snapMargin : windowSize.width - pipWidth - snapMargin;

        const minY = 12;
        const maxY = windowSize.height - pipHeight - (isMobile ? 80 : 96);
        const clampedY = Math.max(minY, Math.min(maxY, curY));

        pipPosRef.current = { x: targetSnapX, y: clampedY };
        animate(x, targetSnapX, SPRING_TRANSITION);
        animate(y, clampedY, SPRING_TRANSITION);

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      }}
      onClick={() => {
        if (isMinimized && !isDraggingRef.current) {
          handleMaximize();
        } else if (!isMinimized && !showControls) {
          setShowControls(true);
          resetInactivityTimer();
        }
      }}
      initial={{
        opacity: 0,
        scale: 0.96,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        width: isMinimized ? pipWidth : windowSize.width,
        height: isMinimized ? pipHeight : windowSize.height,
        borderRadius: isMinimized ? 20 : 0,
        borderWidth: isMinimized ? 2 : 0,
      }}
      transition={SPRING_TRANSITION}
      className={`fixed top-0 left-0 z-[120] overflow-hidden bg-[#0d0a0b] flex flex-col select-none transition-shadow duration-300 ${
        isMinimized
          ? "border-[#d4af37]/80 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(212,175,55,0.35)] cursor-grab active:cursor-grabbing hover:shadow-[0_25px_60px_rgba(0,0,0,0.98),0_0_30px_rgba(212,175,55,0.5)]"
          : "border-transparent shadow-none"
      }`}
    >
      {/* Top Bar for Full Screen (Auto-hides after 4s) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isMinimized ? 0 : showControls ? 1 : 0,
          y: isMinimized ? -20 : showControls ? 0 : -25,
        }}
        transition={{ duration: 0.25 }}
        style={{ pointerEvents: !isMinimized && showControls ? "auto" : "none" }}
        className="absolute top-0 inset-x-0 px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-20 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-sm sm:text-base text-[#f5edd6] font-[family-name:var(--font-playfair)] font-semibold leading-tight drop-shadow-md">
                {partnerName}
              </span>

              {/* Mode Badge */}
              {videoRoute === "direct" ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-[10px] sm:text-xs font-mono font-medium backdrop-blur-md shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Direct P2P • 0 Mins
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d4af37]/25 text-[#d4af37] border border-[#d4af37]/40 text-[10px] sm:text-xs font-mono font-medium backdrop-blur-md shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                  Cloud Relay • Agora
                </span>
              )}

              {/* Partner Muted Indicator */}
              {isPartnerMuted && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-mono font-medium backdrop-blur-md shadow-sm">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Partner Muted
                </span>
              )}

              {/* Reconnection Status */}
              {isReconnecting && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] sm:text-xs font-mono font-medium backdrop-blur-md shadow-sm animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  Reconnecting...
                </span>
              )}
            </div>
            <span className="text-xs text-white/70 font-mono leading-tight mt-1 drop-shadow-sm">
              {formatTime(callDuration)}
            </span>
          </div>
        </div>

        <div>
          {/* Minimize to PiP Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMinimize}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/50 hover:bg-black/75 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all text-xs font-medium cursor-pointer shadow-lg"
            title="Minimize to Picture-in-Picture"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <span className="hidden sm:inline font-sans">Minimize</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Minimized PiP Header Controls (Expand & Timer) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isMinimized ? 1 : 0,
          y: isMinimized ? 0 : -10,
        }}
        transition={{ duration: 0.22 }}
        style={{ pointerEvents: isMinimized ? "auto" : "none" }}
        className="absolute top-2.5 inset-x-2.5 z-20 flex items-center justify-between pointer-events-auto"
      >
        <span className="text-[10px] text-white/90 bg-black/70 px-2 py-0.5 rounded-full font-mono backdrop-blur-md border border-white/15 truncate max-w-[85px]">
          {formatTime(callDuration)}
        </span>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleMaximize}
          className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/25 backdrop-blur-md transition-transform hover:scale-110 cursor-pointer shadow-md"
          title="Expand to Full Screen"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </motion.div>

      {/* Main Video Stage (Persists across minimize / maximize) */}
      <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {/* If Feeds Swapped: Show Local Camera as Primary Stage */}
        {isFeedSwapped && isCameraOn ? (
          localMediaStreamTrack ? (
            <video
              ref={setLocalVideoNode}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />
          ) : localAgoraVideoTrack ? (
            <div ref={localAgoraDivRef} className="w-full h-full object-cover pointer-events-none" />
          ) : null
        ) : (
          /* Normal: Show Remote Partner Video on Primary Stage */
          <>
            {hasRemoteWebRtcVideo && (
              <video
                ref={setRemoteVideoNode}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover pointer-events-none"
              />
            )}

            {hasRemoteAgoraVideo && (
              <div ref={remoteAgoraDivRef} className="w-full h-full object-cover pointer-events-none" />
            )}

            {/* If remote video is off, but local camera is on in PiP mode, show self camera */}
            {!hasRemoteVideo && isCameraOn && isMinimized && (
              localMediaStreamTrack ? (
                <video
                  ref={setLocalVideoNode}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
                />
              ) : localAgoraVideoTrack ? (
                <div ref={localAgoraDivRef} className="w-full h-full object-cover pointer-events-none" />
              ) : null
            )}
          </>
        )}

        {/* Avatar Placeholder when camera is off */}
        {((!isFeedSwapped && !hasRemoteVideo && (!isCameraOn || !isMinimized)) ||
          (isFeedSwapped && !isCameraOn)) && (
          <div className="flex flex-col items-center justify-center p-4 text-center z-10 select-none">
            <div className={`relative ${isMinimized ? "w-14 h-14 mb-2" : "w-24 h-24 sm:w-28 sm:h-28 mb-4"} flex items-center justify-center`}>
              {!isMinimized && <span className="absolute inset-0 rounded-full bg-[#d4af37]/20 animate-ping" />}
              <div className={`${isMinimized ? "w-14 h-14 text-xl" : "w-24 h-24 sm:w-28 sm:h-28 text-3xl sm:text-4xl"} rounded-full bg-[#181315] border-2 border-[#d4af37]/50 shadow-2xl flex items-center justify-center text-[#d4af37] font-bold font-serif`}>
                {partnerName[0]?.toUpperCase() || "❤️"}
              </div>
            </div>
            <h4 className={`${isMinimized ? "text-xs" : "text-base sm:text-lg"} font-[family-name:var(--font-playfair)] text-[#f5edd6] font-semibold mb-0.5 drop-shadow-md`}>
              {partnerName}
            </h4>
            <p className={`${isMinimized ? "text-[10px]" : "text-xs sm:text-sm"} text-[#d4af37]/80 font-mono`}>
              {isMinimized ? "Camera off" : "Camera off • Audio connected"}
            </p>
          </div>
        )}

        {/* Floating Mini Window (Tap to Swap Feeds) */}
        <AnimatePresence>
          {!isMinimized && isCameraOn && hasRemoteVideo && (
            <motion.div
              drag
              dragMomentum={false}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsFeedSwapped((prev) => !prev);
              }}
              className="absolute bottom-24 right-4 sm:bottom-28 sm:right-8 z-30 w-32 h-44 sm:w-48 sm:h-64 rounded-2xl overflow-hidden border-2 border-[#d4af37]/80 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(212,175,55,0.3)] bg-[#181315] cursor-pointer hover:border-[#d4af37] transition-colors group backdrop-blur-md"
              title="Click to swap video feeds"
            >
              {isFeedSwapped ? (
                /* Feeds Swapped: Mini Window shows Remote Video */
                hasRemoteWebRtcVideo ? (
                  <video
                    ref={setMiniVideoNode}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : hasRemoteAgoraVideo ? (
                  <div ref={miniAgoraDivRef} className="w-full h-full object-cover" />
                ) : null
              ) : (
                /* Normal: Mini Window shows Self Video */
                localMediaStreamTrack ? (
                  <video
                    ref={setLocalVideoNode}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : localAgoraVideoTrack ? (
                  <div ref={localAgoraDivRef} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/60 text-xs text-white font-mono">
                    Loading...
                  </div>
                )
              )}

              {/* Tap to swap badge */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/90 bg-black/65 px-2 py-0.5 rounded-full font-mono backdrop-blur-sm border border-white/10 pointer-events-none">
                <span className="truncate">{isFeedSwapped ? partnerName : "You"}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100 group-hover:rotate-180 transition-transform">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                  <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Control Bar (Full Screen, Auto-hides in Cinema Mode) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isMinimized ? 0 : showControls ? 1 : 0,
          y: isMinimized ? 40 : showControls ? 0 : 35,
        }}
        transition={{ duration: 0.25 }}
        style={{ pointerEvents: !isMinimized && showControls ? "auto" : "none" }}
        className="absolute bottom-6 sm:bottom-8 inset-x-0 mx-auto w-fit px-6 sm:px-8 py-3 rounded-full bg-black/65 backdrop-blur-xl border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.2)] flex items-center gap-5 sm:gap-7 z-20"
      >
        {/* Mute Mic */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isMuted
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20"
              : "bg-white/10 hover:bg-white/20 text-white border-white/20"
          }`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </motion.button>

        {/* Toggle Camera */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isCameraOn
              ? "bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.5)]"
              : "bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border-white/20"
          }`}
          title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isCameraOn ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
              <path d="M23 7l-7 5 7 5V7z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </motion.button>

        {/* Flip Camera (Front/Rear on Mobile & Multi-Cam Devices) */}
        {isCameraOn && (hasMultipleCameras || isMobile) && onFlipCamera && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onFlipCamera}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border-white/20 shadow-md"
            title="Flip Camera (Front/Rear)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.21.896 4.21 2.343 5.657L4 18" />
              <path d="M4 14c0 4.418 3.582 8 8 8s8-3.582 8-8c0-2.21-.896-4.21-2.343-5.657L20 6" />
              <polyline points="20 10 20 5 15 5" />
              <polyline points="4 14 4 19 9 19" />
            </svg>
          </motion.button>
        )}

        {/* End Call */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onEndCall}
          className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 cursor-pointer transition-colors"
          title="End Call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="22" y1="2" x2="2" y2="22" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
