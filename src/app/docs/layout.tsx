import { getPageMap } from "nextra/page-map";
import DocsSidebar from "@/components/docs/DocsSidebar";
import DocsHeader from "@/components/docs/DocsHeader";
import DocsMainContent from "@/components/docs/DocsMainContent";
import "./docs.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap("/docs");

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <DocsSidebar pageMap={pageMap} />
      <DocsMainContent>
        <DocsHeader />
        <div className="px-4 pt-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 md:pb-6">
          <article className="docs-content">
            {children}
          </article>
        </div>
      </DocsMainContent>
    </div>
  );
}
