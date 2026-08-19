"use client";

import { motion } from "framer-motion";
import PageContent from "./PageContent";
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
  textColor,
}: PageProps) {
  const hasImages = page.images && page.images.length > 0;

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
      <div className="h-full flex flex-col pt-4 pb-3 px-4 sm:px-6">
        {/* Page number — inline at top */}
        <div className="text-center text-[#8a7a6a] text-xs font-[family-name:var(--font-playfair)] tracking-wider opacity-50 pointer-events-none select-none shrink-0 leading-none mb-1">
          — {page.page_number} —
        </div>

        {/* Text fills the available space */}
        <div className="flex-1 min-h-0">
          <PageContent
            initialContent={page.content}
            isEditing={isEditing}
            onSave={onSaveContent}
            textColor={textColor}
            pageId={page.id}
          />
        </div>

        {/* Read-only images at bottom */}
        {hasImages && (
          <div className="shrink-0 mt-2 space-y-2 overflow-hidden max-h-[25%]">
            {page.images!.map((image, index) => (
              <div key={image.public_id} className="relative">
                <img
                  src={image.url}
                  alt={image.caption || `Image ${index + 1}`}
                  className="w-full h-auto max-h-[20vh] object-contain rounded-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
