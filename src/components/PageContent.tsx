"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useCallback, useRef } from "react";

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
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
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

  const insertImage = useCallback(() => {
    const url = prompt("Enter image URL:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  return (
    <div className="relative h-full flex flex-col">
      {isEditing && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#d4af37]/20 bg-[#f5edd6]/50">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            label="B"
            className="font-bold"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            label="I"
            className="italic"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive("underline")}
            label="U"
            className="underline"
          />
          <div className="w-px h-4 bg-[#d4af37]/20 mx-1" />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor?.isActive("heading", { level: 1 })}
            label="H1"
            className="text-xs"
          />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor?.isActive("heading", { level: 2 })}
            label="H2"
            className="text-xs"
          />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor?.isActive("heading", { level: 3 })}
            label="H3"
            className="text-xs"
          />
          <div className="w-px h-4 bg-[#d4af37]/20 mx-1" />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleBulletList().run()
            }
            active={editor?.isActive("bulletList")}
            label="• —"
            className="text-xs"
          />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleOrderedList().run()
            }
            active={editor?.isActive("orderedList")}
            label="1."
            className="text-xs"
          />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleBlockquote().run()
            }
            active={editor?.isActive("blockquote")}
            label="&quot;"
            className="text-xs"
          />
          <div className="w-px h-4 bg-[#d4af37]/20 mx-1" />
          <ToolbarButton
            onClick={insertImage}
            label="📷"
            className="text-xs"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-[#3d2b1f] text-sm rounded-sm transition-colors
        ${active
          ? "bg-[#d4af37]/30 text-[#2d1520]"
          : "hover:bg-[#d4af37]/15 text-[#6b5a4a]"
        } ${className || ""}`}
    >
      {label}
    </button>
  );
}
