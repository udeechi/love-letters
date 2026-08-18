"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookCover from "./BookCover";
import LockScreen from "./LockScreen";
import BookPage from "./Page";
import EditToggle from "./EditToggle";
import PageControls from "./PageControls";
import { useBookState } from "@/hooks/useBookState";
import { useNotebook } from "@/hooks/useNotebook";
import type { PageImage } from "@/types";

type Phase = "locked" | "cover" | "opening" | "open";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function Book() {
  const { isLocked, isEditing, isInitialized, unlock, toggleEditing } = useBookState();
  const {
    pages, currentSpread, totalSpreads,
    leftPage, rightPage,
    isLoading: isLoadingPages, fetchPages,
    savePage, createPage, deletePage,
    nextSpread, prevSpread,
  } = useNotebook();

  const [phase, setPhase] = useState<Phase>("locked");
  const [isFolding, setIsFolding] = useState(false);
  const [foldDirection, setFoldDirection] = useState<"next" | "prev" | null>(null);
  const [textColor, setTextColor] = useState("#000000");
  const [mobilePageIndex, setMobilePageIndex] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLocked && isInitialized) fetchPages();
  }, [isLocked, isInitialized, fetchPages]);

  useEffect(() => {
    if (!isLocked && isInitialized && phase === "locked") setPhase("cover");
  }, [isLocked, isInitialized, phase]);

  useEffect(() => {
    if (isMobile) {
      const si = currentSpread * 2;
      if (si < pages.length) setMobilePageIndex(si);
    }
  }, [isMobile, currentSpread, pages.length]);

  const handleCoverClick = useCallback(() => {
    if (phase !== "cover") return;
    setPhase("opening");
    setTimeout(() => setPhase("open"), 1400);
  }, [phase]);

  const mobilePage = isMobile ? pages[mobilePageIndex] ?? null : null;
  const mobileTotal = pages.length;

  const handleMobileNext = useCallback(() => {
    if (mobilePageIndex < mobileTotal - 1) {
      setMobilePageIndex((i) => i + 1);
    }
  }, [mobilePageIndex, mobileTotal]);

  const handleMobilePrev = useCallback(() => {
    if (mobilePageIndex > 0) {
      setMobilePageIndex((i) => i - 1);
    }
  }, [mobilePageIndex]);

  const handleNext = useCallback(() => {
    if (isFolding || phase !== "open") return;
    if (isMobile) return handleMobileNext();
    setIsFolding(true);
    setFoldDirection("next");
  }, [isFolding, phase, isMobile, handleMobileNext]);

  const handlePrev = useCallback(() => {
    if (isFolding || phase !== "open") return;
    if (isMobile) return handleMobilePrev();
    setIsFolding(true);
    setFoldDirection("prev");
  }, [isFolding, phase, isMobile, handleMobilePrev]);

  const handleFoldComplete = useCallback(() => {
    if (foldDirection === "next") nextSpread();
    else if (foldDirection === "prev") prevSpread();
    setIsFolding(false);
    setFoldDirection(null);
  }, [foldDirection, nextSpread, prevSpread]);

  const handleSaveContent = (c: string) => { if (leftPage) savePage(leftPage.id, c); };
  const handleSaveRightContent = (c: string) => { if (rightPage) savePage(rightPage.id, c); };
  const handleSaveMobileContent = (c: string) => { if (mobilePage) savePage(mobilePage.id, c); };
  const handleSaveImages = (imgs: PageImage[]) => { if (leftPage) savePage(leftPage.id, leftPage.content, imgs); };
  const handleSaveRightImages = (imgs: PageImage[]) => { if (rightPage) savePage(rightPage.id, rightPage.content, imgs); };
  const handleSaveMobileImages = (imgs: PageImage[]) => { if (mobilePage) savePage(mobilePage.id, mobilePage.content, imgs); };
  const handleDeletePage = async () => {
    const target = isMobile ? mobilePage : (rightPage || leftPage);
    if (target && pages.length > 1) {
      await deletePage(target.id);
      if (isMobile && mobilePageIndex >= pages.length - 1 && mobilePageIndex > 0) {
        setMobilePageIndex((i) => i - 1);
      }
    }
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
  const isCoverOpen = phase === "opening" || phase === "open";

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

            {isEditing && (
              <motion.div
                key="color-picker"
                className={`fixed z-50 flex items-center gap-2 px-3 py-1.5 bg-[#1a0d12]/80 border border-[#d4af37]/20 rounded-sm backdrop-blur-sm ${
                  isMobile
                    ? "bottom-20 left-1/2 -translate-x-1/2"
                    : "top-6 left-6"
                }`}
                initial={isMobile ? { y: 40, opacity: 0 } : { x: -40, opacity: 0 }}
                animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                exit={isMobile ? { y: 40, opacity: 0 } : { x: -40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              >
                <label className="text-[10px] font-[family-name:var(--font-playfair)] text-[#8a7a6a] tracking-wider uppercase">
                  Color
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className={`rounded-sm border border-[#d4af37]/20 cursor-pointer bg-transparent ${
                    isMobile ? "w-8 h-8" : "w-5 h-5"
                  }`}
                />
                {!isMobile && (
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-20 px-1.5 py-0.5 text-[11px] font-mono bg-transparent border border-[#d4af37]/15 rounded-sm text-[#d4af37]/80 focus:border-[#d4af37]/40 focus:outline-none"
                  />
                )}
              </motion.div>
            )}

            {!isEditing && phase === "open" && (
              <motion.button
                key="edit-entry"
                className="fixed top-6 right-6 z-50 px-4 py-2 bg-[#2d0a1b]/80 border border-[#d4af37]/30 rounded-sm backdrop-blur-sm hover:bg-[#3d1528]/80 hover:border-[#d4af37]/50 transition-all duration-300"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                onClick={toggleEditing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-sm tracking-wider">Edit</span>
              </motion.button>
            )}

            {/* THE BOOK */}
            <div className="book-scene">
              {/* MOBILE: single page view */}
              {isMobile && showPages && (
                <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
                  <div className="w-full h-full page-surface" style={{ borderRadius: 6 }}>
                    {isLoadingPages ? (
                      <LoadingIndicator />
                    ) : mobilePage ? (
                      <AnimatePresence mode="wait">
                        <BookPage
                          key={mobilePage.id}
                          page={mobilePage}
                          isEditing={isEditing}
                          onSaveContent={handleSaveMobileContent}
                          onSaveImages={handleSaveMobileImages}
                          textColor={textColor}
                        />
                      </AnimatePresence>
                    ) : (
                      <EmptyPageHint onCreate={createPage} />
                    )}
                  </div>
                </div>
              )}

              {/* DESKTOP/TABLET: spread view */}
              {!isMobile && showPages && (
                <>
                  <div className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden" style={{ zIndex: 1 }}>
                    <div className="w-full h-full page-surface page-shadow-left">
                      {isLoadingPages ? (
                        <LoadingIndicator />
                      ) : leftPage ? (
                        <AnimatePresence mode="wait">
                          <BookPage key={leftPage.id} page={leftPage} isEditing={isEditing} onSaveContent={handleSaveContent} onSaveImages={handleSaveImages} textColor={textColor} />
                        </AnimatePresence>
                      ) : (
                        <EmptyPageHint onCreate={createPage} />
                      )}
                    </div>
                  </div>

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
                          <BookPage key={rightPage.id} page={rightPage} isEditing={isEditing} onSaveContent={handleSaveRightContent} onSaveImages={handleSaveRightImages} textColor={textColor} />
                        </AnimatePresence>
                      ) : (
                        <EmptyPageHint />
                      )}
                    </div>
                  </motion.div>
                </>
              )}

              {/* COVER */}
              {(phase === "cover" || phase === "opening") && (
                <div
                  onClick={handleCoverClick}
                  style={{ cursor: phase === "cover" ? "pointer" : "default" }}
                >
                  <BookCover isOpen={isCoverOpen} />
                </div>
              )}

              {showPages && <div className="book-spine" />}
            </div>

            {phase === "open" && pages.length > 0 && (
              <PageControls
                currentSpread={isMobile ? 0 : currentSpread}
                totalSpreads={isMobile ? 1 : totalSpreads}
                totalPages={pages.length}
                currentPage={isMobile ? mobilePageIndex : currentSpread * 2}
                totalPagesShowing={isMobile ? 1 : (rightPage ? 2 : 1)}
                onPrev={handlePrev}
                onNext={handleNext}
                onAddPage={createPage}
                onDeletePage={handleDeletePage}
                isEditing={isEditing}
                isSaving={false}
                isMobile={isMobile}
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
