"use client";

import { motion } from "framer-motion";

interface PageControlsProps {
  currentSpread: number;
  totalSpreads: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  isEditing: boolean;
  isSaving: boolean;
}

export default function PageControls({
  currentSpread,
  totalSpreads,
  totalPages,
  onPrev,
  onNext,
  onAddPage,
  onDeletePage,
  isEditing,
  isSaving,
}: PageControlsProps) {
  const leftNum = currentSpread * 2 + 1;
  const rightNum = currentSpread * 2 + 2;
  const hasRightPage = rightNum <= totalPages;

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2 bg-[#1a0d12]/80 border border-[#d4af37]/20 rounded-sm backdrop-blur-sm"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 25 }}
    >
      <button
        onClick={onPrev}
        disabled={currentSpread <= 0}
        className="w-7 h-7 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-playfair)] text-[#d4af37]/70">
        <span>{leftNum}</span>
        {hasRightPage && (
          <>
            <span className="text-[#d4af37]/30">—</span>
            <span>{rightNum}</span>
          </>
        )}
        <span className="text-[#d4af37]/20 ml-1">/ {totalPages}</span>
      </div>

      <button
        onClick={onNext}
        disabled={currentSpread >= totalSpreads - 1}
        className="w-7 h-7 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isEditing && (
        <>
          <div className="w-px h-4 bg-[#d4af37]/15" />
          <button
            onClick={onAddPage}
            disabled={isSaving}
            className="px-2 py-1 text-xs text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-50 transition-colors"
          >
            + Page
          </button>
          {totalPages > 1 && (
            <button
              onClick={onDeletePage}
              disabled={isSaving}
              className="px-2 py-1 text-xs text-[#d4af37]/30 hover:text-[#a82d6a] hover:bg-[#a82d6a]/10 rounded-sm disabled:opacity-50 transition-colors"
            >
              Del
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
