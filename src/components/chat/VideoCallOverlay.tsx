"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
  partnerName: string;
  callDuration: number;
}

export default function VideoCallOverlay({
  localMediaStreamTrack,
  localAgoraVideoTrack,
  remoteWebRtcStream,
  remoteUsers,
  videoRoute,
  isCameraOn,
  isPartnerCameraOn = false,
  isMuted,
  onToggleCamera,
  onToggleMute,
  onEndCall,
  partnerName,
  callDuration,
}: VideoCallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // WebRTC Native elements
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);

  // Agora elements
  const localAgoraDivRef = useRef<HTMLDivElement>(null);
  const remoteAgoraDivRef = useRef<HTMLDivElement>(null);

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
  }, [localMediaStreamTrack, isCameraOn, isMinimized]);

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
  }, [remoteWebRtcStream, hasRemoteWebRtcVideo, isMinimized]);

  // 3. Play Agora local video
  useEffect(() => {
    const el = localAgoraDivRef.current;
    if (localAgoraVideoTrack && el) {
      localAgoraVideoTrack.play(el);
      return () => {
        localAgoraVideoTrack.stop();
      };
    }
  }, [localAgoraVideoTrack, isMinimized]);

  // 4. Play Agora remote video
  useEffect(() => {
    const el = remoteAgoraDivRef.current;
    if (remoteUser && remoteUser.videoTrack && el) {
      remoteUser.videoTrack.play(el);
      return () => {
        remoteUser.videoTrack?.stop();
      };
    }
  }, [remoteUser?.videoTrack, isMinimized]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {isMinimized ? (
        // Minimized floating bubble
        <motion.div
          drag
          dragConstraints={{ left: 10, right: 300, top: 10, bottom: 600 }}
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="fixed bottom-24 right-4 z-[120] w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.25)] border-2 border-[#d4af37]/60 bg-[#181315] cursor-grab active:cursor-grabbing flex flex-col"
        >
          <div className="relative flex-1 w-full h-full bg-black overflow-hidden">
            {hasRemoteWebRtcVideo ? (
              <video
                ref={setRemoteVideoNode}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : hasRemoteAgoraVideo ? (
              <div ref={remoteAgoraDivRef} className="w-full h-full object-cover" />
            ) : isCameraOn && localMediaStreamTrack ? (
              <video
                ref={setLocalVideoNode}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : isCameraOn && localAgoraVideoTrack ? (
              <div ref={localAgoraDivRef} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#181315]">
                <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] text-sm font-bold mb-1">
                  {partnerName[0]?.toUpperCase() || "❤️"}
                </div>
                <span className="text-[10px] text-[#f5edd6] truncate max-w-full font-serif">
                  {partnerName}
                </span>
                <span className="text-[9px] text-[#d4af37]/80 font-mono">
                  {formatTime(callDuration)}
                </span>
              </div>
            )}

            {/* Expand Overlay Button */}
            <button
              onClick={() => setIsMinimized(false)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer z-10"
              title="Expand video"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          </div>
        </motion.div>
      ) : (
        // Full video modal / card view
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="fixed inset-0 sm:inset-auto sm:top-20 sm:right-8 z-[115] w-full h-full sm:w-[440px] sm:h-[600px] sm:rounded-3xl overflow-hidden bg-[#181315]/95 backdrop-blur-2xl border border-[#d4af37]/40 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(212,175,55,0.2)] flex flex-col"
        >
          {/* Top Bar Header with Mode Badge */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/85 via-black/50 to-transparent z-10 select-none">
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#f5edd6] font-[family-name:var(--font-playfair)] font-semibold leading-tight">
                    {partnerName}
                  </span>
                  {/* Mode Badge */}
                  {videoRoute === "direct" ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Direct P2P • 0 Mins
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 text-[9px] font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                      Cloud Relay • Agora
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/60 font-mono leading-tight mt-0.5">
                  {formatTime(callDuration)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Minimize button */}
              <button
                onClick={() => setIsMinimized(true)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Minimize video window"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Video Area (Remote Video or Camera-off state) */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {/* Direct WebRTC Remote Video */}
            {hasRemoteWebRtcVideo && (
              <video
                ref={setRemoteVideoNode}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Agora Remote Video */}
            {hasRemoteAgoraVideo && (
              <div ref={remoteAgoraDivRef} className="w-full h-full object-cover" />
            )}

            {!hasRemoteVideo && (
              <div className="flex flex-col items-center justify-center p-6 text-center z-0">
                <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#d4af37]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-[#181315] border-2 border-[#d4af37]/50 shadow-xl flex items-center justify-center text-[#d4af37] text-2xl font-bold font-serif">
                    {partnerName[0]?.toUpperCase() || "❤️"}
                  </div>
                </div>
                <h4 className="text-sm font-[family-name:var(--font-playfair)] text-[#f5edd6] font-semibold mb-1">
                  {partnerName} is on the call
                </h4>
                <p className="text-[11px] text-[#d4af37]/80 font-mono">
                  Camera off • Audio connected
                </p>
              </div>
            )}

            {/* Local Video PIP (Picture-in-Picture) */}
            <AnimatePresence>
              {isCameraOn && (
                <motion.div
                  drag
                  dragConstraints={{ left: -240, right: 0, top: -380, bottom: 0 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute bottom-4 right-4 z-20 w-28 h-36 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-[#d4af37]/70 shadow-2xl bg-[#181315] cursor-grab active:cursor-grabbing"
                >
                  {localMediaStreamTrack ? (
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
                    <div className="w-full h-full flex items-center justify-center bg-black/60 text-xs text-white">
                      Loading...
                    </div>
                  )}
                  <span className="absolute bottom-1 left-2 text-[9px] text-white/80 bg-black/60 px-1.5 py-0.5 rounded-full font-mono">
                    You
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="px-6 py-4 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-around z-10 border-t border-white/5">
            {/* Mute Mic */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleMute}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                isMuted
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/20"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                isCameraOn
                  ? "bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                  : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/20"
              }`}
              title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              {isCameraOn ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
                  <path d="M23 7l-7 5 7 5V7z" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </motion.button>

            {/* End Call */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEndCall}
              className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 cursor-pointer transition-colors"
              title="End Call"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="22" y1="2" x2="2" y2="22" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
