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
  const [dragOver, setDragOver] = useState(false);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleUpload(file);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-[#6b5a4a] font-[family-name:var(--font-playfair)] tracking-wider uppercase">
          Images
        </h4>
        {isEditing && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs text-[#d4af37] hover:text-[#e6c84d] transition-colors disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "+ Add Image"}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {isEditing && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-sm p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#d4af37]/60 bg-[#d4af37]/10"
              : "border-[#d4af37]/20 hover:border-[#d4af37]/40"
          }`}
        >
          <p className="text-xs text-[#6b5a4a]">
            {isUploading
              ? "Uploading..."
              : "Drop images here or click to upload"}
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {images.map((image, index) => (
          <motion.div
            key={image.public_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative group"
          >
            <img
              src={image.url}
              alt={image.caption || `Image ${index + 1}`}
              className="w-full h-auto rounded-sm shadow-md"
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
    </div>
  );
}
