"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookCover from "./BookCover";
import LockScreen from "./LockScreen";
import BookPage from "./Page";
import EditToggle from "./EditToggle";
import PageControls from "./PageControls";
import { useBookState } from "@/hooks/useBookState";
import { useNotebook } from "@/hooks/useNotebook";
import type { PageImage } from "@/types";

export default function Book() {
  const {
    isLocked,
    isEditing,
    isInitialized,
    unlock,
    toggleEditing,
  } = useBookState();

  const {
    currentPage,
    currentPageIndex,
    totalPages,
    isLoading: isLoadingPages,
    fetchPages,
    savePage,
    createPage,
    deletePage,
    nextPage,
    prevPage,
  } = useNotebook();

  const [showBook, setShowBook] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

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

  const handleSaveContent = (content: string) => {
    if (currentPage) {
      savePage(currentPage.id, content);
    }
  };

  const handleSaveImages = (images: PageImage[]) => {
    if (currentPage) {
      savePage(currentPage.id, currentPage.content, images);
    }
  };

  const handleDeletePage = async () => {
    if (currentPage && totalPages > 1) {
      await deletePage(currentPage.id);
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
              {/* RIGHT PAGE - content sits behind cover, right half only */}
              <div
                className="absolute top-0 bottom-0 right-0 w-1/2 overflow-hidden"
                style={{ zIndex: 1 }}
              >
                <div className="w-full h-full page-surface page-shadow-right">
                  {isLoadingPages ? (
                    <motion.div
                      className="w-full h-full flex items-center justify-center"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-[#6b5a4a] text-sm font-[family-name:var(--font-lora)]">
                        Opening...
                      </span>
                    </motion.div>
                  ) : currentPage ? (
                    <AnimatePresence mode="wait">
                      <BookPage
                        key={currentPage.id}
                        page={currentPage}
                        isEditing={isEditing}
                        onSaveContent={handleSaveContent}
                        onSaveImages={handleSaveImages}
                      />
                    </AnimatePresence>
                  ) : (
                    <motion.div
                      className="w-full h-full flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="text-center px-8">
                        <div className="font-[family-name:var(--font-playfair)] text-[#8a7a6a] text-lg mb-4">
                          No pages yet
                        </div>
                        <motion.button
                          onClick={createPage}
                          className="px-6 py-2 border border-[#d4af37]/30 text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm tracking-wider rounded-sm hover:bg-[#d4af37]/10 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Create First Page
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* LEFT PAGE - visible when cover opens (just parchment/lined paper) */}
              <div
                className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden"
                style={{
                  zIndex: 1,
                  background: "linear-gradient(135deg, #f5edd6 0%, #f2e8d0 30%, #ede0bb 100%)",
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "repeating-linear-gradient(transparent, transparent 31px, rgba(168,138,100,0.12) 31px, rgba(168,138,100,0.12) 32px)",
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[1px] pointer-events-none"
                  style={{
                    left: "48px",
                    background: "rgba(180,100,100,0.25)",
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 w-8 pointer-events-none"
                  style={{
                    background: "linear-gradient(to left, rgba(0,0,0,0.1), transparent)",
                  }}
                />
              </div>

              {/* FRONT COVER - full width, swings open to the left */}
              <BookCover isOpen={showBook} />

              {/* Spine */}
              <div className="book-spine" />
            </div>

            {/* Page navigation */}
            {!isLocked && totalPages > 0 && (
              <PageControls
                currentPage={currentPageIndex}
                totalPages={totalPages}
                onPrev={prevPage}
                onNext={nextPage}
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
