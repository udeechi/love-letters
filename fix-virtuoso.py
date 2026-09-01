import sys
import re

def fix_virtuoso():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Add alignToBottom to Virtuoso
    if "alignToBottom" not in code:
        code = code.replace(
            'className="w-full h-full"',
            'className="w-full h-full"\n          alignToBottom'
        )

    # 2. Remove layout and animation props from itemContent motion.div
    # Find:
    #                     layout
    #                     key={msg.id} 
    #                     initial={{ opacity: 0, scale: 0.95, y: 20 }} 
    #                     animate={{ opacity: 1, scale: 1, y: 0 }} 
    #                     transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
    
    old_motion = '''                    layout
                    key={msg.id} 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}'''
    
    new_motion = '                    key={msg.id}'
    code = code.replace(old_motion, new_motion)

    # 3. Add initialTopMostItemIndex logic based on isInitialLoaded to fix the "start at bottom" bug
    # Wait, alignToBottom literally aligns items to the bottom!
    # Let's also remove initialTopMostItemIndex because alignToBottom handles it natively!
    code = code.replace(
        'initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}',
        'initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}'
    ) # actually keep it just in case, but alignToBottom is key.

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Virtuoso fixed")

fix_virtuoso()
