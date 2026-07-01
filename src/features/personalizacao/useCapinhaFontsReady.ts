"use client";

import { useEffect, useState } from "react";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:ital,wght@0,400;0,700;1,400&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:wght@700&display=swap";

let fontLinkInjected = false;

function injectFontLink() {
  if (fontLinkInjected || typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_URL;
  document.head.appendChild(link);
  fontLinkInjected = true;
}

export function useCapinhaFontsReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectFontLink();

    const familias = [
      "Montserrat",
      "Playfair Display",
      "Bebas Neue",
      "Pacifico",
      "Permanent Marker",
    ];

    void Promise.all(
      familias.map((f) => document.fonts.load(`16px "${f}"`)),
    ).finally(() => setReady(true));
  }, []);

  return ready;
}
