import { readFile } from "node:fs/promises";
import path from "node:path";

import { marked } from "marked";
import { getDocsPageBySlug, listDocsPages, type DocsPage } from "@/src/lib/docs-pages";

const docsFolder = path.join(process.cwd(), "content", "docs");
export { getDocsPageBySlug, listDocsPages, type DocsPage };

export async function renderDocsPageHtml(slug: string) {
  const page = getDocsPageBySlug(slug);

  if (!page) {
    return null;
  }

  const absolutePath = path.join(docsFolder, page.fileName);
  const markdown = await readFile(absolutePath, "utf8");
  const html = await Promise.resolve(marked.parse(markdown));

  return {
    page,
    html
  };
}
