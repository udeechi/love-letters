import sys
import re

def fix_all():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Add highlightedMessageId state
    state_injection = """  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);"""
    code = code.replace("  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);", state_injection)

    # 2. Add scrollToMessage function
    scroll_fn = """  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(id);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };"""
    code = code.replace("""  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };""", scroll_fn)

    # 3. Update main wrapper className
    code = code.replace(
        'className={`flex flex-col ${isMe ? "items-end" : "items-start"}`} id={msg.id}',
        'className={`flex flex-col ${isMe ? "items-end" : "items-start"} relative p-2 -mx-2 rounded-2xl transition-colors duration-500 ${highlightedMessageId === msg.id ? "bg-white/10" : "bg-transparent"}`} id={msg.id}'
    )

    # 4. Inject reply quote box in chat history
    quote_box = """                  </span>
                  
                  {msg.replyToId && (() => {
                    const replyMsg = messages.find(m => m.id === msg.replyToId);
                    if (!replyMsg) return null;
                    return (
                      <div 
                        onClick={() => scrollToMessage(msg.replyToId!)} 
                        className={`mb-2 z-0 px-4 py-2 rounded-xl text-xs bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition-colors max-w-[85%] sm:max-w-[70%] overflow-hidden shadow-sm ${isMe ? 'mr-1' : 'ml-1'}`}
                      >
                        <div className="text-[#d4af37] opacity-90 font-bold mb-0.5 font-[family-name:var(--font-playfair)]">
                          {replyMsg.sender}
                        </div>
                        <div className="truncate text-white/70 font-sans">
                          {replyMsg.text || (replyMsg.attachmentType ? `[${replyMsg.attachmentType}]` : "...")}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Media Attachment - Rendered OUTSIDE the text bubble */}"""
    code = code.replace(
        """                  </span>
                  
                  {/* Media Attachment - Rendered OUTSIDE the text bubble */}""", 
        quote_box
    )

    # 5. Fix Action Menu alignment
    code = code.replace(
        'className="flex gap-2 overflow-hidden justify-end mr-1"',
        'className={`flex gap-2 overflow-hidden ${isMe ? "justify-end mr-1" : "justify-start ml-2"}`}'
    )

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Success")

fix_all()
