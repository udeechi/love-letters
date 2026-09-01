import sys

def convert_stickers():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Update Message interface
    if 'attachmentType?: "image" | "video" | "audio";' in code:
        code = code.replace(
            'attachmentType?: "image" | "video" | "audio";',
            'attachmentType?: "image" | "video" | "audio" | "sticker";'
        )

    # 2. Update sending payload
    old_payload = "attachmentType: 'image' };\n                            addDoc(collection(db, \"messages\"), payload);"
    new_payload = "attachmentType: 'sticker' };\n                            addDoc(collection(db, \"messages\"), payload);"
    if old_payload in code:
        code = code.replace(old_payload, new_payload)

    # 3. Update Rendering
    old_render = '''                      ) : msg.attachmentType === "audio" ? (
                        <VoiceMessagePlayer src={msg.attachmentUrl} isMe={isMe} />
                      ) : (
                        <div 
                          className="relative group cursor-pointer" '''
    
    new_render = '''                      ) : msg.attachmentType === "audio" ? (
                        <VoiceMessagePlayer src={msg.attachmentUrl} isMe={isMe} />
                      ) : msg.attachmentType === "sticker" ? (
                        <div className="w-40 h-40 overflow-hidden flex items-center justify-center p-1 bg-transparent">
                          <img 
                            src={msg.attachmentUrl} 
                            alt="Sticker" 
                            className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div 
                          className="relative group cursor-pointer" '''
    if old_render in code:
        code = code.replace(old_render, new_render)
    else:
        print("Failed to find render block")

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Stickers converted to strict sticker type")

convert_stickers()
