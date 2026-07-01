"use client";

import dynamic from "next/dynamic";
import type { TextoCapinha, Transform } from "./types";

const CasePreviewInner = dynamic(
  () =>
    import("./CasePreview").then((mod) => ({ default: mod.CasePreview })),
  {
    ssr: false,
    loading: () => (
      <div
        className="inline-flex h-[180px] w-[100px] shrink-0 animate-pulse rounded-xl"
        style={{ backgroundColor: "#ececec" }}
      />
    ),
  },
);

type Props = {
  fotoUrl: string;
  transform: Transform;
  textos?: TextoCapinha[];
  previewWidth?: number;
};

export function CasePreview(props: Props) {
  return <CasePreviewInner {...props} />;
}
