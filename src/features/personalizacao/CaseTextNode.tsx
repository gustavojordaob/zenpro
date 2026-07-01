"use client";

import { useEffect, useRef } from "react";
import { Text as KonvaText } from "react-konva";
import type Konva from "konva";
import { getFonteFamilia } from "./caseTextFonts";
import type { TextoCapinha } from "./caseTextFonts";

type Props = {
  texto: TextoCapinha;
  selecionado: boolean;
  editavel: boolean;
  onChange: (next: TextoCapinha) => void;
  onSelect: () => void;
};

export function CaseTextNode({
  texto,
  selecionado,
  editavel,
  onChange,
  onSelect,
}: Props) {
  const ref = useRef<Konva.Text>(null);

  function centralizarOffset() {
    const node = ref.current;
    if (!node || texto.align !== "center") return;
    node.offsetX(node.width() / 2);
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  }

  useEffect(() => {
    centralizarOffset();
  }, [texto.conteudo, texto.fontSize, texto.fontId, texto.fontStyle, texto.align]);

  const fontStyle =
    texto.fontStyle === "bold"
      ? "bold"
      : texto.fontStyle === "italic"
        ? "italic"
        : "normal";

  return (
    <KonvaText
      ref={ref}
      text={texto.conteudo}
      x={texto.x}
      y={texto.y}
      fontSize={texto.fontSize}
      fontFamily={getFonteFamilia(texto.fontId)}
      fontStyle={fontStyle}
      fill={texto.fill}
      rotation={texto.rotation}
      align={texto.align}
      draggable={editavel}
      listening={editavel}
      shadowColor="rgba(0,0,0,0.45)"
      shadowBlur={selecionado ? 0 : 4}
      shadowOffset={{ x: 0, y: 1 }}
      stroke={selecionado ? "#3b82f6" : undefined}
      strokeWidth={selecionado ? 1 : 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ ...texto, x: e.target.x(), y: e.target.y() });
      }}
    />
  );
}
