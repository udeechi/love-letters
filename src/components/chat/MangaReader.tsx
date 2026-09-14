"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, update, get } from "firebase/database";

interface MangaReaderProps {
  username: string;
  onClose: () => void;
}

interface MangaState {
  isActive: boolean;
  mangaId: string | null;
  scrollPercentage: number;
  controllerId: string | null;
  lastActiveTimestamp: number;
  controlRequests: Record<string, boolean>;
}

export default function MangaReader({ username, onClose }: MangaReaderProps) {
  const [mangaState, setMangaState] = useState<MangaState | null>(null);
  const [images, setImages] = useState<{ url: string; w: number; h: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingByCodeRef = useRef(false);

  // Sync with Firebase RTDB
  useEffect(() => {
    const mangaRef = ref(rtdb, "mangaSession");
    
    const unsubscribe = onValue(mangaRef, (snapshot) => {
      const data = snapshot.val() as MangaState | null;
      if (data) {
        setMangaState(data);
        
        // If someone else is controlling and scrolling, update our scroll position
        if (data.controllerId !== username && scrollContainerRef.current) {
          isScrollingByCodeRef.current = true;
          const container = scrollContainerRef.current;
          const targetScroll = (data.scrollPercentage / 100) * (container.scrollHeight - container.clientHeight);
          container.scrollTop = targetScroll;
          // Reset the flag after a tiny delay
          setTimeout(() => {
            isScrollingByCodeRef.current = false;
          }, 50);
        }
      } else {
        // Initialize if empty
        set(mangaRef, {
          isActive: true,
          mangaId: null,
          scrollPercentage: 0,
          controllerId: null,
          lastActiveTimestamp: Date.now(),
          controlRequests: {}
        });
      }
    });

    return () => unsubscribe();
  }, [username]);

  // Load Manga Images when mangaId changes
  useEffect(() => {
    if (mangaState?.mangaId) {
      setIsLoading(true);
      fetch(`/api/manga?action=get&id=${mangaState.mangaId}`)
        .then(r => r.json())
        .then(data => {
          if (data.images && data.images.pages) {
            setImages(data.images.pages);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setImages([]);
    }
  }, [mangaState?.mangaId]);

  // Handle Scroll to grab control
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingByCodeRef.current || !mangaState) return;

    const container = e.currentTarget;
    const percentage = (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100;
    
    const now = Date.now();
    const isIdle = (now - mangaState.lastActiveTimestamp) > 3000;
    const isController = mangaState.controllerId === username;

    // If no one is controlling, or current controller is idle, GRAB CONTROL
    if (!mangaState.controllerId || isIdle || isController) {
      update(ref(rtdb, "mangaSession"), {
        scrollPercentage: percentage,
        controllerId: username,
        lastActiveTimestamp: now,
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    // If it's a 6-digit code
    if (/^\d{1,6}$/.test(searchInput.trim())) {
      update(ref(rtdb, "mangaSession"), {
        mangaId: searchInput.trim(),
        scrollPercentage: 0,
        controllerId: username,
        lastActiveTimestamp: Date.now()
      });
      setSearchInput("");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/manga?action=search&query=${encodeURIComponent(searchInput)}`);
      const data = await res.json();
      if (data.result) {
        setSearchResults(data.result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectManga = (id: string) => {
    update(ref(rtdb, "mangaSession"), {
      mangaId: id,
      scrollPercentage: 0,
      controllerId: username,
      lastActiveTimestamp: Date.now()
    });
    setSearchResults([]);
  };

  const requestControl = () => {
    update(ref(rtdb, `mangaSession/controlRequests`), {
      [username]: true
    });
  };

  const grantControl = (toUser: string) => {
    update(ref(rtdb, "mangaSession"), {
      controllerId: toUser,
      lastActiveTimestamp: Date.now(),
      controlRequests: null
    });
  };

  const closeReader = () => {
    // We don't destroy the session for the other person, just hide UI locally
    onClose();
  };

  // Render logic
  const currentController = mangaState?.controllerId;
  const isIdle = mangaState ? (Date.now() - mangaState.lastActiveTimestamp) > 3000 : false;
  const iAmController = currentController === username;
  const canControl = !currentController || iAmController || isIdle;
  const requests = mangaState?.controlRequests ? Object.keys(mangaState.controlRequests) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute inset-0 z-[100] bg-[#0d0a0f] flex flex-col"
    >
      {/* Header */}
      <div className="flex-none h-16 border-b border-white/5 flex items-center justify-between px-4 bg-black/40">
        <div className="flex items-center gap-4">
          <button onClick={closeReader} className="text-[#8a7a6a] hover:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className="text-[#d4af37] font-[family-name:var(--font-playfair)] text-lg">Shared Library</h2>
        </div>

        {/* Sync Status / Remote Control indicator */}
        {mangaState?.mangaId && (
          <div className="flex items-center gap-3">
            {canControl ? (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                You have control
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  {currentController} is reading
                </span>
                <button onClick={requestControl} className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white">Request Control</button>
              </div>
            )}

            {/* If I am controller, show requests */}
            {iAmController && requests.length > 0 && (
              <div className="flex items-center gap-2 bg-[#d4af37]/20 px-3 py-1 rounded border border-[#d4af37]/30">
                <span className="text-[#d4af37] text-xs">{requests[0]} wants control</span>
                <button onClick={() => grantControl(requests[0])} className="text-xs bg-[#d4af37] text-black px-2 py-0.5 rounded font-bold hover:bg-[#ebd077]">Grant</button>
              </div>
            )}
            
            <button onClick={() => update(ref(rtdb, "mangaSession"), { mangaId: null })} className="text-xs text-white/50 hover:text-white ml-4">Close Manga</button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {!mangaState?.mangaId ? (
          /* Browser / Search View */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8 relative">
              <input 
                type="text" 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by title, character, or enter a 6-digit code..."
                className="w-full bg-black/60 border border-white/10 rounded-full px-6 py-4 text-[#e8dcc8] placeholder:text-[#8a7a6a] focus:outline-none focus:border-[#d4af37]/50"
              />
              <button type="submit" className="absolute right-2 top-2 bottom-2 px-6 bg-[#d4af37]/20 text-[#d4af37] rounded-full hover:bg-[#d4af37]/40 font-medium">
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {searchResults.map((m: any) => (
                  <div key={m.id} onClick={() => selectManga(m.id)} className="cursor-pointer group relative">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black/60 border border-white/5 group-hover:border-[#d4af37]/50 transition-colors">
                      <img src={`/api/manga/image?url=${encodeURIComponent(m.cover_url)}`} alt={m.title.english} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                    </div>
                    <p className="mt-2 text-sm text-[#e8dcc8] line-clamp-2 font-medium">{m.title.english}</p>
                    <p className="text-xs text-[#8a7a6a]">{m.num_pages} pages</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Reader View */
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto w-full flex flex-col items-center bg-black"
          >
            {isLoading ? (
              <div className="my-auto text-[#d4af37] animate-pulse">Loading pages...</div>
            ) : (
              <div className="w-full max-w-4xl flex flex-col">
                {images.map((img, i) => (
                  <img 
                    key={i} 
                    src={`/api/manga/image?url=${encodeURIComponent(img.url)}`} 
                    alt={`Page ${i + 1}`} 
                    className="w-full h-auto block" 
                    loading="lazy" 
                  />
                ))}
                <div className="py-20 text-center text-[#8a7a6a] text-sm">End of Chapter</div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
