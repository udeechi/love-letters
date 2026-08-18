"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface BookCoverProps {
  side: "left" | "right";
  isOpen: boolean;
  children?: ReactNode;
}

export default function BookCover({ side, isOpen, children }: BookCoverProps) {
  const isLeft = side === "left";

  return (
    <motion.div
      className="absolute top-0 bottom-0 w-1/2 book-cover"
      style={{
        [isLeft ? "left" : "right"]: 0,
        transformOrigin: isLeft ? "right center" : "left center",
        transformStyle: "preserve-3d",
      }}
      initial={{ rotateY: isLeft ? 0 : 0 }}
      animate={{ rotateY: isLeft ? (isOpen ? -160 : 0) : (isOpen ? 160 : 0) }}
      transition={{
        type: "spring",
        stiffness: 40,
        damping: 18,
        mass: 1.2,
        restDelta: 0.001,
      }}
    >
      <div
        className="absolute inset-0 rounded-sm overflow-hidden"
        style={{
          background: isLeft
            ? "linear-gradient(135deg, #3d1528 0%, #2d0a1b 40%, #1a0d12 100%)"
            : "linear-gradient(135deg, #2d0a1b 0%, #3d1528 60%, #4a1028 100%)",
          backfaceVisibility: "hidden",
          boxShadow: isLeft
            ? "inset -4px 0 12px rgba(0,0,0,0.4)"
            : "inset 4px 0 12px rgba(0,0,0,0.4)",
        }}
      >
        <div className="corner-decoration corner-tl" />
        <div className="corner-decoration corner-tr" />
        <div className="corner-decoration corner-bl" />
        <div className="corner-decoration corner-br" />

        {isLeft && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-[#d4af37] text-xs tracking-[0.4em] uppercase mb-4 opacity-60">
                Est. 2024
              </div>
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-4" />
              <div className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-lg tracking-widest opacity-80">
                Our Story
              </div>
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-4" />
            </div>
          </div>
        )}

        {!isLeft && (
          <div className="absolute inset-0 flex items-center justify-center">
            {children}
          </div>
        )}
      </div>
    </motion.div>
  );
}
