"use client";

import { motion } from "framer-motion";

interface BookCoverProps {
  isOpen: boolean;
}

export default function BookCover({ isOpen }: BookCoverProps) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        transformOrigin: "left center",
        transformStyle: "preserve-3d" as const,
        zIndex: isOpen ? 0 : 20,
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isOpen ? -180 : 0 }}
      transition={{
        duration: 1,
        ease: [0.645, 0.045, 0.355, 1],
      }}
    >
      {/* FRONT FACE - leather cover with title */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2d0a1b 0%, #3d1528 40%, #4a1028 100%)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translateZ(0.5px)",
          borderRadius: "8px",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(212,175,55,0.03) 3px, rgba(212,175,55,0.03) 4px)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="corner-decoration corner-tl" />
          <div className="corner-decoration corner-tr" />
          <div className="corner-decoration corner-bl" />
          <div className="corner-decoration corner-br" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-6" />
            <div className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-3xl tracking-[0.15em] opacity-90 mb-2">
              Love
            </div>
            <div className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-3xl tracking-[0.15em] opacity-90">
              Letters
            </div>
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-6" />
          </div>
        </div>
        <div
          className="absolute top-0 bottom-0 left-0 w-5 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
          }}
        />
      </div>

      {/* BACK FACE - transparent, pages sit on top of this */}
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg) translateZ(0.5px)",
        }}
      />
    </motion.div>
  );
}
