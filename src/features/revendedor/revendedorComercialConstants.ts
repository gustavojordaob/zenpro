/** Pedido mínimo de reposição/compra B2B (R$ 800,00). */
export const PEDIDO_MINIMO_REVENDEDOR_CENTAVOS = 80_000;

/** WhatsApp atendimento revendedor (Seven / Zen Pro) — só dígitos com DDI */
export const WHATSAPP_ATENDIMENTO_REVENDEDOR =
  process.env.NEXT_PUBLIC_WHATSAPP_ATENDIMENTO ?? "5519996331110";

export function linkWhatsAppAtendimento(texto?: string): string {
  const base = `https://wa.me/${WHATSAPP_ATENDIMENTO_REVENDEDOR.replace(/\D/g, "")}`;
  if (!texto?.trim()) return base;
  return `${base}?text=${encodeURIComponent(texto.trim())}`;
}
