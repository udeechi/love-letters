import sys

def inject_features():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()
    
    # 1. Imports
    if "firebase/database" not in code:
        code = code.replace(
            "import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from \"firebase/firestore\";",
            "import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from \"firebase/firestore\";\nimport { ref, onValue, set, onDisconnect, remove } from \"firebase/database\";"
        )
        code = code.replace(
            "import { db, auth } from \"@/lib/firebase\";",
            "import { db, auth, rtdb } from \"@/lib/firebase\";"
        )

    # 2. Interface Message
    if "replyToId?: string" not in code:
        code = code.replace(
            "  isEdited?: boolean;\n}",
            "  isEdited?: boolean;\n  replyToId?: string;\n}"
        )

    # 3. States
    if "const [replyingTo, setReplyingTo]" not in code:
        code = code.replace(
            "  const [editMessageText, setEditMessageText] = useState(\"\");",
            "  const [editMessageText, setEditMessageText] = useState(\"\");\n  const [typingUsers, setTypingUsers] = useState<string[]>([]);\n  const [replyingTo, setReplyingTo] = useState<Message | null>(null);\n  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);"
        )

    # 4. useEffect RTDB typing
    if "const typingRef =" not in code:
        old_return = """    return () => {
      unsubscribeMessages();
      unsubscribeBg();
    };
  }, [isLoggedIn]);"""
        
        new_return = """    const typingRef = ref(rtdb, "typing");
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typers = Object.keys(data).filter(user => user !== username && data[user] === true);
        setTypingUsers(typers);
      } else {
        setTypingUsers([]);
      }
    });

    if (username) {
      const myTypingRef = ref(rtdb, `typing/${username}`);
      onDisconnect(myTypingRef).remove();
    }

    return () => {
      unsubscribeMessages();
      unsubscribeBg();
      unsubscribeTyping();
    };
  }, [isLoggedIn, username]);"""
        code = code.replace(old_return, new_return)

    # 5. handleTyping and handleSend
    if "const handleTyping =" not in code:
        old_send = """  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const text = newMessage;
    setNewMessage(\"\");

    try {
      await addDoc(collection(db, \"messages\"), {
        text: text,
        sender: username,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(\"Error sending message:\", error);
    }
  };"""
        
        new_send = """  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (!username) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      set(ref(rtdb, `typing/${username}`), true).catch(() => {});
    }

    typingTimeoutRef.current = setTimeout(() => {
      remove(ref(rtdb, `typing/${username}`)).catch(() => {});
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const text = newMessage;
    setNewMessage(\"\");
    const payload: any = {
      text: text,
      sender: username,
      createdAt: serverTimestamp(),
    };
    if (replyingTo) payload.replyToId = replyingTo.id;

    try {
      await addDoc(collection(db, \"messages\"), payload);
      setReplyingTo(null);
      remove(ref(rtdb, `typing/${username}`)).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error(\"Error sending message:\", error);
    }
  };"""
        code = code.replace(old_send, new_send)

        # Fix the onChange to use handleTyping
        code = code.replace(
            "onChange={(e) => setNewMessage(e.target.value)}",
            "onChange={(e) => handleTyping(e.target.value)}"
        )

    # 6. Attachment handleFileChange
    if "if (replyingTo) payload.replyToId = replyingTo.id;" not in code.split("handleFileChange")[1][:500]:
        old_add_doc_file = """        await addDoc(collection(db, \"messages\"), {
          text: \"\", // Optional text, maybe future caption support
          attachmentUrl: uploadData.secure_url,
          attachmentType: isVideo ? \"video\" : \"image\",
          sender: username,
          createdAt: serverTimestamp(),
        });"""
        new_add_doc_file = """        const payload: any = {
          text: \"\", // Optional text, maybe future caption support
          attachmentUrl: uploadData.secure_url,
          attachmentType: isVideo ? \"video\" : \"image\",
          sender: username,
          createdAt: serverTimestamp(),
        };
        if (replyingTo) payload.replyToId = replyingTo.id;
        await addDoc(collection(db, \"messages\"), payload);
        setReplyingTo(null);"""
        code = code.replace(old_add_doc_file, new_add_doc_file)

    # 7. Attachment Audio
    if "if (replyingTo) payload.replyToId = replyingTo.id;" not in code.split("handleAudioUpload")[1][:500]:
        old_add_doc_audio = """        await addDoc(collection(db, \"messages\"), {
          text: \"\", 
          attachmentUrl: uploadData.secure_url,
          attachmentType: \"audio\",
          sender: username,
          createdAt: serverTimestamp(),
        });"""
        new_add_doc_audio = """        const payload: any = {
          text: \"\", 
          attachmentUrl: uploadData.secure_url,
          attachmentType: \"audio\",
          sender: username,
          createdAt: serverTimestamp(),
        };
        if (replyingTo) payload.replyToId = replyingTo.id;
        await addDoc(collection(db, \"messages\"), payload);
        setReplyingTo(null);"""
        code = code.replace(old_add_doc_audio, new_add_doc_audio)

    # 8. Render Reply Snippet & id
    if "id={msg.id}" not in code.split("className={`flex flex-col ${isMe ? \"items-end\" : \"items-start\"}`}")[1][:100]:
        code = code.replace(
            "className={`flex flex-col ${isMe ? \"items-end\" : \"items-start\"}`}",
            "className={`flex flex-col ${isMe ? \"items-end\" : \"items-start\"}`} id={msg.id}"
        )
        
        reply_snippet = """                    </span>
                    
                    {msg.replyToId && (() => {
                      const replyMsg = messages.find(m => m.id === msg.replyToId);
                      if (!replyMsg) return null;
                      return (
                        <div onClick={() => document.getElementById(msg.replyToId)?.scrollIntoView({ behavior: "smooth", block: "center" })} className={`mb-1 px-3 py-1.5 rounded-lg text-xs bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors max-w-[85%] sm:max-w-[70%] overflow-hidden z-0 shadow-lg ${isMe ? 'shadow-[#d4af37]/5 mr-2' : 'shadow-black/50 ml-2'}`}>
                          <div className="text-[#d4af37] opacity-80 font-bold mb-0.5 font-[family-name:var(--font-playfair)]">{replyMsg.sender}</div>
                          <div className="truncate text-white/60 font-sans">{replyMsg.text || (replyMsg.attachmentType ? `[${replyMsg.attachmentType}]` : "...")}</div>
                        </div>
                      );
                    })()}
                    
                    {/* Media Attachment - Rendered OUTSIDE the text bubble */}"""
        code = code.replace(
            "                    </span>\n                    \n                    {/* Media Attachment - Rendered OUTSIDE the text bubble */}",
            reply_snippet
        )

    # 9. Reply Action Button
    if "Reply\n                          </motion.button>" not in code:
        reply_button = """                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setReplyingTo(msg); setActiveMessageId(null); }}
                            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 px-3 py-1.5 rounded-full border border-blue-500/30 transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                            Reply
                          </motion.button>
"""
        code = code.replace(
            "                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} \n                            onClick={() => handleDeleteMessage(msg.id)}",
            reply_button + "                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} \n                            onClick={() => handleDeleteMessage(msg.id)}"
        )

    # 10. Reply Preview above input & typing indicator below
    if "typingUsers.length > 0 &&" not in code:
        old_footer_inner = """      <motion.footer initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className=\"flex-none p-4 sm:p-6 border-t border-[#d4af37]/20 bg-black/40 backdrop-blur-md z-10\">
        <div className=\"max-w-3xl mx-auto relative\">"""
        
        new_footer_inner = """      <div className="flex-none max-w-3xl mx-auto w-full px-4 sm:px-6 z-10 flex flex-col justify-end pointer-events-none mb-2">
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
      </div>

      <motion.footer initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className=\"flex-none p-4 sm:p-6 border-t border-[#d4af37]/20 bg-black/40 backdrop-blur-md z-10\">
        <div className=\"max-w-3xl mx-auto relative\">
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mb-3 px-4 py-2 bg-black/60 border border-[#d4af37]/30 rounded-xl relative overflow-hidden flex items-center justify-between shadow-lg"
              >
                <div className="flex flex-col truncate pr-4">
                  <span className="text-xs text-[#d4af37] font-bold mb-0.5 font-[family-name:var(--font-playfair)]">Replying to {replyingTo.sender}</span>
                  <span className="text-xs text-white/60 truncate">{replyingTo.text || (replyingTo.attachmentType ? `[${replyingTo.attachmentType}]` : "...")}</span>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1.5 flex-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>"""
        code = code.replace(old_footer_inner, new_footer_inner)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("Success")

inject_features()
