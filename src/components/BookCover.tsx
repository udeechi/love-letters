"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface BookCoverProps {
  side: "left" | "right";
  isOpen: boolean;
  children?: ReactNode;
}

export default function BookCover({ side, isOpen, children }: BookCoverProps) {
  const isLeft = side === "left";

  const openAngle = isLeft ? -165 : 165;

  return (
    <motion.div
      className="absolute top-0 bottom-0 w-1/2"
      style={{
        [isLeft ? "left" : "right"]: 0,
        transformOrigin: isLeft ? "right center" : "left center",
        transformStyle: "preserve-3d",
        zIndex: isOpen ? 5 : 15,
      }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isOpen ? openAngle : 0 }}
      transition={{
        type: "spring",
        stiffness: 60,
        damping: 16,
        mass: 1,
        restDelta: 0.001,
      }}
    >
      {/* Front face */}
      <div
        className="absolute inset-0 rounded-sm overflow-hidden"
        style={{
          background: isLeft
            ? "linear-gradient(135deg, #3d1528 0%, #2d0a1b 40%, #1a0d12 100%)"
            : "linear-gradient(135deg, #2d0a1b 0%, #3d1528 60%, #4a1028 100%)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="corner-decoration corner-tl" />
          <div className="corner-decoration corner-tr" />
          <div className="corner-decoration corner-bl" />
          <div className="corner-decoration corner-br" />
        </div>

        {/* Cover texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(212, 175, 55, 0.03) 3px,
              rgba(212, 175, 55, 0.03) 4px
            )`,
            zIndex: 1,
          }}
        />

        {/* Light reflection */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.08) 0%,
              transparent 40%,
              transparent 60%,
              rgba(0, 0, 0, 0.15) 100%
            )`,
            zIndex: 2,
          }}
        />

        {isLeft && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
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
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {children}
          </div>
        )}

        {/* Spine edge shadow */}
        <div
          className="absolute top-0 bottom-0 w-4 pointer-events-none"
          style={{
            [isLeft ? "right" : "left"]: 0,
            background: isLeft
              ? "linear-gradient(to left, rgba(0,0,0,0.3), transparent)"
              : "linear-gradient(to right, rgba(0,0,0,0.3), transparent)",
            zIndex: 3,
          }}
        />
      </div>

      {/* Back face (inside of cover) */}
      <div
        className="absolute inset-0 rounded-sm overflow-hidden"
        style={{
          background: isLeft
            ? "linear-gradient(135deg, #f5edd6 0%, #ede0bb 100%)"
            : "linear-gradient(135deg, #ede0bb 0%, #f5edd6 100%)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        }}
      >
        {/* Subtle paper texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `repeating-linear-gradient(
              transparent,
              transparent 31px,
              rgba(168, 138, 100, 0.15) 31px,
              rgba(168, 138, 100, 0.15) 32px
            )`,
          }}
        />

        {/* Inner spine edge */}
        <div
          className="absolute top-0 bottom-0 w-6 pointer-events-none"
          style={{
            [isLeft ? "right" : "left"]: 0,
            background: isLeft
              ? "linear-gradient(to left, rgba(0,0,0,0.12), transparent)"
              : "linear-gradient(to right, rgba(0,0,0,0.12), transparent)",
          }}
        />
      </div>
    </motion.div>
  );
}
