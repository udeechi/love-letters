"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
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
    const availW = editorWrap.clientWidth;
    const availH = editorWrap.clientHeight;
    if (availW <= 0 || availH <= 0) return;

    const proseMirror = editorWrap.querySelector(".ProseMirror") as HTMLElement | null;
    if (!proseMirror) return;

    const maxByWidth = Math.max(12, Math.min(36, Math.round(availW / 22)));

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

    const finalSize = Math.round(best * 10) / 10;
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

  useEffect(() => {
    if (!editor) return;
    if (pageId !== pageIdRef.current) {
      pageIdRef.current = pageId;
      const content = initialContent || "";
      editor.commands.setContent(content);
      setCharCount(countChars(content));
    }
  }, [pageId, initialContent, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  useEffect(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().setColor(textColor).run();
    }
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
          style={{ color: textColor, fontSize: `${fontSize}px`, lineHeight: 1.7, flex: 1, display: 'flex', flexDirection: 'column' }}
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
