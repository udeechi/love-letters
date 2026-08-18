"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookCover from "./BookCover";
import LockScreen from "./LockScreen";
import BookPage from "./Page";
import EditToggle from "./EditToggle";
import PageControls from "./PageControls";
import { useBookState } from "@/hooks/useBookState";
import { useNotebook } from "@/hooks/useNotebook";
import type { NotebookPage, PageImage } from "@/types";

type Phase = "locked" | "cover" | "sliding" | "opening" | "open";

export default function Book() {
  const {
    isLocked,
    isEditing,
    isInitialized,
    unlock,
    toggleEditing,
  } = useBookState();

  const {
    pages,
    currentSpread,
    totalSpreads,
    leftPage,
    rightPage,
    isLoading: isLoadingPages,
    fetchPages,
    savePage,
    createPage,
    deletePage,
    nextSpread,
    prevSpread,
  } = useNotebook();

  const [phase, setPhase] = useState<Phase>("locked");
  const [isFolding, setIsFolding] = useState(false);
  const [foldDirection, setFoldDirection] = useState<"next" | "prev" | null>(null);
  const timers = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timers
  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  // Fetch pages when unlocked
  useEffect(() => {
    if (!isLocked && isInitialized) {
      fetchPages();
    }
  }, [isLocked, isInitialized, fetchPages]);

  // After unlock → show closed cover
  useEffect(() => {
    if (!isLocked && isInitialized && phase === "locked") {
      setPhase("cover");
    }
  }, [isLocked, isInitialized, phase]);

  // Click cover to open
  const handleCoverClick = useCallback(() => {
    if (phase !== "cover") return;

    // Phase 1: slide right (600ms)
    setPhase("sliding");

    // Phase 2: unfold cover after slide finishes (600ms)
    timers.current.push(
      setTimeout(() => setPhase("opening"), 600)
    );

    // Phase 3: fully open after unfold finishes (1200ms)
    timers.current.push(
      setTimeout(() => setPhase("open"), 600 + 1200)
    );
  }, [phase]);

  // Page navigation
  const handleNext = useCallback(() => {
    if (isFolding || phase !== "open") return;
    setIsFolding(true);
    setFoldDirection("next");
  }, [isFolding, phase]);

  const handlePrev = useCallback(() => {
    if (isFolding || phase !== "open") return;
    setIsFolding(true);
    setFoldDirection("prev");
  }, [isFolding, phase]);

  const handleFoldComplete = useCallback(() => {
    if (foldDirection === "next") nextSpread();
    else if (foldDirection === "prev") prevSpread();
    setIsFolding(false);
    setFoldDirection(null);
  }, [foldDirection, nextSpread, prevSpread]);

  // Page saves
  const handleSaveContent = (c: string) => { if (leftPage) savePage(leftPage.id, c); };
  const handleSaveRightContent = (c: string) => { if (rightPage) savePage(rightPage.id, c); };
  const handleSaveImages = (imgs: PageImage[]) => { if (leftPage) savePage(leftPage.id, leftPage.content, imgs); };
  const handleSaveRightImages = (imgs: PageImage[]) => { if (rightPage) savePage(rightPage.id, rightPage.content, imgs); };
  const handleDeletePage = async () => {
    const target = rightPage || leftPage;
    if (target && pages.length > 1) await deletePage(target.id);
  };

  if (!isInitialized) {
    return (
      <div className="book-viewport">
        <motion.div
          className="text-[#d4af37]/40 font-[family-name:var(--font-playfair)] text-lg tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const showPages = phase === "opening" || phase === "open";
  const isOpen = phase === "opening" || phase === "open";
  const sceneX = (phase === "sliding" || phase === "opening" || phase === "open") ? "25%" : "0%";

  return (
    <div className="book-viewport">
      <AnimatePresence mode="wait">
        {isLocked && phase === "locked" ? (
          <LockScreen key="lock" onUnlock={unlock} />
        ) : (
          <motion.div
            key="book"
            className="relative w-full h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence>
              {isEditing && (
                <EditToggle key="edit-toggle" isEditing={isEditing} onToggle={toggleEditing} />
              )}
            </AnimatePresence>

            {!isEditing && phase === "open" && (
              <motion.button
                key="edit-entry"
                className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-[#2d0a1b]/80 border border-[#d4af37]/30 rounded-sm backdrop-blur-sm hover:bg-[#3d1528]/80 hover:border-[#d4af37]/50 transition-all duration-300"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={toggleEditing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-lg">✏️</span>
                <span className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-sm tracking-wider">Edit</span>
              </motion.button>
            )}

            {/* THE BOOK */}
            <div
              className="book-scene"
              style={{
                transform: `translateX(${sceneX})`,
                transition: "transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1)",
              }}
            >
              {/* LEFT PAGE */}
              {showPages && (
                <div
                  className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden"
                  style={{ zIndex: 1 }}
                >
                  <div className="w-full h-full page-surface page-shadow-left">
                    {isLoadingPages ? (
                      <LoadingIndicator />
                    ) : leftPage ? (
                      <AnimatePresence mode="wait">
                        <BookPage key={leftPage.id} page={leftPage} isEditing={isEditing} onSaveContent={handleSaveContent} onSaveImages={handleSaveImages} />
                      </AnimatePresence>
                    ) : (
                      <EmptyPageHint onCreate={createPage} />
                    )}
                  </div>
                </div>
              )}

              {/* RIGHT PAGE */}
              {showPages && (
                <motion.div
                  className="absolute top-0 bottom-0 right-0 w-1/2 overflow-hidden"
                  style={{
                    zIndex: isFolding && foldDirection === "next" ? 15 : 2,
                    transformOrigin: "left center",
                    transformStyle: "preserve-3d" as const,
                  }}
                  animate={
                    isFolding && foldDirection === "next"
                      ? { rotateY: [0, -180] }
                      : isFolding && foldDirection === "prev"
                      ? { rotateY: [-180, 0] }
                      : { rotateY: 0 }
                  }
                  transition={{ duration: 0.7, ease: [0.645, 0.045, 0.355, 1] }}
                  onAnimationComplete={handleFoldComplete}
                >
                  <div
                    className="w-full h-full page-surface page-shadow-right"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  >
                    {isLoadingPages ? (
                      <LoadingIndicator />
                    ) : rightPage ? (
                      <AnimatePresence mode="wait">
                        <BookPage key={rightPage.id} page={rightPage} isEditing={isEditing} onSaveContent={handleSaveRightContent} onSaveImages={handleSaveRightImages} />
                      </AnimatePresence>
                    ) : (
                      <EmptyPageHint />
                    )}
                  </div>
                </motion.div>
              )}

              {/* COVER - clickable when closed, opens on click */}
              {(phase === "cover" || phase === "sliding" || phase === "opening") && (
                <div
                  onClick={handleCoverClick}
                  style={{ cursor: phase === "cover" ? "pointer" : "default" }}
                >
                  <BookCover isOpen={isOpen} />
                </div>
              )}

              {/* Spine */}
              <div className="book-spine" />
            </div>

            {/* Page navigation */}
            {phase === "open" && pages.length > 0 && (
              <PageControls
                currentSpread={currentSpread}
                totalSpreads={totalSpreads}
                totalPages={pages.length}
                onPrev={handlePrev}
                onNext={handleNext}
                onAddPage={createPage}
                onDeletePage={handleDeletePage}
                isEditing={isEditing}
                isSaving={false}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <motion.div className="w-full h-full flex items-center justify-center" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
      <span className="text-[#6b5a4a] text-sm font-[family-name:var(--font-lora)]">Opening...</span>
    </motion.div>
  );
}

function EmptyPageHint({ onCreate }: { onCreate?: () => void }) {
  return (
    <motion.div className="w-full h-full flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="text-center px-8">
        <div className="font-[family-name:var(--font-playfair)] text-[#8a7a6a] text-lg mb-4">Blank page</div>
        {onCreate && (
          <motion.button onClick={onCreate} className="px-6 py-2 border border-[#d4af37]/30 text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm tracking-wider rounded-sm hover:bg-[#d4af37]/10 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Write something...
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
