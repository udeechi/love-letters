"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookCover from "./BookCover";
import LockScreen from "./LockScreen";
import BookPage from "./Page";
import EditToggle from "./EditToggle";
import PageControls from "./PageControls";
import { useBookState } from "@/hooks/useBookState";
import { useNotebook } from "@/hooks/useNotebook";
import type { NotebookPage, PageImage } from "@/types";

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

  const [showBook, setShowBook] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [isFolding, setIsFolding] = useState(false);
  const [foldDirection, setFoldDirection] = useState<"next" | "prev" | null>(null);

  useEffect(() => {
    if (!isLocked && isInitialized) {
      fetchPages();
    }
  }, [isLocked, isInitialized, fetchPages]);

  useEffect(() => {
    if (!isLocked && !hasOpened) {
      const timer = setTimeout(() => {
        setShowBook(true);
        setHasOpened(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLocked, hasOpened]);

  const handleNext = useCallback(() => {
    if (isFolding) return;
    setIsFolding(true);
    setFoldDirection("next");
  }, [isFolding]);

  const handlePrev = useCallback(() => {
    if (isFolding) return;
    setIsFolding(true);
    setFoldDirection("prev");
  }, [isFolding]);

  const handleFoldComplete = useCallback(() => {
    if (foldDirection === "next") {
      nextSpread();
    } else if (foldDirection === "prev") {
      prevSpread();
    }
    setIsFolding(false);
    setFoldDirection(null);
  }, [foldDirection, nextSpread, prevSpread]);

  const handleSaveContent = (content: string) => {
    if (leftPage) savePage(leftPage.id, content);
  };

  const handleSaveRightContent = (content: string) => {
    if (rightPage) savePage(rightPage.id, content);
  };

  const handleSaveImages = (images: PageImage[]) => {
    if (leftPage) savePage(leftPage.id, leftPage.content, images);
  };

  const handleSaveRightImages = (images: PageImage[]) => {
    if (rightPage) savePage(rightPage.id, rightPage.content, images);
  };

  const handleDeletePage = async () => {
    const pageToDelete = rightPage || leftPage;
    if (pageToDelete && pages.length > 1) {
      await deletePage(pageToDelete.id);
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

  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;
  const canGoNext = currentSpread < totalSpreads - 1;
  const canGoPrev = currentSpread > 0;

  return (
    <div className="book-viewport">
      <AnimatePresence mode="wait">
        {isLocked ? (
          <LockScreen key="lock" onUnlock={unlock} />
        ) : (
          <motion.div
            key="book"
            className="relative w-full h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <AnimatePresence>
              {isEditing && (
                <EditToggle
                  key="edit-toggle"
                  isEditing={isEditing}
                  onToggle={toggleEditing}
                />
              )}
            </AnimatePresence>

            {!isEditing && (
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
                <span className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-sm tracking-wider">
                  Edit
                </span>
              </motion.button>
            )}

            {/* THE BOOK */}
            <div className="book-scene">
              {/* LEFT PAGE */}
              <div
                className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden"
                style={{ zIndex: 1 }}
              >
                <div className="w-full h-full page-surface page-shadow-left">
                  {isLoadingPages ? (
                    <LoadingIndicator />
                  ) : leftPage ? (
                    <AnimatePresence mode="wait">
                      <BookPage
                        key={leftPage.id}
                        page={leftPage}
                        isEditing={isEditing}
                        onSaveContent={handleSaveContent}
                        onSaveImages={handleSaveImages}
                      />
                    </AnimatePresence>
                  ) : (
                    <EmptyPageHint onCreate={createPage} />
                  )}
                </div>
              </div>

              {/* RIGHT PAGE — folds when navigating */}
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
                transition={{
                  duration: 0.7,
                  ease: [0.645, 0.045, 0.355, 1],
                }}
                onAnimationComplete={handleFoldComplete}
              >
                <div
                  className="w-full h-full page-surface page-shadow-right"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  {isLoadingPages ? (
                    <LoadingIndicator />
                  ) : rightPage ? (
                    <AnimatePresence mode="wait">
                      <BookPage
                        key={rightPage.id}
                        page={rightPage}
                        isEditing={isEditing}
                        onSaveContent={handleSaveRightContent}
                        onSaveImages={handleSaveRightImages}
                      />
                    </AnimatePresence>
                  ) : (
                    <EmptyPageHint />
                  )}
                </div>
              </motion.div>

              {/* Spine shadow */}
              <div className="book-spine" />
            </div>

            {/* Page navigation */}
            {!isLocked && pages.length > 0 && (
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
    <motion.div
      className="w-full h-full flex items-center justify-center"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <span className="text-[#6b5a4a] text-sm font-[family-name:var(--font-lora)]">
        Opening...
      </span>
    </motion.div>
  );
}

function EmptyPageHint({ onCreate }: { onCreate?: () => void }) {
  return (
    <motion.div
      className="w-full h-full flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-center px-8">
        <div className="font-[family-name:var(--font-playfair)] text-[#8a7a6a] text-lg mb-4">
          Blank page
        </div>
        {onCreate && (
          <motion.button
            onClick={onCreate}
            className="px-6 py-2 border border-[#d4af37]/30 text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm tracking-wider rounded-sm hover:bg-[#d4af37]/10 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Write something...
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
