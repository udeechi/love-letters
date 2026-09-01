import sys
import re

def refactor_virtuoso():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Imports
    if "react-virtuoso" not in code:
        code = code.replace(
            'import { motion, AnimatePresence } from "framer-motion";',
            'import { motion, AnimatePresence } from "framer-motion";\nimport { Virtuoso, VirtuosoHandle } from "react-virtuoso";'
        )

    # 2. Add limit to firestore
    code = code.replace(
        'onSnapshot, addDoc',
        'onSnapshot, addDoc, limit'
    )

    # 3. Add states
    if "virtuosoRef" not in code:
        code = code.replace(
            'const [messages, setMessages] = useState<Message[]>([]);',
            '''const [messages, setMessages] = useState<Message[]>([]);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);'''
        )

    # 4. Update the Message query
    old_query = '''    // Messages
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });'''
    
    new_query = '''    // Messages
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(messageLimit));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs.reverse());
      setHasMore(snapshot.docs.length === messageLimit);
    });'''
    
    if old_query in code:
        code = code.replace(old_query, new_query)
    else:
        print("Failed to replace old query")

    # 5. Remove the old auto-scroll on typing since Virtuoso Footer handles it
    old_scroll = '''  useEffect(() => {
    if (typingUsers.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [typingUsers]);'''
    
    code = code.replace(old_scroll, "")

    # 6. Extract the inner motion.div from messages.map
    # Find the start of the return statement inside messages.map
    map_start_idx = code.find('return (\n                <motion.div')
    map_end_idx = code.find('              </motion.div>\n            )}\n          </AnimatePresence>\n          <div ref={messagesEndRef} className="h-4" />')
    
    inner_msg_markup = code[map_start_idx:map_end_idx].replace('return (\n', '', 1).rstrip()
    
    # Wait, the AnimatePresence at the end is for the typing indicator! We need to extract that too.
    typing_ind_start = code.find('<AnimatePresence>\n            {typingUsers.length > 0')
    typing_ind_end = code.find('          <div ref={messagesEndRef} className="h-4" />')
    
    typing_indicator = code[typing_ind_start:typing_ind_end].strip()

    # 7. Replace the entire <motion.main> block
    main_start = code.find('<motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="flex-1 overflow-y-auto')
    main_end = code.find('</motion.main>') + len('</motion.main>')
    
    new_main = f'''      <motion.main initial={{{{ opacity: 0 }}}} animate={{{{ opacity: 1 }}}} transition={{{{ duration: 0.8, delay: 0.2 }}}} className="flex-1 relative z-10 flex flex-col min-h-0">
        <Virtuoso
          ref={{virtuosoRef}}
          className="w-full h-full"
          data={{messages}}
          initialTopMostItemIndex={{messages.length > 0 ? messages.length - 1 : 0}}
          followOutput={{(isAtBottom) => isAtBottom ? 'smooth' : false}}
          atBottomStateChange={{(atBottom) => setShowScrollBottom(!atBottom)}}
          startReached={{() => {{
            if (hasMore && !loadingMore) {{
              setLoadingMore(true);
              setMessageLimit(prev => prev + 50);
              setTimeout(() => setLoadingMore(false), 500);
            }}
          }}}}
          components={{{{
            Header: () => (
              messages.length === 0 ? (
                <div className="text-center text-[#8a7a6a]/60 font-[family-name:var(--font-lora)] text-lg italic mt-20">
                  The room is silent. Start a whisper...
                </div>
              ) : (
                <div className="h-4" />
              )
            ),
            Footer: () => (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {typing_indicator}
                <div className="h-4" />
              </div>
            )
          }}}}
          itemContent={{(index, msg) => {{
            const isMe = msg.sender === username;
            const isActive = activeMessageId === msg.id;
            const isEditing = editingMessageId === msg.id;

            return (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 w-full">
                {inner_msg_markup}
              </div>
            );
          }}}}
        />
        
        <AnimatePresence>
          {{showScrollBottom && (
            <motion.button
              initial={{{{ opacity: 0, scale: 0.8, y: 20 }}}}
              animate={{{{ opacity: 1, scale: 1, y: 0 }}}}
              exit={{{{ opacity: 0, scale: 0.8, y: 20 }}}}
              onClick={{() => virtuosoRef.current?.scrollToIndex({{ index: messages.length - 1, behavior: 'smooth' }})}}
              className="absolute bottom-6 right-6 lg:right-12 bg-black/80 border border-[#d4af37]/30 text-[#d4af37] p-3 rounded-full shadow-lg z-50 hover:bg-[#d4af37]/20 transition-colors backdrop-blur-md"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </motion.button>
          )}}
        </AnimatePresence>
      </motion.main>'''

    code = code[:main_start] + new_main + code[main_end:]

    # Remove messagesEndRef initialization since it's no longer used
    code = code.replace('const messagesEndRef = useRef<HTMLDivElement>(null);', '')

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Virtuoso injection complete")

refactor_virtuoso()
