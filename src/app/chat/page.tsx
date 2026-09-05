"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { collection, query, orderBy, onSnapshot, addDoc, limit, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, onValue, set, onDisconnect, remove, push, update, get } from "firebase/database";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { db, auth, rtdb } from "@/lib/firebase";
import { RTC_CONFIG, callSounds } from "@/lib/webrtc";
import Link from "next/link";

interface CustomSticker {
  id: string;
  url: string;
  uploadedBy: string;
}

interface Message {
  id: string;
  text?: string;
  sender: string;
  createdAt: any;
  attachmentUrl?: string;
  attachmentType?: "image" | "video" | "audio" | "sticker";
  isEdited?: boolean;
  replyToId?: string;
  reactions?: Record<string, string>;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

const VoiceMessagePlayer = ({ src, isMe }: { src: string; isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioSrc = src.replace(/\.(webm|ogg|mp4)$/i, '.mp3');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && audio.duration !== Infinity) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('durationchange', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((e) => console.error("Playback error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio && audio.duration && audio.duration !== Infinity) {
      const seekTime = (parseFloat(e.target.value) / 100) * audio.duration;
      audio.currentTime = seekTime;
      setProgress(parseFloat(e.target.value));
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-3 p-3 backdrop-blur-md rounded-2xl border ${isMe ? 'bg-[#d4af37]/10 border-[#d4af37]/20 shadow-[#d4af37]/5' : 'bg-black/60 border-white/10 shadow-black/50'} w-[220px] sm:w-[260px] shadow-lg`}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
        onClick={togglePlay}
        className={`w-10 h-10 flex-none flex items-center justify-center rounded-full ${isMe ? 'bg-[#d4af37] text-black hover:bg-[#ebd488]' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'} transition-colors`}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M5 3l14 9-14 9V3z"></path></svg>
        )}
      </motion.button>

      <div className="flex-1 flex flex-col gap-1.5 mt-1">
        <input 
          type="range" 
          min="0" max="100" 
          value={progress} 
          onChange={handleSeek}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isMe ? 'accent-[#d4af37] bg-black/20' : 'accent-white/70 bg-white/10'}`}
        />
        <div className={`flex justify-between text-[10px] font-mono ${isMe ? 'text-[#d4af37]/70' : 'text-white/50'}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};



const IgEmbed = ({ reelId, msgId, setActiveMessageId }: { reelId: string, msgId: string, setActiveMessageId: (id: string | null) => void }) => {
  return (
    <div 
      className="relative w-[280px] sm:w-[320px] max-w-full rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto mt-1"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Options Button so they can Reply/Delete without an overlay blocking the video */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setActiveMessageId(msgId);
        }}
        className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </button>

      {/* The actual iframe, fully interactive so tap-to-play works */}
      <iframe 
        src={`https://www.instagram.com/p/${reelId}/embed/?hidecaption=1`} 
        className="absolute top-0 left-0 w-[102%] h-[115%] -mt-[8%] -ml-[1%]"
        frameBorder="0" 
        scrolling="no" 
        allowTransparency={true}
        allow="encrypted-media"
      ></iframe>
    </div>
  );
};

const parseIgLinks = (text: string) => {
  const igRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)(?:\S*)/g;
  const linkIds = [...text.matchAll(igRegex)].map(m => m[1]); // Extract JUST the ID
  const cleanText = text.replace(igRegex, '').trim();
  return { cleanText, linkIds };
};

