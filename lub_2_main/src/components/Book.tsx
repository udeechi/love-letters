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
import type { PageImage, NotebookPage } from "@/types";

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
  const [isLeftFolding, setIsLeftFolding] = useState(false);
  const [foldDirection, setFoldDirection] = useState<"next" | "prev" | null>(null);
  const [textColor, setTextColor] = useState("#000000");
  const [mobilePageIndex, setMobilePageIndex] = useState(0);
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [choosingTarget, setChoosingTarget] = useState(false);
  const [imageTarget, setImageTarget] = useState<NotebookPage | null>(null);

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

  const handleLeftFoldComplete = useCallback(() => {
    prevSpread();
    setIsLeftFolding(false);
  }, [prevSpread]);

  const handleChooseLeft = useCallback(() => {
    if (isEditing) return;
    if (!isLeftFolding && !isFolding && phase === "open" && currentSpread > 0) {
      setIsLeftFolding(true);
    }
  }, [isLeftFolding, isFolding, phase, currentSpread, isEditing]);

  const handleChooseRight = useCallback(() => {
    if (isEditing) return;
    if (!isFolding && !isLeftFolding && phase === "open" && currentSpread < totalSpreads - 1) {
      setIsFolding(true);
      setFoldDirection("next");
    }
  }, [isFolding, isLeftFolding, phase, currentSpread, totalSpreads, isEditing]);

  const handleSaveContent = (c: string) => { if (leftPage) savePage(leftPage.id, c); };
  const handleSaveRightContent = (c: string) => { if (rightPage) savePage(rightPage.id, c); };
  const handleSaveMobileContent = (c: string) => { if (mobilePage) savePage(mobilePage.id, c); };
  const handleSaveImages = (imgs: PageImage[]) => { if (leftPage) savePage(leftPage.id, leftPage.content, imgs); };
  const handleSaveRightImages = (imgs: PageImage[]) => { if (rightPage) savePage(rightPage.id, rightPage.content, imgs); };
  const handleSaveMobileImages = (imgs: PageImage[]) => { if (mobilePage) savePage(mobilePage.id, mobilePage.content, imgs); };
  const [choosingDeleteTarget, setChoosingDeleteTarget] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotebookPage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingPage, setIsDeletingPage] = useState(false);

  const handlePromptDelete = () => {
    if (pages.length <= 1) return;
    setChoosingTarget(false);
    if (isMobile) {
      if (mobilePage) {
        setDeleteTarget(mobilePage);
        setShowDeleteConfirm(true);
      }
    } else {
      if (leftPage && rightPage) {
        setChoosingDeleteTarget((prev) => !prev);
      } else if (leftPage || rightPage) {
        setDeleteTarget(leftPage || rightPage);
        setShowDeleteConfirm(true);
      }
    }
  };

  const handlePickDeletePage = (page: NotebookPage) => {
    setChoosingDeleteTarget(false);
    setDeleteTarget(page);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget && pages.length > 1) {
      setIsDeletingPage(true);
      try {
        await deletePage(deleteTarget.id);
        if (isMobile && mobilePageIndex >= pages.length - 1 && mobilePageIndex > 0) {
          setMobilePageIndex((i) => i - 1);
        }
      } finally {
        setIsDeletingPage(false);
        setDeleteTarget(null);
        setShowDeleteConfirm(false);
      }
    } else {
      setDeleteTarget(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setChoosingDeleteTarget(false);
    setDeleteTarget(null);
    setShowDeleteConfirm(false);
  };

  const handlePickPage = (page: NotebookPage) => {
    setChoosingTarget(false);
    setImageTarget(page);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageTarget) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const result = await res.json();
        const newImage = {
          url: result.url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          x: 50,
          y: 50,
          imgW: 25,
        };
        const updated = [...(imageTarget.images || []), newImage];
        savePage(imageTarget.id, imageTarget.content, updated);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploadingImage(false);
      setImageTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                <div className="w-px h-4 bg-[#d4af37]/20" />
                <button
                  onClick={() => {
                    if (isMobile) {
                      if (mobilePage) handlePickPage(mobilePage);
                    } else {
                      setChoosingDeleteTarget(false);
                      setChoosingTarget(true);
                    }
                  }}
                  disabled={isUploadingImage || (!isMobile && !leftPage && !rightPage) || (isMobile && !mobilePage)}
                  className="text-[10px] font-[family-name:var(--font-playfair)] text-[#8a7a6a] tracking-wider uppercase hover:text-[#d4af37] transition-colors disabled:opacity-40"
                >
                  {isUploadingImage ? "..." : "+ Image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAddImage}
                  className="hidden"
                />
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
            <motion.div 
              className="book-scene"
              initial={{ scale: 0.85, rotateX: 30, rotateZ: 5, rotateY: 10, y: 30 }}
              animate={{ 
                scale: phase === "locked" || phase === "cover" ? 0.9 : 1, 
                rotateX: phase === "locked" || phase === "cover" ? 25 : 10,
                rotateZ: phase === "locked" || phase === "cover" ? 3 : -2,
                rotateY: phase === "locked" || phase === "cover" ? 0 : -5,
                y: phase === "locked" || phase === "cover" ? 20 : 0 
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            >
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
                  {/* RIGHT BACK COVER & PAPER EDGES */}
                  <div className="absolute inset-0 w-1/2 left-1/2 pointer-events-none" style={{ zIndex: 0, transformStyle: "preserve-3d" }}>
                    <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #2d0a1b 0%, #3d1528 40%, #4a1028 100%)", borderRadius: "0 8px 8px 0", transform: "translateZ(-4px)", boxShadow: "20px 20px 40px rgba(0,0,0,0.6)" }}>
                      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] rounded-[inherit]" />
                    </div>
                    <div className="absolute top-1 bottom-1 right-1 left-0" style={{ background: "repeating-linear-gradient(90deg, #f5edd6, #f5edd6 1px, #e5d8bc 1px, #e5d8bc 2px)", transform: "translateZ(-2px)", borderRadius: "0 4px 4px 0", boxShadow: "inset -10px 0 20px rgba(0,0,0,0.05)" }} />
                  </div>

                  <motion.div
                    className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden"
                    style={{
                      zIndex: isLeftFolding ? 15 : 1,
                      transformOrigin: "right center",
                      transformStyle: "preserve-3d" as const,
                    }}
                    animate={
                      isLeftFolding
                        ? { rotateY: [0, 180] }
                        : { rotateY: 0 }
                    }
                    transition={{ duration: 0.7, ease: [0.645, 0.045, 0.355, 1] }}
                    onAnimationComplete={handleLeftFoldComplete}
                    onClick={handleChooseLeft}
                  >
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
                    {choosingTarget && leftPage && (
                      <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        style={{ zIndex: 25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickPage(leftPage);
                        }}
                      >
                        <div className="px-6 py-3 bg-[#1a0d12]/70 border border-[#d4af37]/30 rounded-sm backdrop-blur-sm text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm tracking-wider hover:bg-[#2d0a1b]/80 hover:border-[#d4af37]/50 transition-all">
                          Select
                        </div>
                      </div>
                    )}
                    {choosingDeleteTarget && leftPage && (
                      <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px]"
                        style={{ zIndex: 25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickDeletePage(leftPage);
                        }}
                      >
                        <div className="px-6 py-3 bg-[#2d0a1b]/85 border border-[#a82d6a]/60 rounded-sm backdrop-blur-sm text-[#f5edd6] font-[family-name:var(--font-playfair)] text-sm tracking-wider hover:bg-[#3d1028]/90 hover:border-[#a82d6a] shadow-lg shadow-[#a82d6a]/20 transition-all">
                          Select
                        </div>
                      </div>
                    )}
                    {isLeftFolding && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: "linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.3) 100%)",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.7, ease: "easeInOut" }}
                      />
                    )}
                  </motion.div>

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
                    onClick={handleChooseRight}
                  >
                    <div
                      className="w-full h-full page-surface page-shadow-right relative"
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
                      
                      {/* Dynamic Flip Shadow */}
                      {isFolding && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: foldDirection === "next" 
                              ? "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.3) 100%)"
                              : "linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.3) 100%)",
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 0.7, ease: "easeInOut" }}
                        />
                      )}
                    </div>
                    {choosingTarget && rightPage && (
                      <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        style={{ zIndex: 25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickPage(rightPage);
                        }}
                      >
                        <div className="px-6 py-3 bg-[#1a0d12]/70 border border-[#d4af37]/30 rounded-sm backdrop-blur-sm text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm tracking-wider hover:bg-[#2d0a1b]/80 hover:border-[#d4af37]/50 transition-all">
                          Select
                        </div>
                      </div>
                    )}
                    {choosingDeleteTarget && rightPage && (
                      <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-[2px]"
                        style={{ zIndex: 25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickDeletePage(rightPage);
                        }}
                      >
                        <div className="px-6 py-3 bg-[#2d0a1b]/85 border border-[#a82d6a]/60 rounded-sm backdrop-blur-sm text-[#f5edd6] font-[family-name:var(--font-playfair)] text-sm tracking-wider hover:bg-[#3d1028]/90 hover:border-[#a82d6a] shadow-lg shadow-[#a82d6a]/20 transition-all">
                          Select
                        </div>
                      </div>
                    )}
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

              {showPages && (
                <div
                  className="book-spine"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    style={{ position: "absolute", inset: 0, overflow: "visible" }}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#b06050" />
                        <stop offset="30%" stopColor="#7a2820" />
                        <stop offset="70%" stopColor="#4a1510" />
                        <stop offset="100%" stopColor="#280a06" />
                      </linearGradient>
                      <filter id="ringShadow" x="-40%" y="-40%" width="180%" height="180%">
                        <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="rgba(0,0,0,0.55)" />
                      </filter>
                      <pattern id="ringPattern" x="0" y="0" width="40" height="32" patternUnits="userSpaceOnUse">
                        {/* Left hole */}
                        <circle cx="8" cy="20" r="4" fill="rgba(0,0,0,0.7)" />
                        {/* Right hole */}
                        <circle cx="32" cy="14" r="4" fill="rgba(0,0,0,0.7)" />
                        {/* Ring arc */}
                        <path
                          d="M 8 20 Q 20 7 32 14"
                          fill="none"
                          stroke="url(#ringGrad)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          filter="url(#ringShadow)"
                        />
                        {/* Highlight gloss */}
                        <path
                          d="M 9 19 Q 20 8 31 14"
                          fill="none"
                          stroke="rgba(255,200,180,0.25)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width="40" height="100%" fill="url(#ringPattern)" />
                  </svg>
                </div>
              )}
            </motion.div>

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
                onDeletePage={handlePromptDelete}
                isEditing={isEditing}
                isSaving={isDeletingPage}
                isMobile={isMobile}
              />
            )}

            {/* 2-Step Page Deletion Glassmorphic Modal */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  key="delete-modal-overlay"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={handleCancelDelete}
                >
                  <motion.div
                    className="relative w-full max-w-sm p-6 bg-[#1a0d12]/80 border border-[#d4af37]/30 rounded-sm shadow-2xl backdrop-blur-xl text-center"
                    style={{
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.15)",
                    }}
                    initial={{ scale: 0.9, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 15 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute inset-0 rounded-sm border border-[#d4af37]/10 pointer-events-none" />

                    <h3 className="font-[family-name:var(--font-playfair)] text-xl text-[#d4af37] tracking-wider mb-2">
                      Delete Page
                    </h3>

                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent mx-auto mb-4" />

                    <p className="font-[family-name:var(--font-lora)] text-sm text-[#e8dcc8]/80 leading-relaxed mb-6">
                      {deleteTarget
                        ? `Are you sure you want to delete Page ${deleteTarget.page_number - 1}? This action cannot be undone.`
                        : "Are you sure you want to delete this page? This action cannot be undone."}
                    </p>

                    <div className="flex items-center justify-center gap-3">
                      <motion.button
                        onClick={handleCancelDelete}
                        disabled={isDeletingPage}
                        className="px-5 py-2 rounded-sm border border-[#d4af37]/30 bg-transparent text-[#d4af37]/80 hover:bg-[#d4af37]/10 hover:text-[#d4af37] font-[family-name:var(--font-playfair)] text-xs tracking-widest uppercase transition-all"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Cancel
                      </motion.button>

                      <motion.button
                        onClick={handleConfirmDelete}
                        disabled={isDeletingPage}
                        className="px-5 py-2 rounded-sm border border-[#a82d6a]/60 bg-[#a82d6a]/25 text-[#f5edd6] hover:bg-[#a82d6a]/40 hover:border-[#a82d6a] font-[family-name:var(--font-playfair)] text-xs tracking-widest uppercase shadow-lg shadow-[#a82d6a]/20 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {isDeletingPage ? "Deleting..." : "Delete"}
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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
