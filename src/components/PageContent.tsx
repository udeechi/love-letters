"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef } from "react";

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
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(ed.getHTML());
      }, 1000);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (pageId !== pageIdRef.current) {
      pageIdRef.current = pageId;
      editor.commands.setContent(initialContent || "");
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
