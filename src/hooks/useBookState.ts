"use client";

import { useState, useEffect, useCallback } from "react";
import type { NotebookPage } from "@/types";

export function useBookState() {
  const [isLocked, setIsLocked] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/verify");
      if (res.ok) {
        setIsLocked(false);
      }
    } catch {
      setIsLocked(true);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsLocked(true);
    setIsEditing(false);
  }, []);

  const toggleEditing = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  return {
    isLocked,
    isEditing,
    isLoading,
    isInitialized,
    unlock,
    logout,
    toggleEditing,
  };
}
