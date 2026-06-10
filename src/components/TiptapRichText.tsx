 "use client";

import React, { useEffect, useCallback, useImperativeHandle } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import { TextStyle, Color, BackgroundColor, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Highlighter,
  Link as LinkIcon,
  Quote,
} from "lucide-react";
import { FaBold, FaItalic, FaUnderline, FaStrikethrough, FaAlignLeft, FaAlignCenter, FaAlignRight, FaUndo, FaRedo } from "react-icons/fa";
import { MdFormatListBulleted, MdFormatListNumbered } from "react-icons/md";
import { TbLetterCase, TbLetterCaseUpper, TbLetterCaseLower, TbLetterCaseToggle } from "react-icons/tb";
import { LuPalette } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TiptapRichTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  readOnly?: boolean;
  autoApplySizeToken?: number;
}

export interface TiptapRichTextHandle {
  insertVariableAtSelection: (variable: string) => boolean;
  focusEditor: () => void;
}

const TiptapRichText = React.forwardRef<TiptapRichTextHandle, TiptapRichTextProps>(({
  value,
  onChange,
  placeholder = "Digite o conteúdo...",
  className,
  minHeight = "200px",
  readOnly = false,
  autoApplySizeToken = 0,
}, ref) => {
  // Visual mapping: "12" appears like common word-processor size onscreen.
  const SIZE_OPTIONS: Array<{ label: string; value: string }> = [
    { label: "9", value: "12px" },
    { label: "10", value: "13px" },
    { label: "11", value: "15px" },
    { label: "12", value: "16px" },
    { label: "14", value: "19px" },
    { label: "16", value: "21px" },
    { label: "18", value: "24px" },
    { label: "20", value: "27px" },
    { label: "22", value: "29px" },
    { label: "24", value: "32px" },
    { label: "28", value: "37px" },
  ];
  const PRESET_COLORS = [
    "#111827",
    "#374151",
    "#6B7280",
    "#DC2626",
    "#EA580C",
    "#CA8A04",
    "#16A34A",
    "#2563EB",
    "#7C3AED",
    "#BE185D",
  ];
  const PRESET_BG_COLORS = ["#FFFFFF", "#FFF7CC", "#FFE4E6", "#E0F2FE", "#DCFCE7", "#F3E8FF", "#FDE68A"];

  const toolbarBtnClass =
    "h-7 rounded-sm bg-transparent px-2 text-sm text-foreground hover:bg-muted/60";
  const toolbarMenuBtnClass =
    "h-7 rounded-sm bg-transparent px-2 text-sm text-foreground hover:bg-muted/60";

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        history: true,
        link: {
          openOnClick: true,
        },
      }),
      // extend paragraph node to allow a style attribute (so text-indent persists)
      Paragraph.extend({
        addAttributes() {
          return {
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute("style") || null,
              renderHTML: (attrs) => {
                return attrs.style ? { style: attrs.style } : {};
              },
            },
          };
        },
      }),
      TextStyle,
      Color,
      BackgroundColor,
      FontSize,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    // keep external value in sync (e.g. when template is applied)
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    if (!editor || readOnly || autoApplySizeToken === 0) return;
    const timer = window.setTimeout(() => {
      // Replicates manual action: select all + choose size "11" in selector.
      editor.chain().focus().selectAll().setFontSize("15px").run();
      // Force collapse selection to caret at start.
      editor.commands.setTextSelection({ from: 1, to: 1 });
      editor.commands.focus(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoApplySizeToken, editor, readOnly]);

  const transformCase = useCallback(
    (fn: (s: string) => string) => {
      if (!editor) return;
      const { state, view } = editor;
      const { tr, schema } = state;
      const { from, to, empty } = state.selection;
      if (empty) return;
      const changes: Array<{ pos: number; size: number; text: string; marks: any[] }> = [];
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isText) return;
        const original = node.text || "";
        const nodeFrom = pos;
        const nodeTo = pos + node.nodeSize;
        const selFrom = Math.max(from, nodeFrom);
        const selTo = Math.min(to, nodeTo);
        const relFrom = Math.max(0, selFrom - nodeFrom);
        const relTo = Math.max(0, selTo - nodeFrom);
        const before = original.slice(0, relFrom);
        const selected = original.slice(relFrom, relTo);
        const after = original.slice(relTo);
        const changed = fn(selected);
        if (changed !== selected) {
          changes.push({
            pos,
            size: node.nodeSize,
            text: before + changed + after,
            marks: node.marks,
          });
        }
      });
      if (changes.length === 0) return;
      for (let i = changes.length - 1; i >= 0; i--) {
        const c = changes[i];
        tr.replaceWith(c.pos, c.pos + c.size, schema.text(c.text, c.marks));
      }
      view.dispatch(tr);
      editor.commands.focus();
    },
    [editor]
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const currentUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Informe a URL do link:", currentUrl || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const adaptVariableCase = useCallback((variable: string, selectedText: string) => {
    const selected = selectedText.trim();
    if (!selected) return variable;
    const letters = selected.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
    if (!letters) return variable;
    if (letters === letters.toUpperCase()) return variable.toUpperCase();
    if (letters === letters.toLowerCase()) return variable.toLowerCase();
    const isCapitalized = letters[0] === letters[0].toUpperCase() && letters.slice(1) === letters.slice(1).toLowerCase();
    if (!isCapitalized) return variable;
    const hasBraces = variable.startsWith("{{") && variable.endsWith("}}");
    const core = hasBraces ? variable.slice(2, -2) : variable;
    const transformedCore = core
      .split("_")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
      .join("_");
    return hasBraces ? `{{${transformedCore}}}` : transformedCore;
  }, []);

  const insertVariableAtSelection = useCallback((variable: string) => {
    if (!editor || readOnly) return false;
    const { state, view } = editor;
    const { selection, tr, schema } = state;
    const { from, to, empty } = selection;
    const selectedText = empty ? "" : state.doc.textBetween(from, to, " ", " ");
    const normalizedVariable = adaptVariableCase(variable, selectedText);
    const marks =
      (!empty ? selection.$from.marksAcross(selection.$to) : null) ??
      state.storedMarks ??
      selection.$from.marks();
    tr.replaceRangeWith(from, to, schema.text(normalizedVariable, marks || []));
    const cursorPos = from + normalizedVariable.length;
    view.dispatch(tr);
    editor.commands.focus(cursorPos);
    return true;
  }, [adaptVariableCase, editor, readOnly]);

  useImperativeHandle(ref, () => ({
    insertVariableAtSelection,
    focusEditor: () => {
      if (!editor) return;
      editor.commands.focus();
    },
  }), [editor, insertVariableAtSelection]);

  // Insert a paragraph-indent token (tab char) at the start of the current paragraph.
  // Using a single tab character '\t' so it's invisible and consistent across paragraphs.
  const insertParagraphIndent = useCallback(() => {
    // debug start
    // eslint-disable-next-line no-console
    console.debug("[insertParagraphIndent] invoked");
    if (!editor) {
      // eslint-disable-next-line no-console
      console.debug("[insertParagraphIndent] no editor instance");
      return;
    }
    const { state } = editor;
    const paraStart = state.selection.$from.start();
    // Instead of inserting raw characters, set paragraph node style `text-indent`
    try {
      // Use a ProseMirror transaction to set the paragraph node's style attribute at the paragraph start.
      const { tr, doc } = editor.state;
      // Find the paragraph node and its position
      const $pos = editor.state.selection.$from;
      let nodePos = $pos.before();
      let node = doc.nodeAt(nodePos);
      // if node is not a paragraph, search upward for paragraph parent
      let depth = $pos.depth;
      while (node && node.type.name !== "paragraph" && depth > 0) {
        nodePos = $pos.before(depth);
        node = doc.nodeAt(nodePos);
        depth--;
      }
      if (!node || node.type.name !== "paragraph") {
        // fallback: insert a tab char if paragraph node not found
        throw new Error("paragraph node not found");
      }
      const currentAttrs = node.attrs || {};
      const currentStyle: string = (currentAttrs.style as string) || "";
      // Toggle text-indent
      if (/text-indent\s*:/i.test(currentStyle)) {
        const newStyle = currentStyle.replace(/(?:^|;)\s*text-indent\s*:\s*[^;]+;?/i, "").trim().replace(/;$/, "");
        const nextAttrs = { ...currentAttrs, style: newStyle || undefined };
        tr.setNodeMarkup(nodePos, undefined, nextAttrs);
      } else {
        const newStyle = (currentStyle ? `${currentStyle}; ` : "") + "text-indent: 24px";
        const nextAttrs = { ...currentAttrs, style: newStyle };
        tr.setNodeMarkup(nodePos, undefined, nextAttrs);
      }
      editor.view.dispatch(tr);
      editor.commands.focus();
    } catch (err) {
      // fallback: insert a tab char at paragraph start
      // eslint-disable-next-line no-console
      console.debug("[insertParagraphIndent] fallback to inserting tab char:", err);
      const indentChar = "\t";
      try {
        // @ts-ignore
        if (editor.commands.insertContentAt) {
          // @ts-ignore
          editor.commands.insertContentAt(paraStart, indentChar);
          editor.commands.focus();
          return;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("[insertParagraphIndent] fallback insertContentAt error:", e);
      }
      editor.chain().focus().setTextSelection(paraStart).insertContent(indentChar).run();
    }
  }, [editor]);

  // Intercept Tab key inside editor: prevent focus change and apply paragraph indent
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      // eslint-disable-next-line no-console
      if (e.key === "Tab") {
        // eslint-disable-next-line no-console
        console.debug("[TiptapRichText] Tab key pressed inside editor");
        e.preventDefault();
        insertParagraphIndent();
      }
    };
    const dom = editor.view?.dom as HTMLElement | undefined;
    if (dom) {
      dom.addEventListener("keydown", handler);
      // eslint-disable-next-line no-console
      console.debug("[TiptapRichText] attached keydown handler to editor DOM");
    }
    return () => {
      if (dom) dom.removeEventListener("keydown", handler);
    };
  }, [editor, insertParagraphIndent]);

  const applyFontSize = useCallback(
    (size: string | null) => {
      if (!editor) return;
      const isEmptySelection = editor.state.selection.empty;
      const chain = editor.chain().focus();
      if (isEmptySelection) {
        chain.selectAll();
      }
      if (size) {
        chain.setFontSize(size).run();
      } else {
        chain.unsetFontSize().run();
      }
    },
    [editor]
  );

  if (!editor) {
    return <div className={cn("rich-text-editor-wrapper", className)}>Carregando editor...</div>;
  }

  const alignment = editor.isActive({ textAlign: "center" })
    ? "center"
    : editor.isActive({ textAlign: "right" })
      ? "right"
      : "left";

  const AlignmentIcon = alignment === "center" ? FaAlignCenter : alignment === "right" ? FaAlignRight : FaAlignLeft;

  return (
    <div className={cn("rich-text-editor-wrapper", className)}>
      {!readOnly && (
        <div className="mb-2 flex flex-wrap gap-0.5 items-center rounded-md border border-border bg-white p-2 shadow-sm">
          <select
            className="h-8 rounded-md border border-border bg-white px-2 text-sm"
            value={(editor.getAttributes("textStyle").fontSize as string) || ""}
            onChange={(e) =>
              e.target.value ? applyFontSize(e.target.value) : applyFontSize(null)
            }
          >
            <option value="">Tamanho</option>
            {SIZE_OPTIONS.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>

          <span className="text-muted-foreground">|</span>

          <Button
            type="button"
            variant={editor.isActive("bold") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Negrito"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <FaBold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("italic") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Itálico"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <FaItalic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("underline") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Sublinhado"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <FaUnderline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("strike") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Tachado"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <FaStrikethrough className="h-4 w-4" />
          </Button>

          <span className="text-muted-foreground">|</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className={toolbarMenuBtnClass} title="Alinhamento">
                <AlignmentIcon className="h-4 w-4 mr-1" />
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                <FaAlignLeft className="h-4 w-4 mr-2" /> Alinhar à esquerda
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                <FaAlignCenter className="h-4 w-4 mr-2" /> Centralizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                <FaAlignRight className="h-4 w-4 mr-2" /> Alinhar à direita
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className={toolbarMenuBtnClass} title="Transformar maiúsculas/minúsculas">
                <TbLetterCase className="h-4 w-4 mr-1" />
                Aa
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => transformCase((s) => s.toUpperCase())}>
                <TbLetterCaseUpper className="h-4 w-4 mr-2" /> MAIÚSCULAS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => transformCase((s) => s.toLowerCase())}>
                <TbLetterCaseLower className="h-4 w-4 mr-2" /> minúsculas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => transformCase((s) => s.replace(/\b([a-zà-ú])/g, (m) => m.toUpperCase()))}>
                <TbLetterCaseToggle className="h-4 w-4 mr-2" /> Capitalizar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Insert indent button: adds an indent token at paragraph start */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={toolbarBtnClass}
            title="Inserir recuo de parágrafo"
            onClick={insertParagraphIndent}
          >
            Tab
          </Button>

          <span className="text-muted-foreground">|</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className={toolbarMenuBtnClass} title="Cor do texto">
                <LuPalette className="h-4 w-4 mr-1" />
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <div className="grid grid-cols-5 gap-2 p-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-6 w-6 border border-border"
                    style={{ backgroundColor: c }}
                    title={c}
                    onClick={() => editor.chain().focus().setColor(c).run()}
                  />
                ))}
              </div>
              <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>
                Limpar cor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className={toolbarMenuBtnClass} title="Cor de fundo">
                <Highlighter className="h-4 w-4 mr-1" />
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <div className="grid grid-cols-5 gap-2 p-2">
                {PRESET_BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-6 w-6 border border-border"
                    style={{ backgroundColor: c }}
                    title={c}
                    onClick={() => editor.chain().focus().setBackgroundColor(c).run()}
                  />
                ))}
              </div>
              <DropdownMenuItem onClick={() => editor.chain().focus().unsetBackgroundColor().run()}>
                Limpar fundo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant={editor.isActive("bulletList") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Lista com marcadores"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <MdFormatListBulleted className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("orderedList") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Lista numerada"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <MdFormatListNumbered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("blockquote") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Citação"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("link") ? "default" : "ghost"}
            size="sm"
            className={toolbarBtnClass}
            title="Inserir ou remover link"
            onClick={setLink}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>

          <span className="text-muted-foreground">|</span>

          <Button type="button" variant="ghost" size="sm" className={toolbarBtnClass} title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
            <FaUndo className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className={toolbarBtnClass} title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
            <FaRedo className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        className="rounded-md border border-border bg-white p-3 shadow-sm"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} placeholder={placeholder as any} />
      </div>
    </div>
  );
});

TiptapRichText.displayName = "TiptapRichText";

export default TiptapRichText;

