type Props = {
  id: string;
  title?: string;
};

export function YouTubeEmbed({ id, title = "Demo fitur" }: Props) {
  if (!id) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 my-6 py-12">
        <p className="text-sm text-gray-400 dark:text-gray-500">Video segera hadir</p>
      </div>
    );
  }

  return (
    <div className="relative my-6 overflow-hidden rounded-lg" style={{ paddingTop: "56.25%" }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
