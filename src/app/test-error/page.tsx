export default function TestErrorPage() {
  // Sengaja melempar error agar ditangkap oleh error.tsx
  throw new Error("Ini adalah simulasi error untuk melihat desain halaman error.");
  return <div>Halaman ini tidak akan pernah tampil</div>;
}
