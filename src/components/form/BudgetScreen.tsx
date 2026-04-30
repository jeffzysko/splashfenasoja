import { OptionScreen } from "./OptionScreen";
import { ORCAMENTO_OPTIONS } from "@/lib/leads";

export const BudgetScreen = () => (
  <OptionScreen
    title="Qual faixa de investimento faz sentido?"
    subtitle="Pra montar uma proposta realista pra você."
    field="orcamento"
    nextStep={6}
    options={ORCAMENTO_OPTIONS.map((o) => ({ ...o }))}
    validation={{
      required: true,
      options: ORCAMENTO_OPTIONS.map(o => o.value)
    }}
  />
);
