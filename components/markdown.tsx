import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Safe by default: react-markdown does NOT render raw HTML unless rehype-raw is
// added, so user/author markdown can't inject scripts. Styled to match the
// pixel/mono theme rather than a generic prose stylesheet.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 font-pixel text-xl leading-[1.5] text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 font-pixel text-base leading-[1.5] text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 font-pixel text-xs uppercase tracking-wider text-foreground">{children}</h3>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="flex flex-col gap-2 pl-1">{children}</ul>,
          ol: ({ children }) => <ol className="flex list-inside list-decimal flex-col gap-2">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary bg-card px-4 py-2 italic">{children}</blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = (className ?? '').includes('language-')
            if (isBlock) {
              return (
                <code className="block overflow-x-auto border-2 border-border bg-card p-4 font-mono text-xs text-foreground">
                  {children}
                </code>
              )
            }
            return <code className="border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          hr: () => <hr className="my-4 border-border" />,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="border-2 border-border" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
