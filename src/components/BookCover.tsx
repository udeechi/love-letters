"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface BookCoverProps {
  side: "left" | "right";
  isOpen: boolean;
  children?: ReactNode;
}

export default function BookCover({ side, isOpen, children }: BookCoverProps) {
  const isRight = side === "right";

  // Right cover (front): opens to the left (-180°), hinge at spine (left edge)
  // Left cover (back): opens to the right (180°), hinge at spine (right edge)
  const openAngle = isRight ? -180 : 180;

  return (
    <motion.div
      className="absolute top-0 bottom-0 w-1/2"
      style={{
        [isRight ? "right" : "left"]: 0,
        transformOrigin: isRight ? "left center" : "right center",
        transformStyle: "preserve-3d" as const,
        zIndex: isOpen ? (isRight ? 2 : 2) : 10,
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isOpen ? openAngle : 0 }}
      transition={{
        duration: 0.8,
        ease: [0.645, 0.045, 0.355, 1],
      }}
    >
      {/* Front face */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: isRight
            ? "linear-gradient(135deg, #2d0a1b 0%, #3d1528 60%, #4a1028 100%)"
            : "linear-gradient(135deg, #3d1528 0%, #2d0a1b 40%, #1a0d12 100%)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translateZ(0.5px)",
          borderRadius: isRight ? "2px 8px 8px 2px" : "8px 2px 2px 8px",
        }}
      >
        {/* Texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(212,175,55,0.03) 3px, rgba(212,175,55,0.03) 4px)`,
          }}
        />
        {/* Light reflection */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)`,
          }}
        />
        {/* Corner decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="corner-decoration corner-tl" />
          <div className="corner-decoration corner-tr" />
          <div className="corner-decoration corner-bl" />
          <div className="corner-decoration corner-br" />
        </div>
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {isRight ? (
            children
          ) : (
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
          )}
        </div>
        {/* Spine edge shadow */}
        <div
          className="absolute top-0 bottom-0 w-4 pointer-events-none"
          style={{
            [isRight ? "left" : "right"]: 0,
            background: isRight
              ? "linear-gradient(to right, rgba(0,0,0,0.4), transparent)"
              : "linear-gradient(to left, rgba(0,0,0,0.4), transparent)",
          }}
        />
      </div>

      {/* Back face (inside of cover) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f5edd6 0%, #ede0bb 100%)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg) translateZ(0.5px)",
          borderRadius: isRight ? "8px 2px 2px 8px" : "2px 8px 8px 2px",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `repeating-linear-gradient(transparent, transparent 31px, rgba(168,138,100,0.15) 31px, rgba(168,138,100,0.15) 32px)`,
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-6 pointer-events-none"
          style={{
            [isRight ? "right" : "left"]: 0,
            background: isRight
              ? "linear-gradient(to left, rgba(0,0,0,0.12), transparent)"
              : "linear-gradient(to right, rgba(0,0,0,0.12), transparent)",
          }}
        />
      </div>
    </motion.div>
  );
}
