import sys
import re

def fix_action_menu():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Text bubble click & cursor
    code = code.replace(
        'onClick={() => isMe && !isEditing && setActiveMessageId(isActive ? null : msg.id)}',
        'onClick={() => !isEditing && setActiveMessageId(isActive ? null : msg.id)}'
    )
    
    code = code.replace(
        'bg-black/80 text-[#f5edd6] rounded-bl-sm border border-white/10 shadow-black/50"',
        'bg-black/80 text-[#f5edd6] rounded-bl-sm border border-white/10 shadow-black/50 cursor-pointer hover:bg-black/70"'
    )

    # 2. Action Menu Edit & Delete guards
    code = code.replace(
        '{msg.text && (\n                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} \n                            onClick={() => handleEditMessage(msg)}',
        '{isMe && msg.text && (\n                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} \n                            onClick={() => handleEditMessage(msg)}'
    )
    
    code = code.replace(
        '<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} \n                          onClick={() => handleDeleteMessage(msg.id)}',
        '{isMe && (\n                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} \n                          onClick={() => handleDeleteMessage(msg.id)}'
    )
    
    # We added an opening brace for Delete, need to close it after the delete button
    # Let's do a regex to find the end of the Delete button
    delete_pattern = re.compile(r'(<motion\.button whileHover=\{\{ scale: 1\.05 \}\} whileTap=\{\{ scale: 0\.95 \}\} \n                          onClick=\{\(\) => handleDeleteMessage\(msg\.id\)\}.*?Delete\n                          </motion\.button>)', re.DOTALL)
    
    code = delete_pattern.sub(r'{isMe && (\n                          \1\n                        )}', code)

    # Clean up accidental double nesting if I ran both replacements
    code = code.replace(
        "{isMe && (\n                        {isMe && (\n",
        "{isMe && (\n"
    )

    # 3. Image 3-dots and long press
    code = code.replace(
        'onTouchStart={() => isMe ? startLongPress(msg.id) : undefined}',
        'onTouchStart={() => startLongPress(msg.id)}'
    )
    code = code.replace(
        '{isMe && (\n                              <button \n                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"',
        '{true && (\n                              <button \n                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"'
    )

    # 4. Video/Audio clicks
    code = code.replace(
        "if (isMe && msg.attachmentType !== 'image') {",
        "if (msg.attachmentType !== 'image') {"
    )
    
    code = code.replace(
        "className={`mb-2 max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden shadow-lg ${isMe ? 'shadow-[#d4af37]/5' : 'shadow-black/50'} ${isMe ? 'cursor-pointer hover:ring-1 ring-[#d4af37]/30' : ''}`}",
        "className={`mb-2 max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden shadow-lg ${isMe ? 'shadow-[#d4af37]/5' : 'shadow-black/50'} cursor-pointer hover:ring-1 ring-white/10`}"
    )

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

    print("Success")

fix_action_menu()
