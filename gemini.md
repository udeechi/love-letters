# Love Letters - Project Context for Gemini

## What This Is
An interactive "Love Letters" notebook website — a password-locked, animated book with rich text editing, image uploads, and dynamic pages. Deployed on Vercel.

## Tech Stack
- Next.js 16.3.1 (App Router), TypeScript, Tailwind CSS
- TipTap rich text editor (ProseMirror under the hood)
- Framer Motion, anime.js v4, Moveable (for image drag/resize/rotate)
- Supabase (database), Cloudinary (images), JWT auth
- Deployment: Vercel at `https://ourlillovediary.vercel.app/`

## Current Bug: Font Sizing
The font size of text on book pages doesn't scale proportionally with the page container AND sometimes overflows vertically.

### What We Want
1. Font size proportional to the page container width (bigger page = bigger text)
2. Text must NEVER overflow its container — must stay inside with no clipping
3. On mobile (small) the text should be smaller; on large screens it should be bigger
4. The text should fill the available space nicely, not be too tiny or too huge

### DOM Structure
```
div.book-scene (aspect-ratio 4:3, max 1560x1170, width: min(65vw, calc(75vh*4/3)))
  div.w-1/2 (50% width = one page)
    div.absolute.inset-0.overflow-hidden
      div.page-surface
        div.h-full.flex.flex-col.py-3.px-4.sm:px-6  (24px horiz padding at sm+)
          div (page number, shrink-0)
          div.flex-1.min-h-0.overflow-hidden          ← "availH" container
            div.relative.h-full.flex.flex-col         ← wrapperRef
              div.flex-1.min-h-0.overflow-hidden.flex.flex-col  ← editorWrapRef
                div (EditorContent wrapper, flex:1, display:flex)
                  div.tiptap.ProseMirror.tiptap-editor ← the editor
                    p (text content)
```

### Available Space
- editorWrapRef has `clientWidth` (availW) and `clientHeight` (availH)
- At 1034x823 viewport: availW=288, availH=448
- At 2560x1440 viewport: availW=527, availH=806

### Current Code (PageContent.tsx)
```typescript
const fitText = useCallback(() => {
  const editorWrap = editorWrapRef.current;
  if (!editorWrap) return;
  const availW = editorWrap.clientWidth;
  const availH = editorWrap.clientHeight;
  if (availW <= 0 || availH <= 0) return;

  const proseMirror = editorWrap.querySelector(".ProseMirror") as HTMLElement | null;
  if (!proseMirror) return;

  const maxByWidth = Math.max(12, Math.min(36, Math.round(availW / 22)));

  // Temporarily set overflow:visible on all ancestors to measure true content height
  const ancestors: HTMLElement[] = [];
  let el: HTMLElement | null = proseMirror;
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    if (cs.overflow === "hidden" || cs.overflow === "clip" || cs.overflowY === "hidden" || cs.overflowY === "clip") {
      ancestors.push(el);
      el.style.overflow = "visible";
    }
    el = el.parentElement;
  }
  proseMirror.style.overflow = "visible";
  ancestors.push(proseMirror);

  let lo = 8;
  let hi = maxByWidth;
  let best = 8;

  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    proseMirror.style.fontSize = `${mid}px`;
    proseMirror.style.lineHeight = "1.7";
    if (proseMirror.scrollHeight <= availH + 1) {
      best = mid;
      lo = mid + 0.05;
    } else {
      hi = mid - 0.05;
    }
  }

  for (const a of ancestors) {
    a.style.overflow = "";
  }

  const finalSize = Math.floor(best * 10) / 10;
  proseMirror.style.fontSize = `${finalSize}px`;
  proseMirror.style.lineHeight = "1.7";
  proseMirror.style.overflow = "hidden";
  setFontSize(finalSize);
}, []);
```

### CSS (globals.css)
```css
.tiptap-editor.ProseMirror {
  outline: none;
  flex: 1;
  min-height: 0;
  padding: 16px 24px;       /* 12px 16px on mobile */
  font-family: var(--font-lora);
  overflow: hidden;
}

/* Mobile */
@media (max-width: 640px) {
  .tiptap-editor.ProseMirror {
    padding: 12px 16px;
  }
}
```

### What's Happening at Runtime
The binary search converges to ~12.47px at 1034x823 viewport. `Math.floor(12.47*10)/10 = 12.4px`. At 12.4px, scrollH=448=availH — zero overflow. At 12.5px, scrollH=457 > availH=448 — overflow.

### Measured Results
The text content is 600 characters of "adwadawd..." repeated. This is the worst case (dense, no spaces, forces character-level wrapping).

At 1034x823 viewport (availW=288, availH=448):
- 8px: scrollH=448 (fits)
- 12px: scrollH=448 (fits)
- 12.4px: scrollH=448 (fits) ← current result
- 12.5px: scrollH=457 (OVERFLOW)
- 13px: scrollH=474 (OVERFLOW)
- 14px: scrollH=556 (OVERFLOW)

### Known Issues
1. The `scrollHeight` measurement approach (setting overflow:visible on ancestors, measuring scrollHeight, restoring) WORKS but the transition from "fits" to "overflow" is a sharp step (448→457) due to word wrapping adding a whole extra line
2. The binary search correctly finds the boundary (~12.47px) but we need to floor it
3. At smaller viewports the font gets very small (12px) because availW is small. On a phone the book pages are tiny
4. The font doesn't grow proportionally enough on large screens — 24px at 2308px viewport feels small relative to the huge page

### What I Need Help With
Design a font-sizing algorithm that:
1. Scales text proportionally with page container (bigger page = bigger text)
2. Never overflows vertically
3. Works well at ALL viewport sizes (375px phone to 3840px 4K)
4. Looks natural — not too small, not too huge

The key constraint: we can't just use a fixed divisor (like `availW / 22`) because the overflow boundary depends on content, not just width. But the content is capped at 600 chars.

### Project Files
- `src/components/PageContent.tsx` — the file with fitText() (main file to modify)
- `src/components/Page.tsx` — renders PageContent, passes pageId/content/isEditing/onSave/textColor
- `src/components/Book.tsx` — spread-based book layout, image overlays
- `src/app/globals.css` — all CSS including .tiptap-editor.ProseMirror styles
- `src/hooks/useNotebook.ts` — spread-based state management
```
