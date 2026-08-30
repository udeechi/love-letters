"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { NotebookPage } from "@/types";
import { getSupabase } from "@/lib/supabase";

export function useNotebook() {
  const [pages, setPages] = useState<NotebookPage[]>([]);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  const leftPage = pages[currentSpread * 2] || null;
  const rightPage = pages[currentSpread * 2 + 1] || null;

  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel("realtime:pages", {
        config: { broadcast: { self: false } }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pages" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedPage = payload.new as NotebookPage;
            setPages((prev) =>
              prev.map((p) => (p.id === updatedPage.id ? updatedPage : p))
            );
          } else if (payload.eventType === "INSERT") {
            const newPage = payload.new as NotebookPage;
            setPages((prev) => {
              if (prev.find((p) => p.id === newPage.id)) return prev;
              return [...prev, newPage].sort(
                (a, b) => a.page_number - b.page_number
              );
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setPages((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .on("broadcast", { event: "*" }, (payload: any) => {
        // We will dispatch a custom event on window so Book.tsx can listen easily
        // without needing to pass callbacks down through the hook
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("notebook-broadcast", { detail: payload }));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const broadcast = useCallback((event: string, payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      }).catch(console.error);
    }
  }, []);

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

  const updatePage = useCallback(
    async (pageId: string, updates: { content?: string; images?: NotebookPage["images"] }) => {
      setIsSaving(true);
      try {
        const res = await fetch(`/api/pages/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          const data = await res.json();
          setPages((prev) =>
            prev.map((p) => (p.id === pageId ? data.page : p))
          );
        }
      } catch (error) {
        console.error("Failed to update page:", error);
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
        const newSpread = Math.floor((newPages.length - 1) / 2);
        setCurrentSpread(newSpread);
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
    updatePage,
    createPage,
    deletePage,
    nextSpread,
    prevSpread,
    setCurrentSpread,
    broadcast,
  };
}
