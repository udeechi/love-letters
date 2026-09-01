import sys

def wrap_virtuoso():
    with open("src/app/chat/page.tsx", "r", encoding="utf-8") as f:
        code = f.read()

    # Wrap Virtuoso in {isInitialLoaded && ( ... )}
    old_virtuoso_start = '<Virtuoso\n          ref={virtuosoRef}'
    new_virtuoso_start = '{isInitialLoaded && (\n        <Virtuoso\n          ref={virtuosoRef}'
    code = code.replace(old_virtuoso_start, new_virtuoso_start)

    old_virtuoso_end = '          }}\n        />\n        \n        <AnimatePresence>'
    new_virtuoso_end = '          }}\n        />\n        )}\n        \n        <AnimatePresence>'
    code = code.replace(old_virtuoso_end, new_virtuoso_end)

    with open("src/app/chat/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    
    print("Virtuoso wrapped")

wrap_virtuoso()
