import sys

def fix_embed_interaction():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Update IgEmbed component
    old_igembed = '''const IgEmbed = ({ url, msgId, setActiveMessageId }: { url: string, msgId: string, setActiveMessageId: (id: string | null) => void }) => {
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
};'''

    # Re-writing IgEmbed to use reelId (fixing the previous script's merge)
    new_igembed = '''const IgEmbed = ({ reelId, msgId, setActiveMessageId }: { reelId: string, msgId: string, setActiveMessageId: (id: string | null) => void }) => {
  return (
    <div 
      className="relative w-[280px] sm:w-[320px] max-w-full rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10 mx-auto mt-1"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Options Button so they can Reply/Delete without an overlay blocking the video */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setActiveMessageId(msgId);
        }}
        className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </button>

      {/* The actual iframe, fully interactive so tap-to-play works */}
      <iframe 
        src={`https://www.instagram.com/p/${reelId}/embed/?hidecaption=1`} 
        className="absolute top-0 left-0 w-[102%] h-[115%] -mt-[8%] -ml-[1%]"
        frameBorder="0" 
        scrolling="no" 
        allowTransparency={true}
        allow="encrypted-media"
      ></iframe>
    </div>
  );
};'''

    # Sometimes the previous python script left different code because of regex differences. 
    # Let's cleanly replace the entire IgEmbed function via string slicing.
    start_idx = code.find("const IgEmbed =")
    end_idx = code.find("const parseIgLinks =")
    if start_idx != -1 and end_idx != -1:
        code = code[:start_idx] + new_igembed + "\n\n" + code[end_idx:]
    else:
        print("Could not find IgEmbed block")

    # 2. Fix the parent text bubble onClick so it doesn't trigger if it's just a clean video
    old_bubble_click = 'onClick={() => !isEditing && setActiveMessageId(isActive ? null : msg.id)}'
    
    # We want to keep the normal text bubble click, BUT if they click the video, the iframe swallows it anyway.
    # The real issue was the overlay bubbling. With the overlay gone, the video handles its own clicks.
    # So we don't strictly need to change the parent onClick.
    
    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Interactions fixed!")

fix_embed_interaction()
