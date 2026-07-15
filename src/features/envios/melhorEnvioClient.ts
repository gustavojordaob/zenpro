import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";

export type OpcaoFreteMelhorEnvio = {
  servicoId: number;
  nome: string;
  empresa: string;
  companyId: number | null;
  precoCentavos: number;
  prazoDias: number | null;
  picture: string | null;
};

export type CalcularFreteInput = {
  lojaId: string;
  cepDestino: string;
  itens: {
    produtoId: string;
    quantidade: number;
    personalizacaoId?: string | null;
    precoCentavos?: number;
  }[];
};

export type CalcularFreteResult = {
  cepOrigem: string;
  cepDestino: string;
  origemLojaId: string;
  motivoOrigem: string;
  opcoes: OpcaoFreteMelhorEnvio[];
};

export async function calcularFreteMelhorEnvio(
  input: CalcularFreteInput,
): Promise<CalcularFreteResult> {
  const callable = httpsCallable<CalcularFreteInput, CalcularFreteResult>(
    getFirebaseFunctions(),
    "calcularFreteMelhorEnvio",
  );
  const { data } = await callable(input);
  if (!data?.opcoes) {
    throw new Error("Não foi possível calcular o frete.");
  }
  return data;
}
