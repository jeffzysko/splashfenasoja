import { OptionScreen } from "./OptionScreen";

export const SizeScreen = () => (
  <OptionScreen
    title="Como é seu quintal?"
    subtitle="Pra gente sugerir o tamanho ideal."
    field="tamanho_quintal"
    nextStep={4}
    options={[
      { value: "pequeno", label: "Pequeno", hint: "Cabe uma piscina de até 4m", emoji: "🏡" },
      { value: "medio", label: "Médio", hint: "Espaço pra piscina de 5 a 7m", emoji: "🏠" },
      { value: "grande", label: "Grande", hint: "8m ou mais, pode soltar a imaginação", emoji: "🏰" },
      { value: "nao_sei", label: "Ainda não sei", hint: "Tudo bem, a gente te ajuda", emoji: "🤔" },
    ]}
  />
);
