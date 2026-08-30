"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LockScreenProps {
  onUnlock: (password: string) => Promise<boolean>;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowInput(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsUnlocking(true);
    const success = await onUnlock(password);

    if (!success) {
      setIsShaking(true);
      setIsUnlocking(false);
      setPassword("");
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0d12]/95 via-[#2d0a1b]/90 to-[#0d0a0f]/95 backdrop-blur-sm" />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
      >
        {/* Title */}
        <motion.h1
          className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-4xl md:text-5xl tracking-[0.15em] mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
        >
          Love Letters
        </motion.h1>

        <motion.div
          className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mb-10"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        />

        {/* Keyhole */}
        <motion.div
          className={`relative mb-10 ${isShaking ? "shake" : ""}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.6,
            type: "spring",
            stiffness: 100,
            damping: 15,
          }}
        >
          <div className="w-20 h-20 rounded-full border-2 border-[#d4af37]/40 flex items-center justify-center bg-[#1a0d12]/60 keyhole-pulse">
            <div className="relative">
              <div className="w-5 h-5 rounded-full bg-[#d4af37]/80 shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-3 h-6 bg-[#d4af37]/80 rounded-b-sm shadow-[0_0_10px_rgba(212,175,55,0.3)]" />
            </div>
          </div>
        </motion.div>

        {/* Password Input */}
        <AnimatePresence>
          {showInput && (
            <motion.form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the password..."
                  className="w-64 px-6 py-3 bg-[#1a0d12]/80 border border-[#d4af37]/30 rounded-sm text-[#e8dcc8] text-center font-[family-name:var(--font-lora)] tracking-wider placeholder:text-[#d4af37]/30 focus:outline-none focus:border-[#d4af37]/60 focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all duration-300"
                  disabled={isUnlocking}
                />
                <div className="absolute inset-0 rounded-sm border border-[#d4af37]/10 pointer-events-none" />
              </div>

              <motion.button
                type="submit"
                disabled={!password.trim() || isUnlocking}
                className="px-8 py-2 bg-transparent border border-[#d4af37]/40 text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm tracking-[0.2em] uppercase hover:bg-[#d4af37]/10 hover:border-[#d4af37]/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isUnlocking ? "Unlocking..." : "Unlock"}
              </motion.button>

              <AnimatePresence>
                {isShaking && (
                  <motion.p
                    className="text-[#a82d6a] text-sm font-[family-name:var(--font-lora)]"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Incorrect password. Try again.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Subtle hint */}
        <motion.p
          className="mt-8 text-[#d4af37]/20 text-xs tracking-[0.15em] font-[family-name:var(--font-lora)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          A notebook made with love
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
