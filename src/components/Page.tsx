"use client";

import { motion } from "framer-motion";
import PageContent from "./PageContent";
import ImageOverlay from "./ImageOverlay";
import type { NotebookPage, PageImage } from "@/types";

interface PageProps {
  page: NotebookPage;
  isEditing: boolean;
  onSaveContent: (content: string) => void;
  onSaveImages: (images: PageImage[]) => void;
  textColor: string;
  onOverflow?: (overflowHtml: string) => void;
}

export default function BookPage({
  page,
  isEditing,
  onSaveContent,
  onSaveImages,
  textColor,
  onOverflow,
}: PageProps) {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f5edd6 0%, #f2e8d0 30%, #ede0bb 100%)",
        borderRadius: "inherit",
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="h-full flex flex-col py-3 px-4 sm:px-6">
        {/* Page number — inline at top */}
        <div className="text-center text-[#8a7a6a] text-xs font-[family-name:var(--font-playfair)] tracking-wider opacity-50 pointer-events-none select-none shrink-0 leading-none">
          — {page.page_number} —
        </div>

        {/* Text fills the available space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <PageContent
            initialContent={page.content}
            isEditing={isEditing}
            onSave={onSaveContent}
            textColor={textColor}
            pageId={page.id}
            onOverflow={onOverflow}
          />
        </div>

        {/* Spacer — breathing room below text */}
        <div className="shrink-0 h-5" />
      </div>

      {/* Image overlay — sits on top of everything, same size as page */}
      <ImageOverlay
        images={page.images || []}
        isEditing={isEditing}
        onSave={onSaveImages}
      />
    </motion.div>
  );
}
