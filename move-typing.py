import sys

def move_typing_indicator():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Remove the old input container
    old_input_block = """      {/* Input */}
      <div className="flex-none max-w-3xl mx-auto w-full px-4 sm:px-6 z-10 flex flex-col justify-end pointer-events-none mb-2">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              className="self-start bg-black/60 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 mb-2 pointer-events-auto shadow-lg backdrop-blur-md"
            >
              <span className="text-xs text-white/50">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
              <div className="flex gap-1">
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>"""
      
    if old_input_block in code:
        code = code.replace(old_input_block, "")
    else:
        print("Warning: Could not find old input block.")

    # 2. Inject new bubble before messagesEndRef
    new_bubble = """          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className="flex flex-col items-start relative p-2 -mx-2"
              >
                <span className="text-xs text-[#8a7a6a]/70 uppercase tracking-widest mb-1 ml-2 font-[family-name:var(--font-playfair)]">
                  {typingUsers.join(', ')}
                </span>
                <div className="px-5 py-4 rounded-2xl bg-black/80 rounded-bl-sm border border-white/10 shadow-black/50 shadow-lg flex items-center gap-1.5">
                  <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                  <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                  <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#d4af37]/70 rounded-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4" />"""
          
    code = code.replace('<div ref={messagesEndRef} className="h-4" />', new_bubble)
    
    # 3. Add scroll effect for typing indicator
    scroll_effect = """  // Auto-scroll when someone starts typing
  useEffect(() => {
    if (typingUsers.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [typingUsers]);

  if (isCheckingAuth) {"""
    
    code = code.replace("  if (isCheckingAuth) {", scroll_effect)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Success")

move_typing_indicator()
