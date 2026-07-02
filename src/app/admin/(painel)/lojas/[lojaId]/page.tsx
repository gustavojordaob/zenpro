import { SEED_IDS } from "@/features/multitenant/catalogoSeedData";
import AdminLojaPageClient from "./AdminLojaPageClient";

export function generateStaticParams() {
  return [{ lojaId: SEED_IDS.LOJA_A }, { lojaId: SEED_IDS.LOJA_B }];
}

type Props = {
  params: Promise<{ lojaId: string }>;
};

export default async function AdminLojaPage({ params }: Props) {
  const { lojaId } = await params;
  return <AdminLojaPageClient lojaId={lojaId} />;
}
