import sys

def inject_clean_embeds():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Remove the old renderTextWithEmbeds if it exists
    if "const renderTextWithEmbeds" in code:
        start_idx = code.find("const renderTextWithEmbeds")
        end_idx = code.find("export default function ChatPage() {")
        code = code[:start_idx] + code[end_idx:]

    # 2. Inject the new highly optimized IgEmbed component and helper
    new_helpers = '''
const IgEmbed = ({ url, msgId, setActiveMessageId }: { url: string, msgId: string, setActiveMessageId: (id: string | null) => void }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = (e: any) => {
    e.stopPropagation();
    timerRef.current = setTimeout(() => {
      setActiveMessageId(msgId);
    }, 2000); // 2 second hold
  };

  const handleTouchEnd = (e: any) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const safeUrl = url.endsWith('/') ? url : url + '/';

  return (
    <div 
      className="relative w-[280px] sm:w-[320px] max-w-full rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto mt-1"
      style={{ aspectRatio: '9/16' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Transparent overlay to capture long-presses without the iframe swallowing them */}
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto', touchAction: 'none' }}></div>
      <iframe 
        src={`${safeUrl}embed/?hidecaption=1&autoplay=1`} 
        className="absolute top-0 left-0 w-[102%] h-[115%] -mt-[8%] -ml-[1%]"
        frameBorder="0" 
        scrolling="no" 
        allowTransparency={true}
        allow="encrypted-media"
        style={{ pointerEvents: 'none' }}
      ></iframe>
    </div>
  );
};

const parseIgLinks = (text: string) => {
  const igRegex = /(https?:\\/\\/(?:www\\.)?instagram\\.com\\/(?:p|reel)\\/[a-zA-Z0-9_-]+\\/?\\S*)/g;
  const links = [...text.matchAll(igRegex)].map(m => m[0]);
  const cleanText = text.replace(igRegex, '').trim();
  return { cleanText, links };
};

export default function ChatPage() {'''
    
    code = code.replace("export default function ChatPage() {", new_helpers)

    # 3. Update the text rendering inside the component
    old_text_render = '''                        <>
                          {msg.text ? renderTextWithEmbeds(msg.text) : null}
                          {msg.isEdited && <span className="text-[10px] opacity-40 ml-2 italic font-sans">(edited)</span>}
                        </>'''
    
    new_text_render = '''                        <>
                          {(() => {
                            if (!msg.text) return null;
                            const { cleanText, links } = parseIgLinks(msg.text);
                            
                            return (
                              <div className="flex flex-col gap-1 w-full">
                                {cleanText && (
                                  <div className="break-words">
                                    {cleanText}
                                    {msg.isEdited && <span className="text-[10px] opacity-40 ml-2 italic font-sans">(edited)</span>}
                                  </div>
                                )}
                                {links.map((link, i) => (
                                  <IgEmbed key={i} url={link} msgId={msg.id} setActiveMessageId={setActiveMessageId} />
                                ))}
                              </div>
                            );
                          })()}
                        </>'''
    
    if old_text_render in code:
        code = code.replace(old_text_render, new_text_render)
    else:
        print("Failed to find old text render block.")

    # 4. Handle edge case: if cleanText is empty, the bubble might look weird if we don't remove padding.
    old_bubble = '''                    {msg.text && (
                      <div
                        className={`px-5 py-3 rounded-2xl max-w-[85%] sm:max-w-[70%]'''
    new_bubble = '''                    {msg.text && (
                      <div
                        className={`${parseIgLinks(msg.text).cleanText ? 'px-5 py-3' : 'p-0 bg-transparent shadow-none border-none hover:bg-transparent'} rounded-2xl max-w-[95%] sm:max-w-[80%]'''
    
    if old_bubble in code:
        code = code.replace(old_bubble, new_bubble)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Clean embeds configured.")

inject_clean_embeds()
