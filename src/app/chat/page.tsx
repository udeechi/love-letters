"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";

interface Message {
  id: string;
  text?: string;
  sender: string;
  createdAt: any;
  attachmentUrl?: string;
  attachmentType?: "image" | "video" | "audio";
}

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
      
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 flex-none flex items-center justify-center rounded-full ${isMe ? 'bg-[#d4af37] text-black hover:bg-[#ebd488]' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'} transition-colors`}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M5 3l14 9-14 9V3z"></path></svg>
        )}
      </button>

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

export default function ChatPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "popup" | "reg_user" | "reg_pass">("login");

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [globalBackground, setGlobalBackground] = useState<string | null>(null);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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

    return () => {
      unsubscribeMessages();
      unsubscribeBg();
    };
  }, [isLoggedIn]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const text = newMessage;
    setNewMessage("");

    try {
      await addDoc(collection(db, "messages"), {
        text: text,
        sender: username,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25MB limit.");
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const uploadData = await uploadToCloudinary(file);
      if (uploadData) {
        const isVideo = uploadData.resource_type === "video";
        await addDoc(collection(db, "messages"), {
          text: "", // Optional text, maybe future caption support
          attachmentUrl: uploadData.secure_url,
          attachmentType: isVideo ? "video" : "image",
          sender: username,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });

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
        await addDoc(collection(db, "messages"), {
          text: "", 
          attachmentUrl: uploadData.secure_url,
          attachmentType: "audio",
          sender: username,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Audio upload error:", error);
      alert("Failed to upload voice message.");
    } finally {
      setIsUploadingFile(false);
    }
  };


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
        <Link 
          href="/" 
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-full text-white/50 hover:text-white/90 hover:bg-white/[0.08] hover:border-white/20 transition-all backdrop-blur-md shadow-lg shadow-black/20"
        >
          <span>&larr;</span>
          <span className="text-xs uppercase tracking-widest font-mono">Return to Notebook</span>
        </Link>

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
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 px-4 py-3 text-center text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#d4af37]/50 transition-colors mb-4"
                  placeholder="Your alias..."
                  required
                />
                <input
                  type="password"
                  value={password}
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

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-4 mt-2 bg-gradient-to-r from-[#d4af37]/20 to-[#a82d6a]/20 text-white/90 rounded-2xl border border-white/10 font-[family-name:var(--font-playfair)] tracking-widest uppercase text-xs hover:from-[#d4af37]/30 hover:to-[#a82d6a]/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all disabled:opacity-50"
                >
                  {isAuthenticating ? "Entering..." : "Enter"}
                </button>
              </form>

              <div className="mt-8 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("popup");
                    setAuthError("");
                  }}
                  className="text-white/40 text-xs hover:text-[#d4af37] transition-colors"
                >
                  Don't have an account?
                </button>
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
                <button
                  onClick={() => setAuthMode("reg_user")}
                  className="w-full py-3.5 bg-black/40 text-[#f5edd6] rounded-xl border border-white/5 hover:border-[#d4af37]/50 hover:bg-black/60 transition-all font-[family-name:var(--font-lora)] text-sm"
                >
                  Sadly, I don't have one 🥹
                </button>
                <button
                  onClick={() => setAuthMode("login")}
                  className="w-full py-3.5 bg-gradient-to-r from-[#d4af37]/10 to-[#a82d6a]/10 text-white/90 rounded-xl border border-white/10 hover:from-[#d4af37]/20 hover:to-[#a82d6a]/20 transition-all font-[family-name:var(--font-lora)] text-sm"
                >
                  Naur, I have one! 💅
                </button>
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
                <button
                  type="submit"
                  disabled={!username.trim()}
                  className="px-8 py-3 bg-white/[0.05] border border-white/10 rounded-full text-white/80 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-0"
                >
                  Next &rarr;
                </button>
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

                <button
                  type="submit"
                  disabled={!password.trim() || isAuthenticating}
                  className="px-8 py-4 bg-gradient-to-r from-[#d4af37]/20 to-[#a82d6a]/20 border border-white/10 rounded-full text-white/90 hover:from-[#d4af37]/40 hover:to-[#a82d6a]/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all disabled:opacity-30 uppercase tracking-widest text-xs font-[family-name:var(--font-playfair)]"
                >
                  {isAuthenticating ? "Sealing identity..." : "Seal my identity"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setAuthMode("reg_user")}
                className="block mx-auto mt-6 text-white/30 text-xs hover:text-[#d4af37] transition-colors"
              >
                &larr; Back
              </button>
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
      <header className="flex-none p-4 border-b border-[#d4af37]/20 bg-black/40 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[#8a7a6a] hover:text-[#d4af37] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </Link>
          <h1 className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-xl tracking-widest">
            Whispers
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            ref={bgInputRef}
            className="hidden"
            onChange={handleBackgroundUpload}
          />
          <button
            onClick={() => bgInputRef.current?.click()}
            disabled={isUploadingGlobal}
            className="text-xs text-[#d4af37]/80 border border-[#d4af37]/30 px-3 py-1.5 rounded-sm hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-colors uppercase tracking-widest font-[family-name:var(--font-playfair)] flex items-center gap-2"
          >
            {isUploadingGlobal ? (
              <span className="animate-pulse">Uploading...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span className="hidden sm:inline">Set Wallpaper</span>
              </>
            )}
          </button>

          {username === "firebase" && (
            <button
              onClick={handleClearChat}
              className="text-xs text-red-500/80 border border-red-500/30 px-3 py-1.5 rounded-sm hover:bg-red-500/10 hover:text-red-400 transition-colors uppercase tracking-widest font-[family-name:var(--font-playfair)]"
            >
              Clear History
            </button>
          )}
          <span className="text-[#8a7a6a] text-xs font-mono uppercase tracking-widest hidden sm:inline">
            {username}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-[#a82d6a] border border-[#a82d6a]/40 px-3 py-1.5 rounded-sm hover:bg-[#a82d6a]/10 transition-colors uppercase tracking-widest font-[family-name:var(--font-playfair)]"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-[#8a7a6a]/60 font-[family-name:var(--font-lora)] text-lg italic mt-20">
              The room is silent. Start a whisper...
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === username;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-[#8a7a6a]/70 uppercase tracking-widest mb-1 ml-2 mr-2 font-[family-name:var(--font-playfair)]">
                    {msg.sender}
                  </span>
                  
                  {/* Media Attachment - Rendered OUTSIDE the text bubble */}
                  {msg.attachmentUrl && (
                    <div className={`mb-2 max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden shadow-lg ${isMe ? 'shadow-[#d4af37]/5' : 'shadow-black/50'}`}>
                      {msg.attachmentType === "video" ? (
                        <video 
                          src={msg.attachmentUrl} 
                          controls 
                          className="w-full h-auto max-h-[300px] object-cover"
                        />
                      ) : msg.attachmentType === "audio" ? (
                        <VoiceMessagePlayer src={msg.attachmentUrl} isMe={isMe} />
                      ) : (
                        <img 
                          src={msg.attachmentUrl} 
                          alt="Attachment" 
                          className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                          onClick={() => setSelectedImage(msg.attachmentUrl!)}
                        />
                      )}
                    </div>
                  )}

                  {/* Text Message - Rendered INSIDE the text bubble */}
                  {msg.text && (
                    <div
                      className={`px-5 py-3 rounded-2xl max-w-[85%] sm:max-w-[70%] font-[family-name:var(--font-lora)] text-base shadow-lg ${
                        isMe
                          ? "bg-[#d4af37]/15 text-[#f5edd6] rounded-br-sm border border-[#d4af37]/30 shadow-[#d4af37]/5"
                          : "bg-black/60 text-[#e8dcc8] rounded-bl-sm border border-white/5 shadow-black/50"
                      }`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input */}
      <footer className="flex-none p-4 sm:p-6 border-t border-[#d4af37]/20 bg-black/40 backdrop-blur-md z-10">
        <div className="max-w-3xl mx-auto relative">
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
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-black/60 border border-red-500/50 rounded-full px-6 py-2 h-12"
            >
              <div className="flex items-center gap-3 text-red-400">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="font-mono text-sm tracking-widest">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => stopRecording(true)} 
                  className="px-4 py-1.5 text-xs text-white/50 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => stopRecording(false)} 
                  className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 border border-red-500/30 transition-colors text-xs tracking-widest uppercase"
                >
                  Send
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3 h-12">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="w-12 h-12 flex-none flex items-center justify-center bg-black/60 text-[#8a7a6a] rounded-full border border-white/10 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Attach Media"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              
              <button
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
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Whisper something..."
                className="flex-1 min-w-0 bg-black/60 border border-[#d4af37]/30 rounded-full px-6 text-base text-[#f5edd6] focus:outline-none focus:border-[#d4af37]/60 shadow-inner"
              />
              
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="w-12 h-12 flex-none flex items-center justify-center bg-[#d4af37]/20 text-[#d4af37] rounded-full border border-[#d4af37]/40 hover:bg-[#d4af37]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-[-2px] mt-[2px]">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          )}
        </div>
      </footer>

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
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
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
    </div>
  );
}
