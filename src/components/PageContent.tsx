"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useCallback } from "react";

interface PageContentProps {
  initialContent: string;
  isEditing: boolean;
  onSave: (content: string) => void;
  textColor: string;
}

export default function PageContent({
  initialContent,
  isEditing,
  onSave,
  textColor,
}: PageContentProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(initialContent);

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
      isTypingRef.current = true;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
      }, 2000);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const html = ed.getHTML();
        lastSavedContentRef.current = html;
        onSave(html);
      }, 1000);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== initialContent && initialContent !== lastSavedContentRef.current) {
      editor.commands.setContent(initialContent || "");
    }
  }, [initialContent, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.chain().focus().setColor(textColor).run();
  }, [textColor, editor]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="h-full"
          style={{ color: textColor }}
        />
      </div>
    </div>
  );
}
