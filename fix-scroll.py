import sys

def apply_scroll_fix():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Add isAtBottomRef and prevMsgsLengthRef
    state_injection = '''const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const isAtBottomRef = useRef(true);
  const prevMsgsLengthRef = useRef(0);'''
    code = code.replace(
        'const [isInitialLoaded, setIsInitialLoaded] = useState(false);\n  const [newMessage, setNewMessage] = useState("");',
        state_injection
    )

    # 2. Add useEffect for robust scroll
    effect_injection = '''  // Auto-scroll when typing indicator appears if we are at bottom
  useEffect(() => {
    if (typingUsers.length > 0 && isAtBottomRef.current) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
      }, 50);
    }
  }, [typingUsers]);

  // Bulletproof auto-scroll logic
  useEffect(() => {
    if (messages.length > prevMsgsLengthRef.current) {
      if (isAtBottomRef.current) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
        }, 50);
      }
    }
    prevMsgsLengthRef.current = messages.length;
  }, [messages.length]);

  const handleRegister = async (e?: React.FormEvent) => {'''
    code = code.replace('  const handleRegister = async (e?: React.FormEvent) => {', effect_injection)

    # 3. Add to atBottomStateChange and atBottomThreshold
    old_virt = '''followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          atBottomStateChange={(atBottom) => setShowScrollBottom(!atBottom)}'''
    new_virt = '''followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          atBottomThreshold={150}
          atBottomStateChange={(atBottom) => {
            setShowScrollBottom(!atBottom);
            isAtBottomRef.current = atBottom;
          }}'''
    code = code.replace(old_virt, new_virt)

    # 4. Force scroll down when the user sends a message
    old_send = '''const text = newMessage;
    setNewMessage("");
    const payload: any = {'''
    new_send = '''const text = newMessage;
    setNewMessage("");
    // Force scroll down when you send a message
    virtuosoRef.current?.scrollToIndex({ index: 999999, behavior: 'smooth' });
    const payload: any = {'''
    code = code.replace(old_send, new_send)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Scroll fix applied")

apply_scroll_fix()
