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
}

export default function BookPage({
  page,
  isEditing,
  onSaveContent,
  onSaveImages,
}: PageProps) {
  return (
    <motion.div
      className="absolute inset-0 page-surface"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="corner-decoration corner-tl opacity-30" />
      <div className="corner-decoration corner-tr opacity-30" />

      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[#8a7a6a] text-xs font-[family-name:var(--font-playfair)] tracking-wider opacity-50">
        — {page.page_number} —
      </div>

      <div className="h-full flex flex-col pt-10 pb-4">
        <div className="flex-1 overflow-hidden">
          <PageContent
            initialContent={page.content}
            isEditing={isEditing}
            onSave={onSaveContent}
          />
        </div>

        <div className="px-6 pt-3 border-t border-[#d4af37]/10">
          <ImageUpload
            images={page.images || []}
            onImagesChange={(images) => onSaveImages(images)}
            isEditing={isEditing}
            onSave={onSaveImages}
          />
        </div>
      </div>

      <div className="corner-decoration corner-bl opacity-30" />
      <div className="corner-decoration corner-br opacity-30" />
    </motion.div>
  );
}
