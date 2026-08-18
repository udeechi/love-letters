"use client";

import { useState, useCallback } from "react";
import type { NotebookPage } from "@/types";

export function useNotebook() {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        setPages((prev) => [...prev, data.page]);
        setCurrentPageIndex(pages.length);
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
          if (currentPageIndex >= pages.length - 1) {
            setCurrentPageIndex(Math.max(0, pages.length - 2));
          }
        }
      } catch (error) {
        console.error("Failed to delete page:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [currentPageIndex, pages.length]
  );

  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < pages.length) {
        setCurrentPageIndex(index);
      }
    },
    [pages.length]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPageIndex + 1);
  }, [currentPageIndex, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPageIndex - 1);
  }, [currentPageIndex, goToPage]);

  return {
    pages,
    currentPageIndex,
    currentPage: pages[currentPageIndex] || null,
    isLoading,
    isSaving,
    totalPages: pages.length,
    fetchPages,
    savePage,
    createPage,
    deletePage,
    goToPage,
    nextPage,
    prevPage,
  };
}
