import { notFound } from "next/navigation";
import { getModeloById, MODELOS } from "@/features/personalizacao/modelos";
import { PersonalizarEditor } from "./PersonalizarEditor";

export function generateStaticParams() {
  return MODELOS.map((modelo) => ({ modelo: modelo.id }));
}

type Props = {
  params: Promise<{ modelo: string }>;
};

export default async function PersonalizarPage({ params }: Props) {
  const { modelo: modeloId } = await params;
  const modelo = getModeloById(modeloId);

  if (!modelo) {
    notFound();
  }

  return <PersonalizarEditor modelo={modelo} />;
}