export default function ChatPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "popup" | "reg_user" | "reg_pass">("login");

  const [messages, setMessages] = useState<Message[]>([]);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSticker, setIsUploadingSticker] = useState(false);
  const pickerRef = useRef<HTMLFormElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMsgsLengthRef = useRef(0);
  
  
  const [globalBackground, setGlobalBackground] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hasLongPressed = useRef(false);

  // WebRTC Call States & Refs
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected">("idle");
  const [callSession, setCallSession] = useState<{ caller: string; startedAt?: number; connectedAt?: number; status?: string } | null>(null);
  const [showIncomingBanner, setShowIncomingBanner] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const isOtherUserCalling = Boolean(
    callSession &&
    callSession.status === "calling" &&
    callSession.caller !== username &&
    callState !== "connected"
  );

  const callStateRef = useRef<"idle" | "calling" | "incoming" | "connected">("idle");
  callStateRef.current = callState;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const candidateListenersRef = useRef<(() => void)[]>([]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedCandidateKeysRef = useRef<Set<string>>(new Set());

  const addOrQueueCandidate = (candidateData: RTCIceCandidateInit, key?: string) => {
    if (key && processedCandidateKeysRef.current.has(key)) return;
    if (key) processedCandidateKeysRef.current.add(key);

    const pc = pcRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch((e) => {
        console.warn("Could not add ICE candidate immediately:", e);
      });
    } else {
      pendingCandidatesRef.current.push(candidateData);
    }
  };

  const flushPendingCandidates = async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("Error applying buffered ICE candidate:", e);
        }
      }
    }
  };

  const endCallCleanup = useCallback((playEndTone = true) => {
    callSounds.stopAll();
    if (playEndTone) callSounds.playCallEnd();
    setShowIncomingBanner(false);

    pendingCandidatesRef.current = [];
    processedCandidateKeysRef.current.clear();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    candidateListenersRef.current.forEach((unsub) => unsub());
    candidateListenersRef.current = [];

    setCallState("idle");
    setCallSession(null);
    setIsCallMuted(false);
    setCallDuration(0);
  }, []);

  const handleStartCall = async () => {
    if (!username || callState !== "idle") return;
    try {
      // Unlock mobile audio on user tap
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch(() => {});
      }

      callSounds.playRingback();
      setCallState("calling");
      setCallSession({ caller: username, startedAt: Date.now() });

      // Wipe clean old candidates and session
      pendingCandidatesRef.current = [];
      processedCandidateKeysRef.current.clear();
      await remove(ref(rtdb, "call/candidates")).catch(() => {});

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(rtdb, "call/candidates/caller"), event.candidate.toJSON()).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          try { pc.restartIce(); } catch {}
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callData = {
        caller: username,
        status: "calling",
        offer: { type: offer.type, sdp: offer.sdp },
        startedAt: Date.now(),
      };

      await set(ref(rtdb, "call/session"), callData);
      onDisconnect(ref(rtdb, "call/session")).set({ status: "ended", endedBy: username });

      // Listen for receiver candidates with queuing
      const receiverCandidatesRef = ref(rtdb, "call/candidates/receiver");
      const unsubCandidates = onValue(receiverCandidatesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([key, cand]: [string, any]) => {
            addOrQueueCandidate(cand, key);
          });
        }
      });
      candidateListenersRef.current.push(unsubCandidates);
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Could not access microphone or initiate call. Please ensure microphone permissions are granted.");
      endCallCleanup(false);
      remove(ref(rtdb, "call/session")).catch(() => {});
    }
  };

  const handleAcceptCall = async () => {
    if (!username) return;
    try {
      // Unlock mobile audio on user tap
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch(() => {});
      }

      callSounds.stopAll();
      setShowIncomingBanner(false);
      const snap = await get(ref(rtdb, "call/session"));
      const data = snap.val();
      if (!data || data.status !== "calling" || !data.offer) {
        alert("Call is no longer available.");
        endCallCleanup(false);
        return;
      }

      pendingCandidatesRef.current = [];
      processedCandidateKeysRef.current.clear();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(rtdb, "call/candidates/receiver"), event.candidate.toJSON()).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          try { pc.restartIce(); } catch {}
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await update(ref(rtdb, "call/session"), {
        status: "connected",
        answer: { type: answer.type, sdp: answer.sdp },
        connectedAt: Date.now(),
      });
      onDisconnect(ref(rtdb, "call/session")).set({ status: "ended", endedBy: username });

      // Listen for caller candidates with queuing
      const callerCandidatesRef = ref(rtdb, "call/candidates/caller");
      const unsubCandidates = onValue(callerCandidatesRef, (snapshot) => {
        const candData = snapshot.val();
        if (candData) {
          Object.entries(candData).forEach(([key, cand]: [string, any]) => {
            addOrQueueCandidate(cand, key);
          });
        }
      });
      candidateListenersRef.current.push(unsubCandidates);

      setCallState("connected");
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accepting call:", error);
      alert("Could not access microphone to answer call.");
      handleEndCall();
    }
  };

  const handleEndCall = async () => {
    try {
      await set(ref(rtdb, "call/session"), { status: "ended", endedBy: username });
      remove(ref(rtdb, "call/candidates")).catch(() => {});
    } catch {
      // Ignore
    }
    endCallCleanup(true);
  };

  const handleToggleCallMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsCallMuted(!audioTrack.enabled);
      }
    }
  };

  // Instagram-style 2-second hold reaction states
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState<string | null>(null);
  const [customReactionMsg, setCustomReactionMsg] = useState<Message | null>(null);
  const [reactionDetailsMsgId, setReactionDetailsMsgId] = useState<string | null>(null);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didTrigger2sHoldRef = useRef(false);

  const handlePressStart = (msgId: string, clientX: number, clientY: number) => {
    didTrigger2sHoldRef.current = false;
    pressStartPosRef.current = { x: clientX, y: clientY };
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      didTrigger2sHoldRef.current = true;
      setReactionMenuMessageId(msgId);
      setActiveMessageId(null);
      if (typeof window !== "undefined" && window.navigator && "vibrate" in window.navigator) {
        window.navigator.vibrate(50);
      }
    }, 500); // 500ms hold
  };

  const handlePressMove = (clientX: number, clientY: number) => {
    if (!pressStartPosRef.current || !pressTimerRef.current) return;
    const dx = Math.abs(clientX - pressStartPosRef.current.x);
    const dy = Math.abs(clientY - pressStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleToggleReaction = async (message: Message, emoji: string) => {
    if (!username) return;
    try {
      const currentReaction = message.reactions?.[username];
      const newReactions = { ...(message.reactions || {}) };
      if (currentReaction === emoji) {
        delete newReactions[username];
      } else {
        newReactions[username] = emoji;
      }
      await updateDoc(doc(db, "messages", message.id), {
        reactions: newReactions,
      });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const startLongPress = (id: string) => {
    hasLongPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      setActiveMessageId(id);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(id);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const handleImageClick = (e: React.MouseEvent, url: string) => {
    if (didTrigger2sHoldRef.current) {
      didTrigger2sHoldRef.current = false;
      return;
    }
    if (hasLongPressed.current) {
      hasLongPressed.current = false;
      return;
    }
    setSelectedImage(url);
  };
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Close pickers and reaction menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowStickerPicker(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.reaction-interactive')) {
        setReactionMenuMessageId(null);
        setReactionDetailsMsgId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch("/api/chat/verify");
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username);
        if (data.firebaseToken) {
          await signInWithCustomToken(auth, data.firebaseToken);
        }
        setIsLoggedIn(true);
      }
    } catch {
      // Ignore
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Subscribe to messages and global background when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    // Messages
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(messageLimit));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs.reverse());
      setHasMore(snapshot.docs.length === messageLimit);
      setIsInitialLoaded(true);
    });

          // Stickers
      const stickersQuery = query(collection(db, "stickers"), orderBy("createdAt", "desc"));
      const unsubscribeStickers = onSnapshot(stickersQuery, (snapshot) => {
        const fetchedStickers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CustomSticker[];
        setCustomStickers(fetchedStickers);
      });
      
      // Global Background
    const bgRef = doc(db, "settings", "chat_config");
    const unsubscribeBg = onSnapshot(bgRef, (snapshot) => {
      if (snapshot.exists() && snapshot.data().backgroundUrl) {
        setGlobalBackground(snapshot.data().backgroundUrl);
      } else {
        setGlobalBackground(null);
      }
    });

    const typingRef = ref(rtdb, "typing");
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typers = Object.keys(data).filter(user => user !== username && data[user] === true);
        setTypingUsers(typers);
      } else {
        setTypingUsers([]);
      }
    });

    if (username) {
      const myTypingRef = ref(rtdb, `typing/${username}`);
      onDisconnect(myTypingRef).remove();
    }

    // Call session listener
    const callRef = ref(rtdb, "call/session");
    const unsubscribeCall = onValue(callRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && data.status === "calling") {
        setCallSession(data);
        if (data.caller !== username && callStateRef.current === "idle") {
          setCallState("incoming");
          setShowIncomingBanner(true);
          callSounds.playRingtone();
        }
      } else if (data && data.status === "connected") {
        if (callStateRef.current === "calling" && data.answer && pcRef.current) {
          callSounds.stopAll();
          try {
            if (pcRef.current.signalingState === "have-local-offer") {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
              await flushPendingCandidates();
            }
          } catch (e) {
            console.error("Failed to set remote answer:", e);
          }
          setCallState("connected");
          if (!callTimerRef.current) {
            setCallDuration(0);
            callTimerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        }
      } else if (data && data.status === "ended") {
        if (callStateRef.current !== "idle") {
          endCallCleanup(true);
        }
      } else if (!data) {
        if (callStateRef.current !== "idle") {
          endCallCleanup(false);
        }
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeBg();
      unsubscribeTyping();
      unsubscribeStickers();
      unsubscribeCall();
    };
  }, [isLoggedIn, username, messageLimit, endCallCleanup]);

  // Auto-scroll when typing indicator appears if we are at bottom
  useEffect(() => {
    if (typingUsers.length > 0 && isAtBottomRef.current) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
      }, 50);
    }
  }, [typingUsers]);

  // Bulletproof auto-scroll logic
  useEffect(() => {
    if (messages.length > prevMsgsLengthRef.current) {
      if (isAtBottomRef.current) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
        }, 50);
      }
    }
    prevMsgsLengthRef.current = messages.length;
  }, [messages.length]);

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError("");
    setIsAuthenticating(true);

    try {
      const res = await fetch("/api/chat/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.firebaseToken) {
          await signInWithCustomToken(auth, data.firebaseToken);
        }
        setIsLoggedIn(true);
      } else {
        setAuthError(data.error || "Registration failed");
      }
    } catch (err: any) {
      console.error("Register err:", err);
      setAuthError(err.message || "Network error. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthenticating(true);

    try {
      const res = await fetch("/api/chat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.firebaseToken) {
          await signInWithCustomToken(auth, data.firebaseToken);
        }
        setIsLoggedIn(true);
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch (err: any) {
      console.error("Login err:", err);
      setAuthError(err.message || "Network error. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to completely erase the chat history?")) return;
    try {
      const res = await fetch("/api/chat/clear", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to clear chat");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while trying to clear chat");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch("/api/chat/logout", { method: "POST" });
      setIsLoggedIn(false);
      setUsername("");
      setPassword("");
      setAuthMode("login");
      setGlobalBackground(null);
    } catch {
      console.error("Logout failed");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, "messages", id));
      setActiveMessageId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message.");
    }
  };

  const handleEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditMessageText(msg.text || "");
    setActiveMessageId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editMessageText.trim()) return;
    try {
      await updateDoc(doc(db, "messages", id), {
        text: editMessageText.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditMessageText("");
    } catch (error) {
      console.error("Error editing message:", error);
      alert("Failed to update message.");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditMessageText("");
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (!username) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      set(ref(rtdb, `typing/${username}`), true).catch(() => {});
    }

    typingTimeoutRef.current = setTimeout(() => {
      remove(ref(rtdb, `typing/${username}`)).catch(() => {});
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const text = newMessage;
    setNewMessage("");
    // Force scroll down when you send a message
    virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
    const payload: any = {
      text: text,
      sender: username,
      createdAt: serverTimestamp(),
    };
    if (replyingTo) payload.replyToId = replyingTo.id;

    try {
      await addDoc(collection(db, "messages"), payload);
      setReplyingTo(null);
      remove(ref(rtdb, `typing/${username}`)).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    if (file.size > 250 * 1024 * 1024) {
      alert("File size exceeds 250MB limit.");
      return null;
    }
    
    const res = await fetch("/api/chat/sign-upload", { method: "POST" });
    if (!res.ok) throw new Error("Failed to get upload signature");
    const { timestamp, signature, cloudName, apiKey } = await res.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", "love-letters-chat");
    formData.append("resource_type", "auto"); // 'auto' seamlessly handles audio, video, and images

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });
    
    if (!uploadRes.ok) throw new Error("Cloudinary upload failed");
    const uploadData = await uploadRes.json();
    return uploadData;
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingGlobal(true);
    try {
      const uploadData = await uploadToCloudinary(file);
      if (uploadData) {
        await setDoc(doc(db, "settings", "chat_config"), {
          backgroundUrl: uploadData.secure_url,
          updatedAt: serverTimestamp(),
          updatedBy: username,
        });
      }
    } catch (error) {
      console.error("Background upload error:", error);
      alert("Failed to upload background.");
    } finally {
      setIsUploadingGlobal(false);
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  };

    const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSticker(true);
    try {
      const uploadData = await uploadToCloudinary(file);
      if (uploadData) {
        await addDoc(collection(db, "stickers"), {
          url: uploadData.secure_url,
          uploadedBy: username,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Sticker upload error:", error);
      alert("Failed to upload sticker.");
    } finally {
      setIsUploadingSticker(false);
      if (stickerInputRef.current) stickerInputRef.current.value = "";
    }
  };

  const handleDeleteSticker = async (stickerId: string) => {
    if (!window.confirm("Are you sure you want to delete this sticker?")) return;
    try {
      await deleteDoc(doc(db, "stickers", stickerId));
    } catch(error) {
      console.error("Failed to delete sticker", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const uploadData = await uploadToCloudinary(file);
      if (uploadData) {
        const isVideo = uploadData.resource_type === "video";
        const payload: any = {
          text: "", // Optional text, maybe future caption support
          attachmentUrl: uploadData.secure_url,
          attachmentType: isVideo ? "video" : "image",
          sender: username,
          createdAt: serverTimestamp(),
        };
        if (replyingTo) payload.replyToId = replyingTo.id;
        await addDoc(collection(db, "messages"), payload);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of Array.from(items)) {
      if (item.type.indexOf('image') === 0 || item.type.indexOf('video') === 0) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setIsUploadingFile(true);
          try {
            const uploadData = await uploadToCloudinary(file);
            if (uploadData) {
              const isVideo = uploadData.resource_type === "video";
              const payload: any = {
                text: "", 
                attachmentUrl: uploadData.secure_url,
                attachmentType: isVideo ? "video" : "image",
                sender: username,
                createdAt: serverTimestamp(),
              };
              if (replyingTo) payload.replyToId = replyingTo.id;
              await addDoc(collection(db, "messages"), payload);
              setReplyingTo(null);
            }
          } catch (error) {
            console.error("Paste upload error:", error);
            alert("Failed to upload pasted file.");
          } finally {
            setIsUploadingFile(false);
          }
          break;
        }
      }
    }
  };


  // ----- Audio Recording Methods -----
  
  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/webm",
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    // Check if the browser supports mediaDevices (blocked on HTTP)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone access is blocked! This usually happens if you access the site over an insecure HTTP network IP instead of HTTPS, or if your browser lacks support.");
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 48000,
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
          },
        });
      } catch (e) {
        console.warn("Strict audio constraints failed, falling back to basic audio:true", e);
        // iOS Safari often fails on strict constraints (OverconstrainedError) before even prompting for permissions.
        // Fallback to basic audio:true
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = { audioBitsPerSecond: 192000 };
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(200); // 200ms chunks for safety/stability
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied or failed", err);
      alert("Microphone access is required to send voice messages.");
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setRecordingTime(0);

        // Stop all hardware tracks to release microphone light
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());

        if (!cancel && audioChunksRef.current.length > 0) {
          const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          await handleAudioUpload(blob);
        }
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setIsUploadingFile(true); // Re-use the global uploading indicator
    try {
      // Create a file object with correct extension for Cloudinary to properly infer format if needed
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voice-message.${ext}`, { type: blob.type });
      
      const uploadData = await uploadToCloudinary(file);
      if (uploadData) {
        const payload: any = {
          text: "", 
          attachmentUrl: uploadData.secure_url,
          attachmentType: "audio",
          sender: username,
          createdAt: serverTimestamp(),
        };
        if (replyingTo) payload.replyToId = replyingTo.id;
        await addDoc(collection(db, "messages"), payload);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Audio upload error:", error);
      alert("Failed to upload voice message.");
    } finally {
      setIsUploadingFile(false);
    }
  };


  // Auto-scroll when someone starts typing


  if (isCheckingAuth) {
    return (
      <div className="min-h-[100dvh] bg-[#11080d] flex items-center justify-center font-[family-name:var(--font-lora)]">
        <div className="text-[#8a7a6a] animate-pulse italic tracking-widest text-sm">
          Checking identity...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[100dvh] bg-[#11080d] flex items-center justify-center p-4 relative overflow-hidden font-[family-name:var(--font-lora)]">
        {/* Top Left Return Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} whileHover={{ scale: 1.05, x: -5 }} whileTap={{ scale: 0.95 }} className="">
        <Link 
          href="/" 
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-full text-white/50 hover:text-white/90 hover:bg-white/[0.08] hover:border-white/20 transition-all backdrop-blur-md shadow-lg shadow-black/20"
        >
          <span>&larr;</span>
          <span className="text-xs uppercase tracking-widest font-mono">Return to Notebook</span>
        </Link>
        </motion.div>

        {/* Ambient background blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-[#d4af37]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {authMode === "login" && (
            <motion.div
              key="login"
              className="relative w-full max-w-md p-8 sm:p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl text-[#d4af37] mb-8 leading-tight">
                Whispers
              </h2>
              <form onSubmit={handleLogin}>
                <motion.input whileFocus={{ scale: 1.02 }} type="text" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 px-4 py-3 text-center text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/50 transition-colors mb-4"
                  placeholder="Your alias..."
                  required
                />
                <motion.input whileFocus={{ scale: 1.02 }} type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 px-4 py-3 text-center text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/50 transition-colors mb-6"
                  placeholder="••••••••"
                  required
                />
                
                {authError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[#a82d6a] text-sm text-center mb-4"
                  >
                    {authError}
                  </motion.div>
                )}

                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-4 mt-2 bg-gradient-to-r from-[#d4af37]/20 to-[#a82d6a]/20 text-white/90 rounded-2xl border border-white/10 font-[family-name:var(--font-playfair)] tracking-widest uppercase text-xs hover:from-[#d4af37]/30 hover:to-[#a82d6a]/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all disabled:opacity-50"
                >
                  {isAuthenticating ? "Entering..." : "Enter"}
                </motion.button>
              </form>

              <div className="mt-8 flex flex-col items-center gap-4">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setAuthMode("popup");
                    setAuthError("");
                  }}
                  className="text-white/40 text-xs hover:text-[#d4af37] transition-colors"
                >
                  Don't have an account?
                </motion.button>
              </div>
            </motion.div>
          )}

          {authMode === "popup" && (
            <motion.div
              key="popup"
              className="relative w-full max-w-sm p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 text-center shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-white/70 font-[family-name:var(--font-lora)] italic mb-8 text-lg">
                Wait... you don't have an account yet?
              </p>

              <div className="space-y-3">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setAuthMode("reg_user")}
                  className="w-full py-3.5 bg-black/40 text-[#f5edd6] rounded-xl border border-white/5 hover:border-[#d4af37]/50 hover:bg-black/60 transition-all font-[family-name:var(--font-lora)] text-sm"
                >
                  Sadly, I don't have one 🥹
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setAuthMode("login")}
                  className="w-full py-3.5 bg-gradient-to-r from-[#d4af37]/10 to-[#a82d6a]/10 text-white/90 rounded-xl border border-white/10 hover:from-[#d4af37]/20 hover:to-[#a82d6a]/20 transition-all font-[family-name:var(--font-lora)] text-sm"
                >
                  Naur, I have one! 💅
                </motion.button>
              </div>
            </motion.div>
          )}

          {authMode === "reg_user" && (
            <motion.div
              key="reg_user"
              className="relative w-full max-w-md p-8 sm:p-12 text-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl text-[#d4af37] mb-2 leading-tight">
                What should I call you?
              </h2>
              <p className="text-white/40 mb-8 font-[family-name:var(--font-lora)] italic">
                Choose a unique alias for the room.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); setAuthMode("reg_pass"); }}>
                <input
                  autoFocus
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 px-4 py-3 text-center text-2xl text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#d4af37] transition-all mb-8"
                  placeholder="Your alias..."
                  required
                />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!username.trim()}
                  className="px-8 py-3 bg-white/[0.05] border border-white/10 rounded-full text-white/80 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-0"
                >
                  Next &rarr;
                </motion.button>
              </form>
            </motion.div>
          )}

          {authMode === "reg_pass" && (
            <motion.div
              key="reg_pass"
              className="relative w-full max-w-md p-8 sm:p-12 text-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl text-[#d4af37] mb-2 leading-tight">
                Then what should the password be?
              </h2>
              <p className="text-white/40 mb-8 font-[family-name:var(--font-lora)] italic">
                Make it something only you would know.
              </p>
              <form onSubmit={handleRegister}>
                <input
                  autoFocus
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 text-center text-3xl text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#d4af37] transition-all mb-8 tracking-[0.3em]"
                  placeholder="••••••••"
                  required
                />
                
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#a82d6a] text-sm text-center px-4 mb-6"
                  >
                    {authError}
                  </motion.div>
                )}

                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!password.trim() || isAuthenticating}
                  className="px-8 py-4 bg-gradient-to-r from-[#d4af37]/20 to-[#a82d6a]/20 border border-white/10 rounded-full text-white/90 hover:from-[#d4af37]/40 hover:to-[#a82d6a]/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all disabled:opacity-30 uppercase tracking-widest text-xs font-[family-name:var(--font-playfair)]"
                >
                  {isAuthenticating ? "Sealing identity..." : "Seal my identity"}
                </motion.button>
              </form>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setAuthMode("reg_user")}
                className="block mx-auto mt-6 text-white/30 text-xs hover:text-[#d4af37] transition-colors"
              >
                &larr; Back
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-[#1a0d12] overflow-hidden transition-all duration-1000"
      style={globalBackground ? { 
        backgroundImage: `url(${globalBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      {/* Background Overlay */}
      {globalBackground && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0 pointer-events-none" />}

      {/* Header */}
      <motion.header initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex-none p-4 border-b border-[#d4af37]/20 bg-black/40 backdrop-blur-md flex items-center justify-between relative z-50">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Link href="/" className="text-[#8a7a6a] hover:text-[#d4af37] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </Link></motion.div>
          <h1 className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-xl tracking-widest">
            Whispers
          </h1>
        </div>
        <div className="flex items-center gap-3 relative" ref={headerMenuRef}>
          <input
            type="file"
            accept="image/*"
            ref={bgInputRef}
            className="hidden"
            onChange={(e) => {
              handleBackgroundUpload(e);
              setShowHeaderMenu(false);
            }}
          />

          {/* Audio Call Button with Glowing Ring & Click to Join */}
          <div className="relative flex items-center justify-center">
            {isOtherUserCalling && (
              <>
                {/* Outward Radiating Pulse Wave */}
                <motion.span
                  animate={{ scale: [1, 1.45, 1.9], opacity: [0.8, 0.35, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
                  className="absolute -inset-1.5 rounded-full bg-emerald-400/40 pointer-events-none"
                />
                {/* Intense Glowing Border Ring */}
                <motion.span
                  animate={{ scale: [1, 1.12, 1], opacity: [1, 0.65, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="absolute -inset-1 rounded-full border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9),0_0_30px_rgba(52,211,153,0.5)] pointer-events-none"
                />
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={isOtherUserCalling ? handleAcceptCall : handleStartCall}
              disabled={callState === "connected" || callState === "calling"}
              className={`relative z-10 h-9 flex items-center gap-1.5 rounded-full transition-all border cursor-pointer select-none ${
                isOtherUserCalling
                  ? "px-3.5 bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)] font-semibold"
                  : callState === "connected"
                  ? "w-9 justify-center bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-500/20 shadow-md"
                  : callState === "calling"
                  ? "w-9 justify-center bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/50 animate-pulse shadow-[#d4af37]/20 shadow-md"
                  : "w-9 justify-center bg-black/40 text-[#8a7a6a] border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/40 hover:bg-[#d4af37]/10"
              } disabled:cursor-not-allowed`}
              title={
                isOtherUserCalling
                  ? `${callSession?.caller || "Partner"} is calling • Click to Join`
                  : callState === "connected"
                  ? "Call in progress"
                  : callState === "calling"
                  ? "Calling..."
                  : "Start Voice Call"
              }
              aria-label="Audio call button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isOtherUserCalling ? "text-emerald-300 animate-bounce" : ""}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {isOtherUserCalling && (
                <span className="text-[11px] font-mono tracking-wider uppercase font-bold text-emerald-300">
                  Join Call
                </span>
              )}
            </motion.button>
          </div>

          <span className="text-[#8a7a6a] text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hidden sm:inline-block">
            {username}
          </span>

          {/* 3-Dot Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all border cursor-pointer ${
              showHeaderMenu 
                ? "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/50" 
                : "bg-black/40 text-[#8a7a6a] border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/40"
            }`}
            title="Options"
            aria-label="Chat options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </motion.button>

          {/* Redesigned 3-Dot Dropdown Menu */}
          <AnimatePresence>
            {showHeaderMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-12 w-56 bg-[#161214]/95 backdrop-blur-xl border border-[#d4af37]/30 rounded-2xl p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] z-[100] flex flex-col gap-1 select-none pointer-events-auto"
              >
                {/* User info banner */}
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8a7a6a] uppercase tracking-wider font-mono">Logged in as</p>
                    <p className="text-xs text-[#d4af37] font-[family-name:var(--font-playfair)] font-medium truncate">{username}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                </div>

                {/* Change Wallpaper */}
                <button
                  type="button"
                  onClick={() => {
                    bgInputRef.current?.click();
                    setShowHeaderMenu(false);
                  }}
                  disabled={isUploadingGlobal}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-[#e8dfc8] hover:text-[#d4af37] hover:bg-[#d4af37]/10 rounded-xl transition-all font-[family-name:var(--font-playfair)] text-left cursor-pointer disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#d4af37]">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="flex-1">
                    {isUploadingGlobal ? "Uploading..." : "Change Wallpaper"}
                  </span>
                </button>

                {/* Clear Chat History (admin) */}
                {username === "firebase" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      handleClearChat();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400/90 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all font-[family-name:var(--font-playfair)] text-left cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Clear Chat History</span>
                  </button>
                )}

                <div className="h-[1px] bg-white/10 my-0.5" />

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all font-[family-name:var(--font-playfair)] text-left cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Messages */}
            <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex-1 relative z-10 flex flex-col min-h-0">
        {isInitialLoaded && (
        <Virtuoso
          ref={virtuosoRef}
          className="w-full h-full"
          alignToBottom
          data={messages}
          firstItemIndex={1000000 - messages.length}
          computeItemKey={(index, item) => item.id}
          initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          atBottomThreshold={150}
          atBottomStateChange={(atBottom) => {
            setShowScrollBottom(!atBottom);
            isAtBottomRef.current = atBottom;
          }}
          startReached={() => {
            if (hasMore && !loadingMore) {
              setLoadingMore(true);
              setMessageLimit(prev => prev + 50);
              setTimeout(() => setLoadingMore(false), 500);
            }
          }}
          components={{
            Header: () => (
              messages.length === 0 ? (
                <div className="text-center text-[#8a7a6a]/60 font-[family-name:var(--font-lora)] text-lg italic mt-20">
                  The room is silent. Start a whisper...
                </div>
              ) : (
                <div className="h-4" />
              )
            ),
            Footer: () => (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className="flex flex-col items-start relative p-2 -mx-2"
              >
                <span className="text-xs text-[#8a7a6a]/70 uppercase tracking-widest mb-1 ml-2 font-[family-name:var(--font-playfair)]">
                  {typingUsers.join(', ')}
                </span>
                <div className="px-5 py-4 rounded-2xl bg-black/80 rounded-bl-sm border border-white/10 shadow-black/50 shadow-lg flex items-center gap-1.5">
                  <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                  <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                  <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
                <div className="h-4" />
              </div>
            )
          }}
          itemContent={(index, msg) => {
            const isMe = msg.sender === username;
            const isActive = activeMessageId === msg.id;
            const isEditing = editingMessageId === msg.id;

            return (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 w-full">
                                <motion.div 
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} relative p-2 -mx-2 rounded-2xl transition-colors duration-500 ${highlightedMessageId === msg.id ? "bg-white/10" : "bg-transparent"}`} id={msg.id}
                  >
                  <span className="text-xs text-[#8a7a6a]/70 uppercase tracking-widest mb-1 ml-2 mr-2 font-[family-name:var(--font-playfair)]">
                    {msg.sender}
                  </span>
                  
                  {msg.replyToId && (() => {
                    const replyMsg = messages.find(m => m.id === msg.replyToId);
                    if (!replyMsg) return null;
                    return (
                      <div 
                        onClick={() => scrollToMessage(msg.replyToId!)} 
                        className={`mb-2 z-0 px-4 py-2 rounded-xl text-xs bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition-colors max-w-[85%] sm:max-w-[70%] overflow-hidden shadow-sm ${isMe ? 'mr-1' : 'ml-1'}`}
                      >
                        <div className="text-[#d4af37] opacity-90 font-bold mb-0.5 font-[family-name:var(--font-playfair)]">
                          {replyMsg.sender}
                        </div>
                        <div className="truncate text-white/70 font-sans">
                          {replyMsg.text || (replyMsg.attachmentType ? `[${replyMsg.attachmentType}]` : "...")}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Message Content Container with Instagram Reaction Support */}
                  <div className={`relative flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%]`}>
                    
                    {/* Floating Instagram Reaction Bar */}
                    <AnimatePresence>
                      {reactionMenuMessageId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.5, y: 8 }}
                          transition={{ type: "spring", stiffness: 450, damping: 25 }}
                          className={`reaction-interactive absolute -top-11 ${isMe ? "right-0" : "left-0"} z-40 flex items-center gap-1 sm:gap-1.5 bg-[#181315]/95 border border-[#d4af37]/40 shadow-[0_10px_35px_rgba(0,0,0,0.85)] px-2.5 py-1 rounded-full backdrop-blur-xl select-none`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {QUICK_REACTIONS.map((emoji) => {
                            const isSelected = msg.reactions?.[username] === emoji;
                            return (
                              <motion.button
                                key={emoji}
                                whileHover={{ scale: 1.35, y: -4 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleReaction(msg, emoji);
                                  setReactionMenuMessageId(null);
                                }}
                                className={`text-xl sm:text-2xl p-1 rounded-full transition-all relative ${
                                  isSelected ? "bg-[#d4af37]/25 ring-1 ring-[#d4af37]/50 scale-110" : "hover:bg-white/10"
                                }`}
                                title={emoji}
                              >
                                {emoji}
                              </motion.button>
                            );
                          })}
                          
                          {/* Plus (+) button to open custom emoji picker */}
                          <motion.button
                            whileHover={{ scale: 1.25, y: -2 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomReactionMsg(msg);
                              setReactionMenuMessageId(null);
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-[#d4af37]/30 text-white/80 hover:text-[#d4af37] flex items-center justify-center transition-all ml-0.5"
                            title="Custom reaction"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Media Attachment - Rendered OUTSIDE the text bubble */}
                    {msg.attachmentUrl && (
                      <div 
                        className={`mb-2 w-full relative select-none ${
                          msg.attachmentType === 'sticker' 
                            ? '' 
                            : `rounded-2xl overflow-hidden shadow-lg ${isMe ? 'shadow-[#d4af37]/5' : 'shadow-black/50'} cursor-pointer hover:ring-1 ring-white/10`
                        }`}
                        style={{ userSelect: "none", WebkitUserSelect: "none" }}
                        onPointerDown={(e) => {
                          handlePressStart(msg.id, e.clientX, e.clientY);
                        }}
                        onPointerMove={(e) => {
                          handlePressMove(e.clientX, e.clientY);
                        }}
                        onPointerUp={handlePressEnd}
                        onPointerCancel={handlePressEnd}
                        onContextMenu={(e) => {
                          if (didTrigger2sHoldRef.current) e.preventDefault();
                        }}
                        onClick={(e) => {
                          if (didTrigger2sHoldRef.current) {
                            didTrigger2sHoldRef.current = false;
                            e.stopPropagation();
                            return;
                          }
                          if (msg.attachmentType !== 'image') {
                            setActiveMessageId(isActive ? null : msg.id);
                          }
                        }}
                      >
                        {msg.attachmentType === "video" ? (
                          <video 
                            src={msg.attachmentUrl} 
                            controls 
                            className="w-full h-auto max-h-[300px] object-cover"
                          />
                        ) : msg.attachmentType === "audio" ? (
                          <VoiceMessagePlayer src={msg.attachmentUrl} isMe={isMe} />
                        ) : msg.attachmentType === "sticker" ? (
                          <div className="w-40 h-40 overflow-hidden flex items-center justify-center p-1 bg-transparent">
                            <img 
                              src={msg.attachmentUrl} 
                              alt="Sticker" 
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div 
                            className="relative group cursor-pointer" 
                            onClick={(e) => handleImageClick(e, msg.attachmentUrl!)}
                            onTouchStart={() => startLongPress(msg.id)}
                            onTouchEnd={cancelLongPress}
                            onTouchMove={cancelLongPress}
                          >
                            <img 
                              src={msg.attachmentUrl} 
                              alt="Attachment" 
                              className="w-full h-auto max-h-[300px] object-cover hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                            {isMe && (
                              <div 
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMessageId(isActive ? null : msg.id);
                                }}
                              >
                                <div className="bg-black/60 rounded-full p-1.5 backdrop-blur-sm border border-white/10 hover:bg-black/80 transition-colors shadow-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Message - Rendered INSIDE the text bubble */}
                    {msg.text && (() => {
                      const { cleanText, linkIds } = parseIgLinks(msg.text);
                      const isEmojiOnly = (() => {
                        if (!cleanText) return false;
                        const noWs = cleanText.replace(/\s/g, '');
                        if (!noWs) return false;
                        return /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji_Modifier_Base}|\p{Emoji_Modifier}|\u200d|\uFE0F|[0-9#*]\uFE0F\u20E3)+$/u.test(noWs);
                      })();

                      return (
                        <div
                          className={`w-full font-[family-name:var(--font-lora)] transition-all select-none relative cursor-pointer ${
                            isEmojiOnly 
                              ? "text-5xl leading-tight bg-transparent shadow-none border-none py-1 px-1" 
                              : `px-5 py-3 rounded-2xl text-base shadow-lg ${
                                  isMe
                                    ? "bg-[#d4af37]/25 text-[#f5edd6] rounded-br-sm border border-[#d4af37]/40 shadow-[#d4af37]/5 hover:bg-[#d4af37]/30"
                                    : "bg-black/80 text-[#f5edd6] rounded-bl-sm border border-white/10 shadow-black/50 hover:bg-black/70"
                                }`
                          }`}
                          style={{ wordBreak: "break-word", userSelect: "none", WebkitUserSelect: "none" }}
                          onPointerDown={(e) => {
                            if (isEditing) return;
                            handlePressStart(msg.id, e.clientX, e.clientY);
                          }}
                          onPointerMove={(e) => {
                            handlePressMove(e.clientX, e.clientY);
                          }}
                          onPointerUp={handlePressEnd}
                          onPointerCancel={handlePressEnd}
                          onContextMenu={(e) => {
                            if (didTrigger2sHoldRef.current) {
                              e.preventDefault();
                            }
                          }}
                          onClick={(e) => {
                            if (didTrigger2sHoldRef.current) {
                              didTrigger2sHoldRef.current = false;
                              e.stopPropagation();
                              return;
                            }
                            if (!isEditing) {
                              setReactionMenuMessageId(null);
                              setActiveMessageId(isActive ? null : msg.id);
                            }
                          }}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-2 min-w-[200px]" onClick={e => e.stopPropagation()}>
                              <textarea
                                value={editMessageText}
                                onChange={(e) => setEditMessageText(e.target.value)}
                                className="w-full bg-black/40 border border-[#d4af37]/40 rounded-lg p-2 text-sm text-[#f5edd6] focus:outline-none focus:border-[#d4af37] resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-1">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCancelEdit} className="px-3 py-1 text-xs text-[#8a7a6a] hover:text-white transition-colors">Cancel</motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSaveEdit(msg.id)} disabled={!editMessageText.trim()} className="px-3 py-1 text-xs bg-[#d4af37]/30 text-[#d4af37] border border-[#d4af37]/40 rounded-md hover:bg-[#d4af37]/50 transition-colors disabled:opacity-50">Save</motion.button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 w-full">
                              {cleanText && (
                                <div className="break-words">
                                  {cleanText}
                                  {msg.isEdited && <span className={`italic font-sans ${isEmojiOnly ? 'text-sm opacity-60 ml-2 block text-right' : 'text-[10px] opacity-40 ml-2'}`}>(edited)</span>}
                                </div>
                              )}
                              {linkIds.map((id, i) => (
                                <IgEmbed key={i} reelId={id} msgId={msg.id} setActiveMessageId={setActiveMessageId} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Instagram Reactions Badge */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (() => {
                      const reactionMap: Record<string, string[]> = {};
                      for (const [user, emoji] of Object.entries(msg.reactions)) {
                        if (!reactionMap[emoji]) reactionMap[emoji] = [];
                        reactionMap[emoji].push(user);
                      }
                      const entries = Object.entries(reactionMap);
                      const myReaction = msg.reactions[username];
                      const totalCount = Object.keys(msg.reactions).length;

                      return (
                        <div className={`reaction-interactive relative ${isMe ? "self-end mr-1" : "self-start ml-1"} -mt-2.5 z-10`}>
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReactionDetailsMsgId(reactionDetailsMsgId === msg.id ? null : msg.id);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs shadow-md backdrop-blur-md transition-all select-none border ${
                              myReaction
                                ? "bg-[#2d1b24]/95 border-[#d4af37]/60 text-[#f5edd6] shadow-[#d4af37]/10 ring-1 ring-[#d4af37]/20"
                                : "bg-[#141213]/90 border-white/15 text-white/80 hover:border-white/30"
                            }`}
                            title={entries.map(([emoji, users]) => `${emoji} ${users.join(", ")}`).join("\n")}
                          >
                            <div className="flex items-center -space-x-0.5">
                              {entries.slice(0, 3).map(([emoji]) => (
                                <span key={emoji} className="text-sm leading-none drop-shadow-sm">{emoji}</span>
                              ))}
                            </div>
                            {totalCount > 1 && (
                              <span className="text-[11px] font-semibold text-[#d4af37] font-mono leading-none">
                                {totalCount}
                              </span>
                            )}
                          </motion.button>

                          {/* Reaction Details Popover */}
                          <AnimatePresence>
                            {reactionDetailsMsgId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85, y: 4 }}
                                className={`absolute bottom-full mb-2 ${isMe ? "right-0" : "left-0"} z-30 flex flex-col gap-1.5 bg-[#1c1518]/95 border border-[#d4af37]/40 p-2.5 rounded-xl shadow-2xl backdrop-blur-xl min-w-[140px] text-xs`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-[10px] text-[#8a7a6a] uppercase tracking-wider font-semibold font-[family-name:var(--font-playfair)] border-b border-white/10 pb-1">
                                  Reactions
                                </div>
                                {Object.entries(msg.reactions).map(([u, emo]) => (
                                  <div key={u} className="flex items-center justify-between gap-3 text-white/90">
                                    <span className="truncate max-w-[90px] font-sans">
                                      {u === username ? <span className="text-[#d4af37] font-bold">You</span> : u}
                                    </span>
                                    <span className="text-base">{emo}</span>
                                  </div>
                                ))}
                                {myReaction && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleReaction(msg, myReaction);
                                      setReactionDetailsMsgId(null);
                                    }}
                                    className="mt-1 text-[11px] text-red-400 hover:text-red-300 transition-colors text-left font-sans flex items-center gap-1 border-t border-white/10 pt-1"
                                  >
                                    <span>✕ Remove reaction</span>
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Menu */}
                  <AnimatePresence>
                    {isActive && !isEditing && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className={`flex gap-2 overflow-hidden ${isMe ? "justify-end mr-1" : "justify-start ml-2"}`}
                      >
                        {isMe && msg.text && (
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                            onClick={() => handleEditMessage(msg)}
                            className="text-xs bg-white/20 hover:bg-white/30 text-white/90 hover:text-white px-3 py-1.5 rounded-full border border-white/20 transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            Edit
                          </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => { setReplyingTo(msg); setActiveMessageId(null); }}
                          className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 px-3 py-1.5 rounded-full border border-blue-500/30 transition-colors flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                          Reply
                        </motion.button>
                        {isMe && (
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-3 py-1.5 rounded-full border border-red-500/30 transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete
                          </motion.button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          }}
        />
        )}
        
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={() => virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' })}
              className="absolute bottom-6 right-6 lg:right-12 bg-black/80 border border-[#d4af37]/30 text-[#d4af37] p-3 rounded-full shadow-lg z-50 hover:bg-[#d4af37]/20 transition-colors backdrop-blur-md"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.main>



      <motion.footer initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex-none p-4 sm:p-6 border-t border-[#d4af37]/20 bg-black/40 backdrop-blur-md z-10">
        <div className="max-w-3xl mx-auto relative">
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mb-3 px-4 py-2 bg-black/60 border border-[#d4af37]/30 rounded-xl relative overflow-hidden flex items-center justify-between shadow-lg"
              >
                <div className="flex flex-col truncate pr-4">
                  <span className="text-xs text-[#d4af37] font-bold mb-0.5 font-[family-name:var(--font-playfair)]">Replying to {replyingTo.sender}</span>
                  <span className="text-xs text-white/60 truncate">{replyingTo.text || (replyingTo.attachmentType ? `[${replyingTo.attachmentType}]` : "...")}</span>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1.5 flex-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          {isUploadingFile && (
            <div className="absolute -top-10 left-4 text-xs text-[#d4af37] animate-pulse bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-[#d4af37]/20">
              Processing...
            </div>
          )}
          
          {isRecording ? (
            <motion.div layoutId="recording-box"
              className="flex items-center justify-between bg-black/60 border border-red-500/50 rounded-full px-6 py-2 h-12"
            >
              <div className="flex items-center gap-3 text-red-400">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="font-mono text-sm tracking-widest">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                  type="button" 
                  onClick={() => stopRecording(true)} 
                  className="px-4 py-1.5 text-xs text-white/50 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                  type="button" 
                  onClick={() => stopRecording(false)} 
                  className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 border border-red-500/30 transition-colors text-xs tracking-widest uppercase"
                >
                  Send
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3 h-12 relative" ref={pickerRef}>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-[60px] left-14 z-[60]">
                    <EmojiPicker theme={Theme.DARK} onEmojiClick={(emojiData) => setNewMessage(prev => prev + emojiData.emoji)} />
                  </motion.div>
                )}
                {showStickerPicker && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-[60px] right-14 w-80 bg-[#1a1a1a] border border-[#d4af37]/30 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col max-h-[400px]">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm">Stickers</h3>
                      <button type="button" onClick={() => stickerInputRef.current?.click()} className="text-xs bg-[#d4af37]/20 text-[#d4af37] px-2 py-1 rounded hover:bg-[#d4af37]/30 transition-colors">
                        {isUploadingSticker ? "Uploading..." : "+ Add"}
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4af37 transparent' }}>
                      <div className="grid grid-cols-3 gap-3 auto-rows-max">
                        {customStickers.length === 0 && !isUploadingSticker && (
                          <div className="col-span-3 text-center text-[#8a7a6a] text-xs py-4">No stickers yet. Add one!</div>
                        )}
                        {customStickers.map((sticker) => (
                          <div key={sticker.id} className="relative group w-full pt-[100%] rounded-lg overflow-hidden bg-black/40 border border-white/5">
                            <button type="button" onClick={() => {
                              const payload = { sender: username, createdAt: serverTimestamp(), attachmentUrl: sticker.url, attachmentType: 'sticker' };
                              addDoc(collection(db, "messages"), payload);
                              setShowStickerPicker(false);
                              virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
                            }} className="absolute inset-0 w-full h-full hover:scale-105 transition-transform flex">
                              <img src={sticker.url} alt="sticker" className="w-full h-full object-cover block" />
                            </button>
                            {(sticker.uploadedBy === username || username === 'firebase') && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteSticker(sticker.id); }} className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-red-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <input type="file" accept="image/jpeg, image/png, image/gif, image/webp" ref={stickerInputRef} className="hidden" onChange={handleStickerUpload} />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="w-12 h-12 flex-none flex items-center justify-center bg-black/60 text-[#8a7a6a] rounded-full border border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Attach Media"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </motion.button>
              
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                type="button"
                onClick={startRecording}
                disabled={isUploadingFile}
                className="w-12 h-12 flex-none flex items-center justify-center bg-black/60 text-[#8a7a6a] rounded-full border border-white/10 hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Record Voice Message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </motion.button>

              <div className="flex-1 relative flex items-center min-w-0">
                  <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} type="button" className="absolute left-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Emoji">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </button>

                  <motion.input layoutId="recording-box" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 2px rgba(212,175,55,0.3)" }} type="text" value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Whisper something..."
                    className="w-full bg-black/60 border border-[#d4af37]/30 rounded-full pl-12 pr-12 py-[11px] text-base text-[#f5edd6] focus:outline-none focus:border-[#d4af37]/60 shadow-inner"
                  />

                  <button onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }} type="button" className="absolute right-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Stickers">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.5 3H8.5C5.462 3 3 5.462 3 8.5v7C3 18.538 5.462 21 8.5 21h7c3.038 0 5.5-2.462 5.5-5.5v-7C21 5.462 18.538 3 15.5 3z" />
                      <path d="M15 21l6-6" />
                      <path d="M15 21v-4.5C15 15.672 15.672 15 16.5 15H21" />
                      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
                      <path d="M9.5 14c1 1.5 3 1.5 4 0" />
                    </svg>
                  </button>
                </div>
              
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!newMessage.trim()}
                className="w-12 h-12 flex-none flex items-center justify-center bg-[#d4af37]/20 text-[#d4af37] rounded-full border border-[#d4af37]/40 hover:bg-[#d4af37]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-[-2px] mt-[2px]">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </motion.button>
            </form>
          )}
        </div>
      </motion.footer>

      {/* Fullscreen Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
          >
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </motion.button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={selectedImage}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain rounded-sm shadow-2xl"
              onClick={(e: React.MouseEvent) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Emoji Reaction Modal (Pick ANY Emoji) */}
      <AnimatePresence>
        {customReactionMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCustomReactionMsg(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-[#181315] border border-[#d4af37]/40 rounded-2xl shadow-2xl p-4 max-w-sm w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-white/10 px-1">
                <span className="text-xs font-[family-name:var(--font-playfair)] tracking-widest text-[#d4af37] uppercase font-bold">
                  React to Message
                </span>
                <button
                  onClick={() => setCustomReactionMsg(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="w-full flex justify-center overflow-hidden rounded-xl">
                <EmojiPicker
                  theme={Theme.DARK}
                  lazyLoadEmojis={true}
                  searchPlaceHolder="Search any emoji..."
                  width="100%"
                  height={380}
                  onEmojiClick={(emojiData) => {
                    handleToggleReaction(customReactionMsg, emojiData.emoji);
                    setCustomReactionMsg(null);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Audio element for remote WebRTC voice playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Floating Calling Indicator for Caller */}
      <AnimatePresence>
        {callState === "calling" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3.5 bg-[#181315]/95 backdrop-blur-xl border border-[#d4af37]/40 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(212,175,55,0.2)] px-5 py-2.5 rounded-full select-none"
          >
            <div className="relative flex items-center justify-center w-7 h-7">
              <span className="absolute inset-0 rounded-full bg-[#d4af37]/30 animate-ping" />
              <div className="w-7 h-7 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37]">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-[#f5edd6] font-[family-name:var(--font-playfair)] font-semibold leading-tight">
                Calling...
              </span>
              <span className="text-[10px] text-[#d4af37] font-mono leading-tight">
                Waiting for partner to join
              </span>
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-1" />

            {/* Cancel Call Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleEndCall}
              className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 cursor-pointer transition-colors"
              title="Cancel Call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="22" y1="2" x2="2" y2="22" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Incoming Call Banner for Receiver */}
      <AnimatePresence>
        {showIncomingBanner && isOtherUserCalling && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3.5 bg-[#181315]/95 backdrop-blur-xl border border-emerald-500/50 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(52,211,153,0.3)] px-4 sm:px-5 py-2.5 rounded-full select-none"
          >
            <div className="relative flex items-center justify-center w-7 h-7">
              <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-[#f5edd6] font-[family-name:var(--font-playfair)] font-semibold leading-tight">
                {callSession?.caller || "Partner"} is calling...
              </span>
              <span className="text-[10px] text-emerald-400 font-mono leading-tight">
                Click Join or tap the glowing icon
              </span>
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-1" />

            {/* Join Button */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleAcceptCall}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Join</span>
            </motion.button>

            {/* Silence / Dismiss Banner Button (keeps header icon glowing) */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setShowIncomingBanner(false);
                callSounds.stopAll();
              }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-xs cursor-pointer transition-colors"
              title="Silence ringtone (icon stays glowing)"
            >
              ✕
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Active Call Bar (Connected) */}
      <AnimatePresence>
        {callState === "connected" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-20 right-4 sm:right-8 z-[110] flex items-center gap-3 bg-[#181315]/95 backdrop-blur-xl border border-[#d4af37]/40 shadow-[0_15px_40px_rgba(0,0,0,0.85)] px-4 py-2.5 rounded-full select-none"
          >
            {/* Pulsing indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[11px] text-[#f5edd6] font-[family-name:var(--font-playfair)] font-semibold leading-tight">
                  {callSession?.caller === username ? "Voice Call" : callSession?.caller || "Voice Call"}
                </span>
                <span className="text-[10px] text-[#d4af37] font-mono leading-tight">
                  {formatCallDuration(callDuration)}
                </span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-1" />

            {/* Mute Microphone Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleCallMute}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
                isCallMuted
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-white/10 text-white hover:bg-white/20 border-white/10"
              }`}
              title={isCallMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isCallMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </motion.button>

            {/* End Call Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleEndCall}
              className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 cursor-pointer transition-colors"
              title="End Call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="22" y1="2" x2="2" y2="22" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
