import sys

def update_file_limit():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # Update limit logic
    old_logic = '''if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25MB limit.");'''
    new_logic = '''if (file.size > 250 * 1024 * 1024) {
      alert("File size exceeds 250MB limit.");'''
    
    if old_logic in code:
        code = code.replace(old_logic, new_logic)
        print("Updated upload limit to 250MB.")
    else:
        print("Could not find the 25MB check.")

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)

update_file_limit()
