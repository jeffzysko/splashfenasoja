import { OptionScreen } from "./OptionScreen";
import { TAMANHO_OPTIONS } from "@/lib/leads";

export const SizeScreen = () => (
  <OptionScreen
    title="Qual o tamanho do espaço?"
    subtitle="Pensa no maior lado do quintal — onde a piscina entraria. Pode ser chute."
    field="tamanho_quintal"
    nextStep={4}
    options={TAMANHO_OPTIONS.map((o) => ({ ...o }))}
  />
);
