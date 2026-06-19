"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PixelPreview from "@/components/PixelPreview";
import { ArtworkGridSkeleton } from "@/components/Skeleton";
import type { Artwork } from "@/types/api";

export default function RecentPublicArtworks() {
  const [items, setItems] = useState<Artwork[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ public: "true", page: "1" });
    void fetch(`/api/history?${qs.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems((data.items ?? []).slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return <ArtworkGridSkeleton />;
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">아직 공개된 작품이 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((artwork) => (
        <div key={artwork.id} className="card">
          <PixelPreview pixels={artwork.pixel_data} size={artwork.size} />
          <p className="mt-2 truncate text-xs text-gray-600">{artwork.prompt}</p>
        </div>
      ))}
    </div>
  );
}
