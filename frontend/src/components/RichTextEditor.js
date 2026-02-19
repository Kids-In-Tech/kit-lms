import React, { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Code, Link, Image, Heading2 } from 'lucide-react';

const tools = [
  { cmd: 'bold', icon: Bold, title: 'Bold' },
  { cmd: 'italic', icon: Italic, title: 'Italic' },
  { cmd: 'underline', icon: Underline, title: 'Underline' },
  { cmd: 'insertUnorderedList', icon: List, title: 'Bullet List' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Numbered List' },
  { cmd: 'formatBlock_h2', icon: Heading2, title: 'Heading' },
  { cmd: 'formatBlock_pre', icon: Code, title: 'Code Block' },
];

export default function RichTextEditor({ value, onChange, placeholder = 'Start writing...', minHeight = 200 }) {
  const editorRef = useRef(null);
  const isInitialized = useRef(false);

  // Only set innerHTML on first mount or when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || '';
      isInitialized.current = true;
    }
  }, [value]);

  // Reset initialization flag when component unmounts/remounts with new value
  useEffect(() => {
    return () => { isInitialized.current = false; };
  }, []);

  const exec = useCallback((cmd) => {
    editorRef.current?.focus();
    if (cmd === 'formatBlock_h2') document.execCommand('formatBlock', false, '<h2>');
    else if (cmd === 'formatBlock_pre') document.execCommand('formatBlock', false, '<pre>');
    else document.execCommand(cmd, false, null);
    if (editorRef.current && onChange) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      editorRef.current?.focus();
      document.execCommand('insertImage', false, url);
      if (editorRef.current && onChange) onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editorRef.current?.focus();
      document.execCommand('createLink', false, url);
      if (editorRef.current && onChange) onChange(editorRef.current.innerHTML);
    }
  };

  const insertYouTube = () => {
    const url = prompt('Enter YouTube URL:');
    if (url) {
      const id = url.match(/(?:youtu\.be\/|v=)([^&]+)/)?.[1];
      if (id) {
        editorRef.current?.focus();
        const html = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1rem 0;border-radius:8px"><iframe src="https://www.youtube.com/embed/${id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`;
        document.execCommand('insertHTML', false, html);
        if (editorRef.current && onChange) onChange(editorRef.current.innerHTML);
      }
    }
  };

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white" data-testid="rich-text-editor">
      <div className="flex items-center gap-0.5 p-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex-wrap">
        {tools.map(t => (
          <button key={t.cmd} type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec(t.cmd)} title={t.title}
            className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors">
            <t.icon size={15} />
          </button>
        ))}
        <div className="w-px h-5 bg-[#E2E8F0] mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertImage} title="Insert Image" className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors"><Image size={15} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertLink} title="Insert Link" className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors"><Link size={15} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertYouTube} title="YouTube Embed" className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors text-[10px] font-bold" style={{ fontFamily: 'Space Mono' }}>YT</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="prose prose-sm max-w-none p-4 outline-none"
        style={{ minHeight }}
        onInput={handleInput}
        data-testid="rich-text-content"
        data-placeholder={placeholder}
      />
    </div>
  );
}
