import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export function DocImage({ src, alt, caption, width = 1280, height = 720 }: Props) {
  return (
    <figure className="not-prose my-6">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="rounded-lg border border-gray-100 shadow-sm dark:border-gray-800"
        style={{ width: "100%", height: "auto" }}
      />
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
