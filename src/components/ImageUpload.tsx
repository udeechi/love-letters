"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PageImage } from "@/types";

interface ImageUploadProps {
  images: PageImage[];
  onImagesChange: (images: PageImage[]) => void;
  isEditing: boolean;
  onSave: (images: PageImage[]) => void;
}

export default function ImageUpload({
  images,
  onImagesChange,
  isEditing,
  onSave,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        const newImage: PageImage = {
          url: result.url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
        };
        const updated = [...images, newImage];
        onImagesChange(updated);
        onSave(updated);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const removeImage = async (index: number) => {
    const image = images[index];
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
    onSave(updated);

    try {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: image.public_id }),
      });
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="popLayout">
        {images.map((image, index) => (
          <motion.div
            key={image.public_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative group mb-3"
          >
            <img
              src={image.url}
              alt={image.caption || `Image ${index + 1}`}
              className="w-full h-auto rounded-sm"
            />
            {isEditing && (
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-[#2d0a1b]/80 rounded-full text-[#d4af37] text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {isEditing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-2 border border-dashed border-[#d4af37]/20 text-[#8a7a6a] text-xs rounded-sm hover:border-[#d4af37]/40 hover:text-[#6b5a4a] transition-colors disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "+ Add Image"}
        </button>
      )}
    </div>
  );
}
