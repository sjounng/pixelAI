import GalleryClient from "./GalleryClient";

export const metadata = { title: "갤러리 · PixelAI" };

export default function GalleryPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-extrabold">갤러리</h1>
        <p className="mt-1 text-sm text-gray-600">유저들이 공개한 픽셀 아트</p>
      </header>
      <GalleryClient initial={[]} initialWishlist={{}} />
    </div>
  );
}
