"use client";

import { useRef, useEffect } from "react";
import { animate } from "animejs";

interface BookCoverProps {
  isOpen: boolean;
}

export default function BookCover({ isOpen }: BookCoverProps) {
  const coverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coverRef.current) return;

    const coverAnim = animate(coverRef.current, {
      rotateY: isOpen ? -180 : 0,
      translateZ: isOpen ? 2 : 0,
      duration: 1400,
      ease: "easeInOutQuart",
    });

    return () => { coverAnim.cancel(); };
  }, [isOpen]);

  const coverThickness = 6;

  return (
    <div
      className="absolute inset-0"
      style={{
        transformStyle: "preserve-3d",
        zIndex: isOpen ? 0 : 40,
      }}
    >
      <div
        ref={coverRef}
        className="absolute inset-0 w-1/2"
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "right center",
          left: 0,
        }}
      >
        {/* FRONT FACE */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #2d0a1b 0%, #3d1528 40%, #4a1028 100%)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: `translateZ(${coverThickness / 2}px)`,
            borderRadius: "8px 0 0 8px",
            boxShadow: isOpen ? "none" : "10px 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(212,175,55,0.03) 3px, rgba(212,175,55,0.03) 4px)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)" }} />
          <div className="absolute inset-0 pointer-events-none">
            <div className="corner-decoration corner-tl" />
            <div className="corner-decoration corner-bl" />
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
          <div className="absolute top-0 bottom-0 right-0 w-5 pointer-events-none" style={{ background: "linear-gradient(to left, rgba(0,0,0,0.5), transparent)" }} />
        </div>

        {/* BACK FACE (Inside Cover) */}
        <div
          className="absolute inset-0"
          style={{
            background: "#2d0a1b",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: `rotateY(180deg) translateZ(${coverThickness / 2}px)`,
            borderRadius: "0 8px 8px 0",
          }}
        >
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] pointer-events-none" />
           {/* Inner edge shadow */}
           <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
        </div>
        
        {/* RIGHT EDGE (Thickness) */}
        <div
          className="absolute top-0 bottom-0 left-0"
          style={{
            width: `${coverThickness}px`,
            background: "#1a0510",
            transform: `rotateY(-90deg) translateZ(${coverThickness / 2}px)`,
            transformOrigin: "center",
          }}
        />
      </div>
    </div>
  );
}
