"use client";

import { useRef, useEffect } from "react";
import { animate } from "animejs";

interface BookCoverProps {
  isOpen: boolean;
}

export default function BookCover({ isOpen }: BookCoverProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!frontRef.current || !backRef.current) return;

    const front = animate(frontRef.current, {
      rotateY: isOpen ? -180 : 0,
      duration: 1200,
      ease: "inOutCubic",
    });

    const back = animate(backRef.current, {
      rotateY: isOpen ? 0 : 180,
      duration: 1200,
      ease: "inOutCubic",
    });

    return () => {
      front.cancel();
      back.cancel();
    };
  }, [isOpen]);

  return (
    <div
      className="absolute inset-0"
      style={{
        transformStyle: "preserve-3d" as const,
        zIndex: isOpen ? 0 : 20,
      }}
    >
      {/* FRONT FACE */}
      <div
        ref={frontRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2d0a1b 0%, #3d1528 40%, #4a1028 100%)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transformOrigin: "left center",
          borderRadius: "8px",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(212,175,55,0.03) 3px, rgba(212,175,55,0.03) 4px)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)" }} />
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
        <div className="absolute top-0 bottom-0 left-0 w-5 pointer-events-none" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)" }} />
      </div>

      {/* BACK FACE - transparent, pages show through */}
      <div
        ref={backRef}
        className="absolute inset-0"
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transformOrigin: "left center",
          transform: "rotateY(180deg)",
        }}
      />
    </div>
  );
}
