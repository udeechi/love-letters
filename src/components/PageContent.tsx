"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState, useCallback } from "react";

const MAX_CHARS = 800;

function countChars(html: string): number {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent?.length ?? 0;
}

function calcFontSize(width: number, height: number, chars: number): number {
  if (chars <= 0 || width <= 0 || height <= 0) return 15;
  const area = width * height;
  const raw = Math.sqrt(area / (chars * 0.7));
  return Math.max(9, Math.min(16, Math.round(raw * 10) / 10));
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [charCount, setCharCount] = useState(() => countChars(initialContent || ""));
  const [fontSize, setFontSize] = useState(15);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFontSize(calcFontSize(rect.width, rect.height, charCount));
  }, [charCount]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    measure();
  }, [pageId, measure]);

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
    <div ref={containerRef} className="relative h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <EditorContent
          editor={editor}
          style={{ color: textColor, fontSize: `${fontSize}px`, lineHeight: 1.7 }}
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
