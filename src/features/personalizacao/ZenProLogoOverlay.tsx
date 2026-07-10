"use client";

import { useEffect, useState } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import type { CameraModuleSpec } from "./cameraModules";
import {
  getZenProLogoPlacement,
  loadZenProLogoImage,
  ZENPRO_LOGO_SRC,
} from "./zenProBrandOverlay";

type Props = {
  cameraSpec: CameraModuleSpec;
  molduraX: number;
  molduraY: number;
  molduraW: number;
  molduraH: number;
};

function useZenProLogo() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let ativo = true;
    void loadZenProLogoImage()
      .then((img) => {
        if (ativo) setImage(img);
      })
      .catch(() => {
        if (ativo) setImage(null);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return image;
}

/** Logo sobre a foto — fundo sutil para contraste em imagens claras ou escuras. */
export function ZenProLogoOverlay({
  cameraSpec,
  molduraX,
  molduraY,
  molduraW,
  molduraH,
}: Props) {
  const logoImage = useZenProLogo();
  if (!logoImage) return null;

  const p = getZenProLogoPlacement(
    cameraSpec,
    molduraW,
    molduraH,
    molduraX,
    molduraY,
  );

  const groupX = p.x - p.padX;
  const groupY = p.y - p.padY;
  const groupW = p.width + p.padX * 2;
  const groupH = p.height + p.padY * 2;

  return (
    <Group x={groupX} y={groupY} listening={false}>
      <Rect
        width={groupW}
        height={groupH}
        cornerRadius={Math.max(4, p.width * 0.12)}
        fill="rgba(0,0,0,0.42)"
        shadowColor="#000"
        shadowBlur={8}
        shadowOpacity={0.4}
      />
      <KonvaImage
        image={logoImage}
        x={p.padX}
        y={p.padY}
        width={p.width}
        height={p.height}
        shadowColor="#000"
        shadowBlur={3}
        shadowOpacity={0.55}
      />
    </Group>
  );
}

export { ZENPRO_LOGO_SRC };
