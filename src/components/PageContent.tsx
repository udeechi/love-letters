"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState } from "react";

interface PageContentProps {
  initialContent: string;
  isEditing: boolean;
  onSave: (content: string) => void;
}

export default function PageContent({
  initialContent,
  isEditing,
  onSave,
}: PageContentProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [textColor, setTextColor] = useState("#000000");

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
    },
    onUpdate: ({ editor: ed }) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onSave(ed.getHTML());
      }, 1000);
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent || "");
    }
  }, [initialContent]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  const applyColor = (hex: string) => {
    if (!editor) return;
    setTextColor(hex);
    editor.chain().focus().setColor(hex).run();
  };

  return (
    <div className="relative h-full flex flex-col">
      {isEditing && editor && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#d4af37]/10 shrink-0">
          <label className="text-[10px] font-[family-name:var(--font-playfair)] text-[#8a7a6a] tracking-wider uppercase">
            Color
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={textColor}
              onChange={(e) => applyColor(e.target.value)}
              className="w-5 h-5 rounded-sm border border-[#d4af37]/20 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => {
                const val = e.target.value;
                setTextColor(val);
                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                  applyColor(val);
                }
              }}
              className="w-20 px-1.5 py-0.5 text-[11px] font-mono bg-transparent border border-[#d4af37]/15 rounded-sm text-[#000000] focus:border-[#d4af37]/40 focus:outline-none"
            />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
