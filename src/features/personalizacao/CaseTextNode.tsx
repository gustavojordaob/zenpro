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
  // `selecionado` é usado apenas pela lógica de arraste/painel — NÃO altera o
  // visual do texto (nada de contorno/cor em volta que confunda o cliente).
  selecionado: _selecionado,
  editavel,
  onChange,
  onSelect,
}: Props) {
  const ref = useRef<Konva.Text>(null);

  function centralizarOffset() {
    const node = ref.current;
    if (!node) return;
    if (texto.align === "center") {
      node.offsetX(node.width() / 2);
      node.offsetY(node.height() / 2);
    } else {
      node.offsetX(0);
      node.offsetY(0);
    }
    node.getLayer()?.batchDraw();
  }

  useEffect(() => {
    centralizarOffset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      shadowBlur={4}
      shadowOffset={{ x: 0, y: 1 }}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ ...texto, x: e.target.x(), y: e.target.y() });
      }}
    />
  );
}
