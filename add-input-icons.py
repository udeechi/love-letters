import sys

def inject_icons():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # Find the input HTML
    start_idx = code.find('<motion.input layoutId="recording-box"')
    if start_idx == -1:
        print("Could not find input")
        return
        
    end_idx = code.find('/>', start_idx) + 2
    
    old_input = code[start_idx:end_idx]
    
    new_input = '''<div className="flex-1 relative flex items-center min-w-0">
                  <button type="button" className="absolute left-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Emoji">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </button>

                  <motion.input layoutId="recording-box" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 2px rgba(212,175,55,0.3)" }} type="text" value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Whisper something..."
                    className="w-full bg-black/60 border border-[#d4af37]/30 rounded-full pl-12 pr-12 py-[11px] text-base text-[#f5edd6] focus:outline-none focus:border-[#d4af37]/60 shadow-inner"
                  />

                  <button type="button" className="absolute right-4 text-[#8a7a6a] hover:text-[#d4af37] transition-colors z-10" title="Stickers">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                      <path d="M15.5 15.5L21 21"></path>
                      <path d="M21 16v5h-5"></path>
                    </svg>
                  </button>
                </div>'''

    code = code[:start_idx] + new_input + code[end_idx:]

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Injected successfully")

inject_icons()
