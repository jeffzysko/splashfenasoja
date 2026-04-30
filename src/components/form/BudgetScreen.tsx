import { OptionScreen } from "./OptionScreen";

export const BudgetScreen = () => (
  <OptionScreen
    title="Qual seu orçamento?"
    subtitle="Pra te mostrar opções que cabem no bolso."
    field="orcamento"
    nextStep={6}
    options={[
      { value: "ate_30k", label: "Até R$ 30 mil" },
      { value: "30_a_50k", label: "Entre R$ 30 e 50 mil" },
      { value: "50_a_80k", label: "Entre R$ 50 e 80 mil" },
      { value: "acima_80k", label: "Acima de R$ 80 mil" },
      { value: "nao_sei", label: "Ainda não pensei nisso" },
    ]}
  />
);
