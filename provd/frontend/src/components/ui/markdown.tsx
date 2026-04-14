import React from "react";
import { marked } from "marked";

interface MarkdownProps {
  children: string;
  className?: string;
}

export default function Markdown({ children, className }: MarkdownProps) {
  const html = marked.parse(children, {
    gfm: true,
    breaks: false,
  });

  return (
    <div
      className={className || "prose prose-invert max-w-none"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
