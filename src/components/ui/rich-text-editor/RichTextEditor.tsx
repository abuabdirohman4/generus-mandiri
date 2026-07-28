"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import styles from './RichTextEditor.module.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  enableFontFamily?: boolean;
  enableLists?: boolean;
  enableTextAlign?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Tuliskan apa yang ada di pikiran Anda...",
  className = "",
  rows = 8,
  disabled = false,
  onKeyDown,
  enableFontFamily = false,
  enableLists = false,
  enableTextAlign = false,
}) => {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: enableLists ? undefined : false,
        orderedList: enableLists ? undefined : false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      Underline,
      ...(enableFontFamily ? [TextStyle, FontFamily] : []),
      ...(enableTextAlign ? [TextAlign.configure({ types: ['paragraph', 'heading'] })] : []),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { class: 'text-blue-600 dark:text-blue-400 underline', rel: 'noopener noreferrer', target: '_blank' } }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false, // Fix SSR hydration issue
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editorContent,
        style: `min-height: ${rows * 1.5}rem;`,
      },
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+Enter on Mac or Ctrl+Enter on Windows/Linux
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (onKeyDown) {
          onKeyDown(event as any);
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown);

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, onKeyDown]);

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }> = ({ onClick, isActive = false, disabled = false, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${styles.toolbarButton} ${isActive ? styles.active : ''}`}
      title={title}
    >
      {children}
    </button>
  );

  // Show loading state during SSR or when editor is not ready
  if (!mounted || !editor) {
    return (
      <div className={`${styles.tiptapContainer} ${className}`}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <div className={styles.skeletonButton}></div>
            <div className={styles.skeletonButton}></div>
            <div className={styles.skeletonButton}></div>
            <div className={styles.skeletonButton}></div>
          </div>
        </div>
        <div className={styles.editorSkeleton}></div>
      </div>
    );
  }

  return (
    <div className={`${styles.tiptapContainer} ${className}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          {enableFontFamily && (
            <select
              value={editor.getAttributes('textStyle').fontFamily ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  editor.chain().focus().unsetFontFamily().run();
                } else {
                  editor.chain().focus().setFontFamily(val).run();
                }
              }}
              disabled={disabled}
              title="Pilih Font"
              className={styles.fontSelect}
            >
              <option value="">Default</option>
              <option value="Arial, sans-serif" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
              <option value="'Calibri', sans-serif" style={{ fontFamily: "'Calibri', sans-serif" }}>Calibri</option>
              <option value="'Roboto', sans-serif" style={{ fontFamily: "'Roboto', sans-serif" }}>Roboto</option>
              <option value="'Times New Roman', serif" style={{ fontFamily: "'Times New Roman', serif" }}>Times New Roman</option>
              <option value="Amiri, serif" style={{ fontFamily: 'Amiri, serif' }}>Arabic (Amiri)</option>
              <option value="'Scheherazade New', serif" style={{ fontFamily: "'Scheherazade New', serif" }}>Scheherazade New</option>
            </select>
          )}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            disabled={disabled}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            disabled={disabled}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            disabled={disabled}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            disabled={disabled}
            title="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>

          {enableTextAlign && (
            <div className={styles.alignDropdown}>
              <button
                type="button"
                className={styles.alignDropdownTrigger}
                title="Text Alignment"
                onClick={(e) => {
                  e.preventDefault();
                  const el = (e.currentTarget.parentElement as HTMLElement);
                  el.classList.toggle(styles.alignDropdownOpen);
                  const close = () => { el.classList.remove(styles.alignDropdownOpen); document.removeEventListener('click', close); };
                  setTimeout(() => document.addEventListener('click', close), 0);
                }}
              >
                {editor.isActive({ textAlign: 'center' }) ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>
                ) : editor.isActive({ textAlign: 'right' }) ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>
                ) : editor.isActive({ textAlign: 'justify' }) ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
                )}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: '2px'}}><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              <div className={styles.alignDropdownMenu}>
                {[
                  { align: 'left', label: 'Rata Kiri', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg> },
                  { align: 'center', label: 'Tengah', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg> },
                  { align: 'right', label: 'Rata Kanan', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg> },
                  { align: 'justify', label: 'Rata Kanan Kiri', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg> },
                ].map(({ align, label, icon }) => (
                  <button
                    key={align}
                    type="button"
                    className={`${styles.alignMenuItem} ${editor.isActive({ textAlign: align }) ? styles.alignMenuItemActive : ''}`}
                    onClick={() => { editor.chain().focus().setTextAlign(align).run(); }}
                    title={label}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          )}

          {enableLists && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                disabled={disabled}
                title="Bullet List"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="4" cy="6" r="2"/><rect x="8" y="5" width="13" height="2" rx="1"/>
                  <circle cx="4" cy="12" r="2"/><rect x="8" y="11" width="13" height="2" rx="1"/>
                  <circle cx="4" cy="18" r="2"/><rect x="8" y="17" width="13" height="2" rx="1"/>
                </svg>
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                disabled={disabled}
                title="Ordered List"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <text x="2" y="7" fontSize="6" fontWeight="bold">1</text><rect x="8" y="5" width="13" height="2" rx="1"/>
                  <text x="2" y="13" fontSize="6" fontWeight="bold">2</text><rect x="8" y="11" width="13" height="2" rx="1"/>
                  <text x="2" y="19" fontSize="6" fontWeight="bold">3</text><rect x="8" y="17" width="13" height="2" rx="1"/>
                </svg>
              </ToolbarButton>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
