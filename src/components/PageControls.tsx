"use client";

import { motion } from "framer-motion";

interface PageControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  isEditing: boolean;
  isSaving: boolean;
}

export default function PageControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onAddPage,
  onDeletePage,
  isEditing,
  isSaving,
}: PageControlsProps) {
  return (
    <motion.div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 bg-[#1a0d12]/80 border border-[#d4af37]/20 rounded-sm backdrop-blur-sm"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 25 }}
    >
      <button
        onClick={onPrev}
        disabled={currentPage <= 0}
        className="w-8 h-8 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex items-center gap-2 min-w-[100px] justify-center">
        <span className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-sm">
          {currentPage + 1}
        </span>
        <span className="text-[#d4af37]/30 text-xs">of</span>
        <span className="font-[family-name:var(--font-playfair)] text-[#d4af37]/60 text-sm">
          {totalPages}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        className="w-8 h-8 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isEditing && (
        <>
          <div className="w-px h-6 bg-[#d4af37]/20" />
          <button
            onClick={onAddPage}
            disabled={isSaving}
            className="px-3 py-1 text-xs text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-50 transition-colors"
          >
            + New Page
          </button>
          {totalPages > 1 && (
            <button
              onClick={onDeletePage}
              disabled={isSaving}
              className="px-3 py-1 text-xs text-[#a82d6a] hover:bg-[#a82d6a]/10 rounded-sm disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
