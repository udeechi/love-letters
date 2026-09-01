import sys
import re

def update_stickers():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Interface
    if "interface CustomSticker" not in code:
        code = code.replace(
            "interface Message {",
            "interface CustomSticker {\n  id: string;\n  url: string;\n  uploadedBy: string;\n}\n\ninterface Message {"
        )

    # 2. Remove old STICKERS and add states
    if "const STICKERS =" in code:
        old_stickers_block = code[code.find("const STICKERS ="):code.find("export default function ChatPage() {")]
        code = code.replace(old_stickers_block, "")
    
    state_injection = '''const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSticker, setIsUploadingSticker] = useState(false);'''
    code = code.replace('const [showStickerPicker, setShowStickerPicker] = useState(false);', state_injection)

    # 3. Inject Listener
    listener_injection = '''      // Stickers
      const stickersQuery = query(collection(db, "stickers"), orderBy("createdAt", "desc"));
      const unsubscribeStickers = onSnapshot(stickersQuery, (snapshot) => {
        const fetchedStickers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CustomSticker[];
        setCustomStickers(fetchedStickers);
      });
      
      // Global Background'''
    code = code.replace('// Global Background', listener_injection)

    # 4. Inject cleanup
    code = code.replace(
        'unsubscribeTyping();\n    };\n  }, [isLoggedIn',
        'unsubscribeTyping();\n      unsubscribeStickers();\n    };\n  }, [isLoggedIn'
    )

    # 5. Inject upload logic (find a good place, e.g., above handleFileChange)
    upload_logic = '''  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSticker(true);
    try {
      const uploadData = await uploadToCloudinary(file);
      if (uploadData) {
        await addDoc(collection(db, "stickers"), {
          url: uploadData.secure_url,
          uploadedBy: username,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Sticker upload error:", error);
      alert("Failed to upload sticker.");
    } finally {
      setIsUploadingSticker(false);
      if (stickerInputRef.current) stickerInputRef.current.value = "";
    }
  };

  const handleDeleteSticker = async (stickerId: string) => {
    try {
      await deleteDoc(doc(db, "stickers", stickerId));
    } catch(error) {
      console.error("Failed to delete sticker", error);
    }
  };

  const handleFileChange ='''
    code = code.replace('const handleFileChange =', upload_logic)

    # 6. Update Sticker UI
    old_sticker_ui_start = '{showStickerPicker && ('
    old_sticker_ui_end = ')}'
    
    # Extract the block
    start_idx = code.find(old_sticker_ui_start)
    end_idx = code.find('</AnimatePresence>', start_idx)
    old_block = code[start_idx:end_idx]

    new_block = '''{showStickerPicker && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-[60px] right-14 w-72 bg-[#1a1a1a] border border-[#d4af37]/30 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col max-h-[300px]">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[#d4af37] font-[family-name:var(--font-playfair)] text-sm">Stickers</h3>
                      <button type="button" onClick={() => stickerInputRef.current?.click()} className="text-xs bg-[#d4af37]/20 text-[#d4af37] px-2 py-1 rounded hover:bg-[#d4af37]/30 transition-colors">
                        {isUploadingSticker ? "Uploading..." : "+ Add"}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto min-h-0 flex-1 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4af37 transparent' }}>
                      {customStickers.length === 0 && !isUploadingSticker && (
                        <div className="col-span-3 text-center text-[#8a7a6a] text-xs py-4">No stickers yet. Add one!</div>
                      )}
                      {customStickers.map((sticker) => (
                        <div key={sticker.id} className="relative group aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/5">
                          <button type="button" onClick={() => {
                            const payload = { sender: username, createdAt: serverTimestamp(), attachmentUrl: sticker.url, attachmentType: 'image' };
                            addDoc(collection(db, "messages"), payload);
                            setShowStickerPicker(false);
                            virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
                          }} className="w-full h-full hover:scale-105 transition-transform">
                            <img src={sticker.url} alt="sticker" className="w-full h-full object-cover" />
                          </button>
                          {sticker.uploadedBy === username && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteSticker(sticker.id); }} className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-red-500/30">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <input type="file" accept="image/jpeg, image/png, image/gif, image/webp" ref={stickerInputRef} className="hidden" onChange={handleStickerUpload} />
                  </motion.div>
                )}
              '''
    code = code.replace(old_block, new_block)

    # 7. Update Sticker Button Icon
    old_icon = '''<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                      <path d="M15.5 15.5L21 21"></path>
                      <path d="M21 16v5h-5"></path>
                    </svg>'''
    new_icon = '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.5 3H8.5C5.462 3 3 5.462 3 8.5v7C3 18.538 5.462 21 8.5 21h7c3.038 0 5.5-2.462 5.5-5.5v-7C21 5.462 18.538 3 15.5 3z" />
                      <path d="M15 21l6-6" />
                      <path d="M15 21v-4.5C15 15.672 15.672 15 16.5 15H21" />
                      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
                      <path d="M9.5 14c1 1.5 3 1.5 4 0" />
                    </svg>'''
    code = code.replace(old_icon, new_icon)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Stickers dynamically configured")

update_stickers()
