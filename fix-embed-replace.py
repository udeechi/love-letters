import sys

def add_ig_embeds():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # Update rendering logic
    old_render = """                        <>
                          {msg.text}
                          {msg.isEdited && <span className="text-[10px] opacity-40 ml-2 italic font-sans">(edited)</span>}
                        </>"""
    new_render = """                        <>
                          {msg.text ? renderTextWithEmbeds(msg.text) : null}
                          {msg.isEdited && <span className="text-[10px] opacity-40 ml-2 italic font-sans">(edited)</span>}
                        </>"""
    
    if old_render in code:
        code = code.replace(old_render, new_render)
        print("Replaced successfully")
    else:
        print("Still could not find the text rendering block.")

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

add_ig_embeds()
