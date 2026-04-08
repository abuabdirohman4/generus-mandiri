import { generateStaticParamsFor, importPage } from "nextra/pages";
import { useMDXComponents } from "@/mdx-components";

// generateStaticParamsFor returns keys like ["docs"], ["docs","fitur","absensi"]
// Our route is /docs/[[...mdxPath]], so mdxPath segment should NOT include "docs"
// We strip the leading "docs" from static params, but keep full key for importPage
const _generateStaticParams = generateStaticParamsFor("mdxPath");
export async function generateStaticParams() {
  const params = await _generateStaticParams();
  return params
    .filter((p) => Array.isArray(p.mdxPath) && p.mdxPath[0] === "docs")
    .map((p) => ({ mdxPath: (p.mdxPath as string[]).slice(1) }));
}

interface Props {
  params: Promise<{ mdxPath?: string[] }>;
}

// mdxPath from URL: undefined or ["fitur","absensi"]
// importPage needs full Nextra key: ["docs"] or ["docs","fitur","absensi"]
function toNextraKey(mdxPath?: string[]): string[] {
  if (!mdxPath || mdxPath.length === 0) return ["docs"];
  return ["docs", ...mdxPath];
}

export async function generateMetadata({ params }: Props) {
  const { mdxPath } = await params;
  const { metadata } = await importPage(toNextraKey(mdxPath));
  return metadata;
}

export default async function Page(props: Props) {
  const params = await props.params;
  const result = await importPage(toNextraKey(params.mdxPath));
  const { default: MDXContent } = result;
  const components = useMDXComponents();

  return <MDXContent {...props} params={params} components={components} />;
}
