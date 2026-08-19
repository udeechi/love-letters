"use client";

import { motion } from "framer-motion";
import PageContent from "./PageContent";
import ImageUpload from "./ImageUpload";
import type { NotebookPage, PageImage } from "@/types";

interface PageProps {
  page: NotebookPage;
  isEditing: boolean;
  onSaveContent: (content: string) => void;
  onSaveImages: (images: PageImage[]) => void;
  textColor: string;
}

export default function BookPage({
  page,
  isEditing,
  onSaveContent,
  onSaveImages,
  textColor,
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
      {/* Page number - fixed at top */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-[#8a7a6a] text-xs font-[family-name:var(--font-playfair)] tracking-wider opacity-50 pointer-events-none select-none">
        — {page.page_number} —
      </div>

      {/* Single scrollable container for all content */}
      <div className="h-full overflow-y-auto pt-10 pb-4 page-scroll-area">
        <div className="px-4 sm:px-6">
          <PageContent
            initialContent={page.content}
            isEditing={isEditing}
            onSave={onSaveContent}
            textColor={textColor}
            pageId={page.id}
          />
        </div>

        <div className="px-4 sm:px-6 pt-2">
          <ImageUpload
            images={page.images || []}
            onImagesChange={(images) => onSaveImages(images)}
            isEditing={isEditing}
            onSave={onSaveImages}
          />
        </div>
      </div>
    </motion.div>
  );
}
