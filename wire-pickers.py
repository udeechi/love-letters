import sys

def wire_up_pickers():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Imports
    if "import EmojiPicker" not in code:
        code = code.replace(
            'import { Virtuoso, VirtuosoHandle } from "react-virtuoso";',
            'import { Virtuoso, VirtuosoHandle } from "react-virtuoso";\nimport EmojiPicker, { Theme } from "emoji-picker-react";'
        )

    # 2. Stickers and States
    state_injection = '''const STICKERS = [
  "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
  "https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif",
  "https://media.giphy.com/media/Ge86XF8AVY1KE/giphy.gif",
  "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
  "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
  "https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif"
];

export default function ChatPage() {'''
    code = code.replace('export default function ChatPage() {', state_injection)

    state_vars_injection = '''const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const pickerRef = useRef<HTMLFormElement>(null);'''
    code = code.replace('const [newMessage, setNewMessage] = useState("");', state_vars_injection)

    # 3. UseEffect for click outside
    effect_injection = '''  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowStickerPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check auth status on mount'''
    code = code.replace('  // Check auth status on mount', effect_injection)

    # 4. Form and Popups
    old_form = '<form onSubmit={handleSend} className="flex gap-3 h-12">'
    new_form = '''<form onSubmit={handleSend} className="flex gap-3 h-12 relative" ref={pickerRef}>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-[60px] left-14 z-[60]">
                    <EmojiPicker theme={Theme.DARK} onEmojiClick={(emojiData) => setNewMessage(prev => prev + emojiData.emoji)} />
                  </motion.div>
                )}
                {showStickerPicker && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-[60px] right-14 w-72 bg-[#1a1a1a] border border-[#d4af37]/30 rounded-2xl p-4 shadow-2xl z-[60]">
                    <h3 className="text-[#d4af37] font-[family-name:var(--font-playfair)] mb-3 text-sm">Send a Sticker</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {STICKERS.map((url, i) => (
                        <button key={i} type="button" onClick={() => {
                          const payload = { sender: username, createdAt: serverTimestamp(), attachmentUrl: url, attachmentType: 'image' };
                          addDoc(collection(db, "messages"), payload);
                          setShowStickerPicker(false);
                          virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
                        }} className="aspect-square rounded-lg overflow-hidden hover:scale-105 hover:ring-2 ring-[#d4af37]/50 transition-all bg-black/40">
                          <img src={url} alt="sticker" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>'''
    code = code.replace(old_form, new_form)

    # 5. Connect Emoji Button
    old_emoji_btn = '<button type="button" className="absolute left-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Emoji">'
    new_emoji_btn = '<button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} type="button" className="absolute left-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Emoji">'
    code = code.replace(old_emoji_btn, new_emoji_btn)

    # 6. Connect Sticker Button
    old_sticker_btn = '<button type="button" className="absolute right-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Stickers">'
    new_sticker_btn = '<button onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }} type="button" className="absolute right-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Stickers">'
    code = code.replace(old_sticker_btn, new_sticker_btn)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Pickers wired up")

wire_up_pickers()
