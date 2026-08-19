"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState } from "react";

const MAX_CHARS = 800;

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
  const [charCount, setCharCount] = useState(() => countChars(initialContent || ""));

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
    <div className="relative h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <EditorContent
          editor={editor}
          style={{ color: textColor }}
        />
      </div>

      {isEditing && (
        <div className={`text-right text-[10px] font-mono ${counterColor} select-none shrink-0`}>
          {charCount}/{MAX_CHARS}
        </div>
      )}
    </div>
  );
}
