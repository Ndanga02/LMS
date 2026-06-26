import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ className: cn, children, ...props }) => {
            const isInline = !cn;
            if (isInline) {
              return (
                <code className="rounded bg-muted px-1 py-0.5 text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code className={cn} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          ul: ({ children }) => <ul className="list-disc pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6">{children}</ol>,
          h1: ({ children }) => <h1 className="text-2xl font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic">{children}</blockquote>
          ),
          hr: () => <hr className="my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
