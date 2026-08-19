"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef, useState, useCallback } from "react";

interface PageContentProps {
  initialContent: string;
  isEditing: boolean;
  onSave: (content: string) => void;
  textColor: string;
  pageId: string;
  onOverflow?: (overflowHtml: string) => void;
}

export default function PageContent({
  initialContent,
  isEditing,
  onSave,
  textColor,
  pageId,
  onOverflow,
}: PageContentProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageIdRef = useRef(pageId);
  const prevHtmlRef = useRef("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);

  const fitText = useCallback(() => {
    const editorWrap = editorWrapRef.current;
    const proseMirror = editorWrap?.querySelector(".ProseMirror") as HTMLElement | null;
    if (!editorWrap || !proseMirror) return;

    const availH = editorWrap.clientHeight;
    const availW = editorWrap.clientWidth;
    if (availH <= 0 || availW <= 0) return;

    const cs = getComputedStyle(proseMirror);
    const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

    function contentHeight(fontPx: number): number {
      if (!proseMirror) return Infinity;
      proseMirror.style.fontSize = `${fontPx}px`;
      proseMirror.style.lineHeight = "1.7";
      proseMirror.style.overflow = "visible";
      const h = proseMirror.scrollHeight;
      proseMirror.style.overflow = "hidden";
      return h;
    }

    const maxByWidth = Math.max(12, Math.min(28, Math.round(availW / 22)));
    let lo = 8;
    let hi = maxByWidth;
    let best = 8;

    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      const h = contentHeight(mid) - padV;
      if (h <= availH + 1) {
        best = mid;
        lo = mid + 0.05;
      } else {
        hi = mid - 0.05;
      }
    }

    const finalSize = Math.round(best * 10) / 10;
    proseMirror.style.fontSize = `${finalSize}px`;
    proseMirror.style.lineHeight = "1.7";
    setFontSize(finalSize);

    // Overflow detection — after font is fitted, check if content still exceeds container
    if (onOverflow) {
      if (overflowTimeoutRef.current) clearTimeout(overflowTimeoutRef.current);
      overflowTimeoutRef.current = setTimeout(() => {
        const height = proseMirror.scrollHeight - padV;
        const container = editorWrapRef.current;
        if (!container || height <= container.clientHeight + 1) return;

        const html = proseMirror.innerHTML;
        if (html === prevHtmlRef.current) return;
        prevHtmlRef.current = html;

        const paragraphs = html.split(/(<\/p>)/i);
        let lo2 = 0;
        let hi2 = paragraphs.length;

        while (lo2 < hi2) {
          const mid = Math.floor((lo2 + hi2) / 2);
          const candidate = paragraphs.slice(0, mid + 1).join("");
          const div = document.createElement("div");
          div.className = "tiptap-editor";
          div.style.fontSize = `${finalSize}px`;
          div.style.lineHeight = "1.7";
          div.style.width = `${availW}px`;
          div.innerHTML = candidate;
          document.body.appendChild(div);
          const h = div.scrollHeight;
          document.body.removeChild(div);
          if (h <= availH + 1) lo2 = mid + 1;
          else hi2 = mid;
        }

        if (lo2 < paragraphs.length) {
          const fitting = paragraphs.slice(0, lo2).join("");
          const overflowHtml = paragraphs.slice(lo2).join("");
          if (fitting.trim() || overflowHtml.trim()) {
            prevHtmlRef.current = "";
            requestAnimationFrame(() => onOverflow(overflowHtml));
          }
        }
      }, 600);
    }
  }, [onOverflow]);

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

  useEffect(() => {
    requestAnimationFrame(() => fitText());
  }, [pageId, fitText]);

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
      const html = ed.getHTML();
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
      prevHtmlRef.current = "";
      if (overflowTimeoutRef.current) clearTimeout(overflowTimeoutRef.current);
      // Check if loaded content overflows (for pre-existing long content)
      requestAnimationFrame(() => fitText());
    }
  }, [pageId, initialContent, editor, fitText]);

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
      if (overflowTimeoutRef.current) clearTimeout(overflowTimeoutRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full flex flex-col">
      <div ref={editorWrapRef} className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EditorContent
          editor={editor}
          style={{ color: textColor, fontSize: `${fontSize}px`, lineHeight: 1.7, flex: 1, display: 'flex', flexDirection: 'column' }}
        />
      </div>
    </div>
  );
}
