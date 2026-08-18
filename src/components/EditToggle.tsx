"use client";

import { motion } from "framer-motion";

interface EditToggleProps {
  isEditing: boolean;
  onToggle: () => void;
}

export default function EditToggle({ isEditing, onToggle }: EditToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 sm:top-6 sm:right-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#2d0a1b]/80 border border-[#d4af37]/30 rounded-sm backdrop-blur-sm hover:bg-[#3d1528]/80 hover:border-[#d4af37]/50 transition-all duration-300"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="font-[family-name:var(--font-playfair)] text-[#d4af37] text-xs sm:text-sm tracking-wider">
        {isEditing ? "Done" : "Edit"}
      </span>
    </motion.button>
  );
}
