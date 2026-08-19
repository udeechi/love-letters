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
  const imageElRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const imagesRef = useRef(images);
  const onSaveRef = useRef(onSave);
  const selectedRef = useRef(selectedIndex);

  imagesRef.current = images;
  onSaveRef.current = onSave;
  selectedRef.current = selectedIndex;

  const setImageEl = useCallback((index: number, el: HTMLImageElement | null) => {
    if (el) {
      imageElRefs.current.set(index, el);
    } else {
      imageElRefs.current.delete(index);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const target = selectedIndex !== null ? imageElRefs.current.get(selectedIndex) || null : null;

    moveableRef.current = new Moveable(containerRef.current, {
      target,
      draggable: true,
      resizable: true,
      rotatable: true,
      snappable: false,
      origin: false,
      throttleDrag: 0,
      throttleResize: 0,
      throttleRotate: 0,
      renderDirections: ["se"],
    });

    moveableRef.current.on("dragStart", () => {});

    moveableRef.current.on("drag", ({ target: tgt, left, top }) => {
      if (!tgt) return;
      const imgEl = tgt as HTMLImageElement;
      imgEl.style.left = `${left}px`;
      imgEl.style.top = `${top}px`;
    });

    moveableRef.current.on("dragEnd", ({ target: tgt }) => {
      if (!tgt || !containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const imgEl = tgt as HTMLImageElement;
      const width = parseFloat(imgEl.style.width) || 0;
      const height = parseFloat(imgEl.style.height) || 0;
      const left = parseFloat(imgEl.style.left) || 0;
      const top = parseFloat(imgEl.style.top) || 0;
      const x = ((left + width / 2) / cw) * 100;
      const y = ((top + height / 2) / ch) * 100;
      const idx = selectedRef.current;
      if (idx !== null) {
        const updated = [...imagesRef.current];
        updated[idx] = { ...updated[idx], x, y };
        onSaveRef.current(updated);
      }
    });

    moveableRef.current.on("resizeStart", () => {});

    moveableRef.current.on("resize", ({ target: tgt, width, height, drag }) => {
      if (!tgt) return;
      const imgEl = tgt as HTMLImageElement;
      imgEl.style.width = `${width}px`;
      imgEl.style.height = `${height}px`;
      imgEl.style.left = `${drag.left}px`;
      imgEl.style.top = `${drag.top}px`;
    });

    moveableRef.current.on("resizeEnd", ({ target: tgt }) => {
      if (!tgt || !containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const imgEl = tgt as HTMLImageElement;
      const width = parseFloat(imgEl.style.width) || 0;
      const height = parseFloat(imgEl.style.height) || 0;
      const left = parseFloat(imgEl.style.left) || 0;
      const top = parseFloat(imgEl.style.top) || 0;
      const imgW = (width / cw) * 100;
      const x = ((left + width / 2) / cw) * 100;
      const y = ((top + height / 2) / ch) * 100;
      const idx = selectedRef.current;
      if (idx !== null) {
        const updated = [...imagesRef.current];
        updated[idx] = { ...updated[idx], imgW, x, y };
        onSaveRef.current(updated);
      }
    });

    moveableRef.current.on("rotateStart", () => {});

    moveableRef.current.on("rotate", ({ target: tgt, rotate }) => {
      if (!tgt) return;
      (tgt as HTMLImageElement).style.transform = `rotate(${rotate}deg)`;
    });

    moveableRef.current.on("rotateEnd", ({ target: tgt }) => {
      if (!tgt) return;
      const imgEl = tgt as HTMLImageElement;
      const match = imgEl.style.transform.match(/rotate\(([-\d.]+)deg\)/);
      const rotation = match ? parseFloat(match[1]) : 0;
      const idx = selectedRef.current;
      if (idx !== null) {
        const updated = [...imagesRef.current];
        updated[idx] = { ...updated[idx], rotation };
        onSaveRef.current(updated);
      }
    });

    return () => {
      moveableRef.current?.destroy();
      moveableRef.current = null;
    };
  }, [selectedIndex]);

  const handleDeselect = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setSelectedIndex(null);
    }
  }, []);

  const handleRemove = useCallback((index: number) => {
    const updated = imagesRef.current.filter((_: PageImage, i: number) => i !== index);
    onSaveRef.current(updated);
    setSelectedIndex(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: isEditing ? 20 : 5, pointerEvents: isEditing && selectedIndex !== null ? "auto" : "none" }}
      onClick={handleDeselect}
    >
      {images.map((img, index) => {
        const containerW = containerRef.current?.clientWidth || 0;
        const containerH = containerRef.current?.clientHeight || 0;
        const cx = ((img.x ?? 50) / 100) * containerW;
        const cy = ((img.y ?? 50) / 100) * containerH;
        const imgWPx = ((img.imgW ?? 25) / 100) * containerW;
        const aspect = img.height / img.width;
        const imgHPx = imgWPx * aspect;
        const left = cx - imgWPx / 2;
        const top = cy - imgHPx / 2;
        const isSelected = isEditing && selectedIndex === index;
        const rotation = img.rotation ?? 0;

        return (
          <img
            key={img.public_id}
            ref={(el) => setImageEl(index, el)}
            src={img.url}
            alt={img.caption || `Image ${index + 1}`}
            className="absolute select-none"
            draggable={false}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${imgWPx}px`,
              height: `${imgHPx}px`,
              objectFit: "contain",
              transform: `rotate(${rotation}deg)`,
              border: isSelected ? "2px solid #d4af37" : "none",
              borderRadius: 2,
              cursor: isEditing ? "move" : "default",
              pointerEvents: isEditing ? "auto" : "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) setSelectedIndex(index);
            }}
          />
        );
      })}

      {isEditing && selectedIndex !== null && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove(selectedIndex);
          }}
          className="absolute w-6 h-6 bg-[#2d0a1b]/90 rounded-full text-[#d4af37] text-xs flex items-center justify-center hover:bg-[#4d1a2b] transition-colors"
          style={{
            zIndex: 30,
            pointerEvents: "auto",
            left: `${(() => {
              const img = images[selectedIndex];
              if (!containerRef.current) return "50%";
              const cw = containerRef.current.clientWidth;
              const imgWPx = ((img.imgW ?? 25) / 100) * cw;
              const cx = ((img.x ?? 50) / 100) * cw;
              return `${cx + imgWPx / 2 + 4}px`;
            })()}`,
            top: `${(() => {
              const img = images[selectedIndex];
              if (!containerRef.current) return "50%";
              const ch = containerRef.current.clientHeight;
              const cw = containerRef.current.clientWidth;
              const imgWPx = ((img.imgW ?? 25) / 100) * cw;
              const aspect = img.height / img.width;
              const imgHPx = imgWPx * aspect;
              const cy = ((img.y ?? 50) / 100) * ch;
              return `${cy - imgHPx / 2 - 12}px`;
            })()}`,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
