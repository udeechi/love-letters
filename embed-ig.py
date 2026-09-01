import sys

def add_ig_embeds():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Add renderTextWithEmbeds helper
    helper_code = '''
const renderTextWithEmbeds = (text: string) => {
  const igRegex = /https?:\\/\\/(?:www\\.)?instagram\\.com\\/(?:p|reel)\\/([a-zA-Z0-9_-]+)/g;
  const matches = [...text.matchAll(igRegex)];
  
  if (matches.length === 0) return text;

  // Render text and then render the embedded iframes below
  return (
    <div className="flex flex-col gap-3">
      <span className="break-words" style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
      {matches.map((match, idx) => (
        <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-inner w-[260px] sm:w-[320px] max-w-full relative" style={{ height: '440px' }}>
          <iframe 
            src={`https://www.instagram.com/p/${match[1]}/embed/`} 
            className="w-full h-full absolute top-0 left-0"
            frameBorder="0" 
            scrolling="no" 
            allowTransparency={true}
            allow="encrypted-media"
          ></iframe>
        </div>
      ))}
    </div>
  );
};

export default function ChatPage() {'''
    
    if "const renderTextWithEmbeds" not in code:
        code = code.replace("export default function ChatPage() {", helper_code)

    # 2. Update rendering logic
    old_render = '''                        ) : (
                          <>
                            {msg.text}
                            {msg.isEdited && <span className="text-[10px] opacity-40 ml-2 italic font-sans">(edited)</span>}
                          </>
                        )}'''
    new_render = '''                        ) : (
                          <>
                            {renderTextWithEmbeds(msg.text)}
                            {msg.isEdited && <span className="text-[10px] opacity-40 ml-2 italic font-sans">(edited)</span>}
                          </>
                        )}'''
    
    if old_render in code:
        code = code.replace(old_render, new_render)
    else:
        print("Could not find the text rendering block.")

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Instagram embeds configured")

add_ig_embeds()
