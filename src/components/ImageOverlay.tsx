"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Moveable from "moveable";
import type { PageImage } from "@/types";

interface ImageOverlayProps {
  images: PageImage[];
  isEditing: boolean;
  onSave: (images: PageImage[]) => void;
}

export default function ImageOverlay({ images, isEditing, onSave }: ImageOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const imageRefs = useRef<Map<number, HTMLImageElement>>(new Map());

  const setImageRef = useCallback((index: number, el: HTMLImageElement | null) => {
    if (el) {
      imageRefs.current.set(index, el);
    } else {
      imageRefs.current.delete(index);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    moveableRef.current = new Moveable(containerRef.current, {
      target: selectedIndex !== null ? imageRefs.current.get(selectedIndex) || null : null,
      draggable: true,
      resizable: true,
      snappable: false,
      origin: false,
      throttleDrag: 0,
      throttleResize: 0,
      renderDirections: ["se"],
    });

    moveableRef.current.on("drag", ({ target, left, top }) => {
      if (!containerRef.current || !target) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const imgEl = target as HTMLImageElement;
      const imgW = parseFloat(imgEl.style.width) || 0;
      const imgH = parseFloat(imgEl.style.height) || 0;
      const x = ((left + imgW / 2) / cw) * 100;
      const y = ((top + imgH / 2) / ch) * 100;
      imgEl.style.left = `${left}px`;
      imgEl.style.top = `${top}px`;
      if (selectedIndex !== null) {
        const updated = [...images];
        updated[selectedIndex] = { ...updated[selectedIndex], x, y };
        onSave(updated);
      }
    });

    moveableRef.current.on("resize", ({ target, width, height, drag }) => {
      if (!containerRef.current || !target) return;
      const cw = containerRef.current.clientWidth;
      const imgEl = target as HTMLImageElement;
      imgEl.style.width = `${width}px`;
      imgEl.style.height = `${height}px`;
      imgEl.style.left = `${drag.left}px`;
      imgEl.style.top = `${drag.top}px`;
      if (selectedIndex !== null) {
        const imgW = (width / cw) * 100;
        const x = ((drag.left + width / 2) / cw) * 100;
        const ch = containerRef.current.clientHeight;
        const y = ((drag.top + height / 2) / ch) * 100;
        const updated = [...images];
        updated[selectedIndex] = { ...updated[selectedIndex], imgW, x, y };
        onSave(updated);
      }
    });

    return () => {
      moveableRef.current?.destroy();
      moveableRef.current = null;
    };
  }, [selectedIndex, images, onSave]);

  const handleDeselect = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setSelectedIndex(null);
    }
  }, []);

  const handleRemove = useCallback((index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onSave(updated);
    setSelectedIndex(null);
  }, [images, onSave]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: isEditing ? 20 : 5, pointerEvents: isEditing ? "auto" : "none" }}
      onClick={handleDeselect}
    >
      {images.map((img, index) => {
        const containerW = containerRef.current?.clientWidth || 1;
        const containerH = containerRef.current?.clientHeight || 1;
        const cx = ((img.x ?? 50) / 100) * containerW;
        const cy = ((img.y ?? 50) / 100) * containerH;
        const imgWPx = ((img.imgW ?? 25) / 100) * containerW;
        const aspect = img.height / img.width;
        const imgHPx = imgWPx * aspect;
        const left = cx - imgWPx / 2;
        const top = cy - imgHPx / 2;
        const isSelected = isEditing && selectedIndex === index;

        return (
          <div key={img.public_id} className="absolute" style={{ left: `${left}px`, top: `${top}px` }}>
            <img
              ref={(el) => setImageRef(index, el)}
              src={img.url}
              alt={img.caption || `Image ${index + 1}`}
              className="select-none"
              draggable={false}
              style={{
                width: `${imgWPx}px`,
                height: `${imgHPx}px`,
                objectFit: "contain",
                border: isSelected ? "2px solid #d4af37" : "none",
                borderRadius: 2,
                cursor: isEditing ? "move" : "default",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isEditing) setSelectedIndex(index);
              }}
            />
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="absolute -top-3 -right-3 w-6 h-6 bg-[#2d0a1b]/90 rounded-full text-[#d4af37] text-xs flex items-center justify-center hover:bg-[#4d1a2b] transition-colors"
                style={{ zIndex: 30 }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
