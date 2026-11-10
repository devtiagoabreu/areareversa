import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { HeadingWithCopy } from "@/components/HeadingWithCopy";

/**
 * Remove o primeiro "# Título" do corpo do post.
 *
 * O layout da página já mostra o título num <h1>. Quando o markdown do post
 * também começa com "# ...", a página fica com dois <h1> e o leitor de tela
 * anuncia o título duas vezes. Removemos só o do markdown — os subtítulos
 * (## e ###) continuam como estão.
 */
function dropLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+[^\n]*\n+/, "");
}

/**
 * Blocos editoriais fixos são blockquotes no markdown:
 *
 *   > **Como ler este texto.** ...
 *   > **Data de corte.** ...
 *   > **Nota de escopo.** ...
 *
 * Na leitura eles ocupam meia tela antes do primeiro parágrafo. Aqui viram
 * <details> recolhidos: quem quer o método abre; quem quer o texto, lê.
 * O conteúdo continua no HTML (SEO, leitor de tela, Ctrl+F do navegador).
 */
const COLLAPSIBLE_LABELS = [
  { test: /^como ler este texto/i, label: "Como ler este texto" },
  { test: /^data de corte/i, label: "Data de corte" },
  { test: /^nota de escopo/i, label: "Nota de escopo" },
  { test: /^how to read this text/i, label: "How to read this text" },
  { test: /^cut-?off date/i, label: "Cut-off date" },
  { test: /^scope note/i, label: "Scope note" },
  { test: /^c[oó]mo leer este texto/i, label: "Cómo leer este texto" },
  { test: /^fecha de corte/i, label: "Fecha de corte" },
  { test: /^nota de alcance/i, label: "Nota de alcance" },
];

function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children);
  return "";
}

/** Tira o "**Rótulo.**" do início do primeiro parágrafo do bloco. */
function withoutLabel(node: ReactNode, label: string): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;

  const kids = Children.toArray(node.props.children);
  let start = 0;

  const head = kids[0];
  if (head && plainText(head).replace(/\s+/g, " ").trim().toLowerCase().startsWith(label.toLowerCase())) {
    start = 1;
  }
  while (start < kids.length && typeof kids[start] === "string" && String(kids[start]).trim() === "") {
    start++;
  }

  const rest = kids.slice(start);
  if (rest.length > 0 && typeof rest[0] === "string") {
    rest[0] = String(rest[0]).replace(/^[\s.:;–—-]+/, "");
  }

  return cloneElement(node, {}, ...rest);
}

function CollapsibleBlockquote({ children }: { children?: ReactNode }) {
  const blocks = Children.toArray(children);
  const first = blocks[0];
  const heading = plainText(first).trimStart();
  const hit = COLLAPSIBLE_LABELS.find((candidate) => candidate.test.test(heading));

  if (!hit) return <blockquote>{children}</blockquote>;

  return (
    <details className="group my-6 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#faf9fb] dark:border-[#2a2a30] dark:bg-neutral-900/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#4b5563] transition hover:text-[#9333ea] dark:text-[#d4d4d8] dark:hover:text-[#c084fc] [&::-webkit-details-marker]:hidden">
        <span>{hit.label}</span>
        <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-[#e5e7eb] px-4 pb-1 pt-2 text-neutral-600 dark:border-[#2a2a30] dark:text-neutral-400">
        {withoutLabel(first, hit.label)}
        {blocks.slice(1)}
      </div>
    </details>
  );
}

const components: Components = {
  h1: ({ children, ...props }) => (
    <HeadingWithCopy level={2} {...props}>
      {children}
    </HeadingWithCopy>
  ),
  h2: ({ children, ...props }) => (
    <HeadingWithCopy level={2} {...props}>
      {children}
    </HeadingWithCopy>
  ),
  h3: ({ children, ...props }) => (
    <HeadingWithCopy level={3} {...props}>
      {children}
    </HeadingWithCopy>
  ),
  blockquote: ({ children }) => <CollapsibleBlockquote>{children}</CollapsibleBlockquote>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div
      className="article-body max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_p]:my-4 [&_p]:leading-7 [&_a]:text-[#9333ea] [&_a]:underline [&_img]:my-6 [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#f9f7fa] [&_pre]:p-4 dark:[&_pre]:bg-neutral-900 [&_code]:rounded [&_code]:bg-[#f9f7fa] [&_code]:px-1 dark:[&_code]:bg-neutral-900 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_blockquote]:text-neutral-500"
      style={{ fontSize: "var(--article-font-size, 1rem)" }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {dropLeadingH1(children)}
      </ReactMarkdown>
    </div>
  );
}
