"use client";

import { useState, useCallback } from "react";
import type { NotebookPage } from "@/types";

export function useNotebook() {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  const leftPage = pages[currentSpread * 2] || null;
  const rightPage = pages[currentSpread * 2 + 1] || null;

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const savePage = useCallback(
    async (pageId: string, content: string, images?: NotebookPage["images"]) => {
      setIsSaving(true);
      try {
        const body: { content: string; images?: NotebookPage["images"] } = { content };
        if (images) body.images = images;

        const res = await fetch(`/api/pages/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          setPages((prev) =>
            prev.map((p) => (p.id === pageId ? data.page : p))
          );
        }
      } catch (error) {
        console.error("Failed to save page:", error);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const createPage = useCallback(async () => {
    setIsSaving(true);
    try {
      const maxPageNum = pages.reduce(
        (max, p) => Math.max(max, p.page_number),
        0
      );
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_number: maxPageNum + 1 }),
      });

      if (res.ok) {
        const data = await res.json();
        const newPages = [...pages, data.page];
        setPages(newPages);
        setCurrentSpread(Math.floor((newPages.length - 1) / 2));
      }
    } catch (error) {
      console.error("Failed to create page:", error);
    } finally {
      setIsSaving(false);
    }
  }, [pages]);

  const deletePage = useCallback(
    async (pageId: string) => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/pages/${pageId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setPages((prev) => {
            const filtered = prev.filter((p) => p.id !== pageId);
            return filtered.map((p, i) => ({ ...p, page_number: i + 1 }));
          });
          const newTotal = pages.length - 1;
          const newSpread = Math.min(
            currentSpread,
            Math.max(0, Math.ceil(newTotal / 2) - 1)
          );
          setCurrentSpread(newSpread);
        }
      } catch (error) {
        console.error("Failed to delete page:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [currentSpread, pages.length]
  );

  const nextSpread = useCallback(() => {
    if (currentSpread < totalSpreads - 1) {
      setCurrentSpread((s) => s + 1);
      return true;
    }
    return false;
  }, [currentSpread, totalSpreads]);

  const prevSpread = useCallback(() => {
    if (currentSpread > 0) {
      setCurrentSpread((s) => s - 1);
      return true;
    }
    return false;
  }, [currentSpread]);

  return {
    pages,
    currentSpread,
    totalSpreads,
    leftPage,
    rightPage,
    isLoading,
    isSaving,
    fetchPages,
    savePage,
    createPage,
    deletePage,
    nextSpread,
    prevSpread,
    setCurrentSpread,
  };
}
