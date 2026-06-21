import type { MDXComponents } from "mdx/types";
import { YouTubeEmbed } from "@/components/docs/YouTubeEmbed";
import { Steps, Step } from "@/components/docs/Steps";
import { Callout } from "@/components/docs/Callout";
import { DocImage } from "@/components/docs/DocImage";

export function useMDXComponents(): MDXComponents {
  return {
    YouTubeEmbed,
    Steps,
    Step,
    Callout,
    DocImage,
  };
}
