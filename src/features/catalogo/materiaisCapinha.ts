/** Materiais / acabamentos de capinha — extensível pelo admin (campo livre também). */
export const MATERIAIS_CAPINHA = [
  { id: "couro", rotulo: "Couro" },
  { id: "silicone", rotulo: "Silicone" },
  { id: "plastico", rotulo: "Plástico" },
  { id: "acrilico", rotulo: "Acrílico" },
  { id: "tpu", rotulo: "TPU" },
  { id: "policarbonato", rotulo: "Policarbonato" },
] as const;

export function rotuloMaterial(material?: string | null): string | undefined {
  if (!material) return undefined;
  const found = MATERIAIS_CAPINHA.find(
    (m) => m.id === material || m.rotulo.toLowerCase() === material.toLowerCase(),
  );
  return found?.rotulo ?? material;
}
