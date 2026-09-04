"use client";

import type { ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
} from "lucide-react";
import { Toggle } from "@/components/portal/ui/toggle";
import { Separator } from "@/components/portal/ui/separator";
import { cn } from "@/components/portal/lib/utils";
import { RICH_TEXT_PROSE_CLASS } from "@/components/portal/lib/richText";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function ToolbarButton({
  editor,
  active,
  label,
  onClick,
  children,
}: {
  editor: Editor;
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Toggle
      size="sm"
      pressed={active}
      aria-label={label}
      title={label}
      disabled={!editor.isEditable}
      onPressedChange={() => onClick()}
      className="h-8 w-8 p-0"
    >
      {children}
    </Toggle>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
      <ToolbarButton
        editor={editor}
        active={editor.isActive("bold")}
        label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        active={editor.isActive("italic")}
        label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        active={editor.isActive("underline")}
        label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        active={editor.isActive("strike")}
        label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton
        editor={editor}
        active={editor.isActive("bulletList")}
        label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        active={editor.isActive("orderedList")}
        label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write here…",
  className,
  disabled,
}: RichTextEditorProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          heading: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
          link: false,
        }),
        Underline,
        Placeholder.configure({ placeholder }),
      ],
      content: value || "",
      onUpdate: ({ editor: instance }) => {
        onChange?.(instance.getHTML());
      },
      editorProps: {
        attributes: {
          class: cn(
            "min-h-[7rem] px-3 py-2 text-sm outline-none",
            RICH_TEXT_PROSE_CLASS,
          ),
        },
      },
    },
    [],
  );

  return (
    <div
      className={cn(
        "rich-text-editor border-input focus-within:border-ring focus-within:ring-ring/50 w-full overflow-hidden rounded-md border bg-transparent shadow-xs focus-within:ring-[3px]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {editor ? <EditorToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
