"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState, useCallback } from "react";

const MAX_CHARS = 600;

function countChars(html: string): number {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent?.length ?? 0;
}

interface PageContentProps {
  initialContent: string;
  isEditing: boolean;
  onSave: (content: string) => void;
  textColor: string;
  pageId: string;
}

export default function PageContent({
  initialContent,
  isEditing,
  onSave,
  textColor,
  pageId,
}: PageContentProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageIdRef = useRef(pageId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [charCount, setCharCount] = useState(() => countChars(initialContent || ""));
  const [fontSize, setFontSize] = useState(14);

  const fitText = useCallback(() => {
    const editorWrap = editorWrapRef.current;
    if (!editorWrap) return;
    
    const rect = editorWrap.getBoundingClientRect();
    const availW = rect.width;
    const availH = rect.height;
    if (availW <= 0 || availH <= 0) return;

    const proseMirror = editorWrap.querySelector(".ProseMirror") as HTMLElement | null;
    if (!proseMirror) return;

    // Scale font size proportionally to the diagonal of the page container
    // diag * 0.035 gives ~19px on mobile and ~40px on huge 4K screens
    const diag = Math.sqrt(availW * availW + availH * availH);
    const maxFontSize = Math.max(14, diag * 0.035);

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
    
    // Disable flex stretching so proseMirror shrinks exactly to its content height
    const originalFlex = proseMirror.style.flex;
    const originalHeight = proseMirror.style.height;
    proseMirror.style.flex = "none";
    proseMirror.style.height = "auto";
    
    // Make sure we caught proseMirror (in case it wasn't hidden in CSS for some reason)
    proseMirror.style.overflow = "visible";
    if (!ancestors.includes(proseMirror)) ancestors.push(proseMirror);

    // Continuous binary search to find the exact boundary
    let lo = 8;
    let hi = maxFontSize;
    let best = 8;
    
    // 4px safety buffer against fractional pixel rendering causing clipping
    const targetH = availH - 4;

    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      proseMirror.style.fontSize = `${mid}px`;
      proseMirror.style.lineHeight = "1.7";
      
      // Use getBoundingClientRect for sub-pixel precision instead of scrollHeight
      if (proseMirror.getBoundingClientRect().height <= targetH) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }

    for (const a of ancestors) {
      a.style.overflow = "";
    }
    
    // Restore layout styles
    proseMirror.style.flex = originalFlex;
    proseMirror.style.height = originalHeight;

    // Floor to 1 decimal place to guarantee it stays within bounds
    const finalSize = Math.floor(best * 10) / 10;
    proseMirror.style.fontSize = `${finalSize}px`;
    proseMirror.style.lineHeight = "1.7";
    proseMirror.style.overflow = "hidden";
    setFontSize(finalSize);
  }, []);

  useEffect(() => {
    fitText();
  }, [pageId, fitText]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => fitText());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [fitText]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "Write your thoughts here...",
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: initialContent || "",
    editable: isEditing,
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      handleTextInput: (_view, _pos, _origin, text) => {
        const current = countChars(editor?.getHTML() || "");
        if (current + text.length > MAX_CHARS) {
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const count = countChars(html);
      setCharCount(count);

      if (count > MAX_CHARS) {
        const plainText = ed.getText();
        const truncated = plainText.slice(0, MAX_CHARS);
        ed.commands.setContent(truncated);
        setCharCount(MAX_CHARS);
        return;
      }

      requestAnimationFrame(() => fitText());

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(html);
      }, 1000);
    },
  });

  const lastServerContentRef = useRef(initialContent);

  useEffect(() => {
    if (!editor) return;
    
    // Page switched
    if (pageId !== pageIdRef.current) {
      pageIdRef.current = pageId;
      lastServerContentRef.current = initialContent || "";
      const content = initialContent || "";
      editor.commands.setContent(content);
      setCharCount(countChars(content));
      return;
    }

    // Server content updated remotely
    if (initialContent !== lastServerContentRef.current) {
      lastServerContentRef.current = initialContent || "";
      
      // Only update the editor if the user is NOT actively typing
      // to avoid wiping out their un-saved edits or cursor position
      if (!editor.isFocused) {
        editor.commands.setContent(initialContent || "");
        setCharCount(countChars(initialContent || ""));
      }
    }
  }, [pageId, initialContent, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.chain().setColor(textColor).run();
  }, [textColor, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const ratio = charCount / MAX_CHARS;
  const counterColor = ratio >= 1 ? "text-[#a82d6a]" : ratio >= 0.85 ? "text-[#c49a2a]" : "text-[#8a7a6a]";

  return (
    <div ref={wrapperRef} className="relative h-full flex flex-col">
      <div ref={editorWrapRef} className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EditorContent
          editor={editor}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7, flex: 1, display: 'flex', flexDirection: 'column' }}
        />
      </div>

      {isEditing && (
        <div className={`text-right font-mono ${counterColor} select-none shrink-0`} style={{ fontSize: Math.max(9, fontSize - 4) }}>
          {charCount}/{MAX_CHARS}
        </div>
      )}
    </div>
  );
}
