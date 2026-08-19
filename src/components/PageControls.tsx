"use client";

import { motion } from "framer-motion";

interface PageControlsProps {
  currentSpread: number;
  totalSpreads: number;
  totalPages: number;
  currentPage: number;
  totalPagesShowing: number;
  onPrev: () => void;
  onNext: () => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  isEditing: boolean;
  isSaving: boolean;
  isMobile: boolean;
}

export default function PageControls({
  currentSpread,
  totalSpreads,
  totalPages,
  currentPage,
  totalPagesShowing,
  onPrev,
  onNext,
  onAddPage,
  onDeletePage,
  isEditing,
  isSaving,
  isMobile,
}: PageControlsProps) {
  const atStart = isMobile ? currentPage <= 0 : currentSpread <= 0;
  const atEnd = isMobile ? currentPage >= totalPages - 1 : currentSpread >= totalSpreads - 1;

  const pageNum = currentPage + 1;
  const hasSecond = !isMobile && totalPagesShowing === 2;
  const pageNum2 = pageNum + 1;

  if (isMobile) {
    return (
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-[#2d0a1b]/90 border border-[#d4af37]/30 rounded-md backdrop-blur-md shadow-lg shadow-black/30"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 16px))' }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 25 }}
      >
        <button
          onClick={onPrev}
          disabled={atStart}
          className="w-11 h-11 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/15 active:bg-[#d4af37]/20 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex items-center gap-1.5 text-sm font-[family-name:var(--font-playfair)] text-[#d4af37] min-w-[52px] justify-center select-none">
          <span>{pageNum}</span>
          <span className="text-[#d4af37]/40">/ {totalPages}</span>
        </div>

        <button
          onClick={onNext}
          disabled={atEnd}
          className="w-11 h-11 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/15 active:bg-[#d4af37]/20 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isEditing && (
          <>
            <div className="w-px h-5 bg-[#d4af37]/20" />
            <button
              onClick={onAddPage}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-[#d4af37]/70 hover:text-[#d4af37] hover:bg-[#d4af37]/10 rounded-md disabled:opacity-50 transition-colors"
            >
              +
            </button>
            {totalPages > 1 && (
              <button
                onClick={onDeletePage}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm text-[#d4af37]/40 hover:text-[#a82d6a] hover:bg-[#a82d6a]/10 rounded-md disabled:opacity-50 transition-colors"
              >
                Del
              </button>
            )}
          </>
        )}
      </motion.div>
    );
  }

  // Desktop/tablet spread view
  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2 bg-[#1a0d12]/80 border border-[#d4af37]/20 rounded-sm backdrop-blur-sm"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 25 }}
    >
      <button
        onClick={onPrev}
        disabled={atStart}
        className="w-7 h-7 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37]/10 rounded-sm disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex items-center gap-1.5 text-xs font-[family-name:var(--font-playfair)] text-[#d4af37]/70">
        <span>{pageNum}</span>
        {hasSecond && (
          <>
            <span className="text-[#d4af37]/30">—</span>
            <span>{pageNum2}</span>
          </>
        )}
        <span className="text-[#d4af37]/20 ml-1">/ {totalPages}</span>
      </div>

      <button
        onClick={onNext}
        disabled={atEnd}
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
