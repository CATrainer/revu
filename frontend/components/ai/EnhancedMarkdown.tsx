'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

interface EnhancedMarkdownProps {
  content: string;
  className?: string;
}

export function EnhancedMarkdown({ content, className }: EnhancedMarkdownProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      className={cn("prose prose-slate dark:prose-invert max-w-none", className)}
      components={{
        // Enhanced Headings with Collapsible Sections
        h1: ({ node, children, ...props }) => {
          const id = `section-${children?.toString().toLowerCase().replace(/\s+/g, '-')}`;
          const isCollapsed = collapsedSections.has(id);
          
          return (
            <h1
              className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between group cursor-pointer"
              onClick={() => toggleSection(id)}
              {...props}
            >
              <span>{children}</span>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                )}
              </button>
            </h1>
          );
        },
        h2: ({ node, ...props }) => (
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1" {...props} />
        ),

        // Enhanced Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-slate-50 dark:bg-slate-800" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700" {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300" {...props} />
        ),

        // Enhanced Code Blocks with Copy Button
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
          const codeString = String(children).replace(/\n$/, '');

          if (!inline && match) {
            return (
              <div className="relative group my-4">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-900 rounded-t-lg border-b border-slate-700">
                  <span className="text-xs font-mono text-slate-400">{match[1]}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(codeString, codeId)}
                    className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedCode === codeId ? (
                      <>
                        <CheckCheck className="h-3 w-3 mr-1 text-green-400" />
                        <span className="text-xs text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1 text-slate-400" />
                        <span className="text-xs text-slate-400">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="!mt-0 !rounded-t-none !rounded-b-lg"
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-slate-100"
              {...props}
            >
              {children}
            </code>
          );
        },

        // Enhanced Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-outside ml-6 space-y-1 my-3 text-slate-700 dark:text-slate-300" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-outside ml-6 space-y-1 my-3 text-slate-700 dark:text-slate-300" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="pl-1" {...props} />
        ),

        // Enhanced Links
        a: ({ node, ...props }) => (
          <a
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),

        // Enhanced Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-950/20 italic text-slate-700 dark:text-slate-300"
            {...props}
          />
        ),

        // Horizontal Rule
        hr: ({ node, ...props }) => (
          <hr className="my-6 border-slate-200 dark:border-slate-700" {...props} />
        ),

        // Paragraphs
        p: ({ node, ...props }) => (
          <p className="my-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300" {...props} />
        ),

        // Images
        img: ({ node, ...props }) => (
          <img
            className="rounded-lg my-4 max-w-full h-auto shadow-md"
            {...props}
          />
        ),

        // Strong/Bold
        strong: ({ node, ...props }) => (
          <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
        ),

        // Emphasis/Italic
        em: ({ node, ...props }) => (
          <em className="italic text-slate-700 dark:text-slate-300" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
