import { OptionScreen } from "./OptionScreen";

export const TimelineScreen = () => (
  <OptionScreen
    title="Pra quando é o sonho?"
    subtitle="Sem pressão, só pra entender seu momento."
    field="prazo_compra"
    nextStep={5}
    options={[
      { value: "ate_30_dias", label: "Já quero, pra ontem", hint: "Em até 30 dias", emoji: "🔥" },
      { value: "ate_3_meses", label: "Próximos 3 meses", emoji: "☀️" },
      { value: "ate_6_meses", label: "Até 6 meses", emoji: "📅" },
      { value: "pesquisando", label: "Só pesquisando ainda", emoji: "🔎" },
    ]}
  />
);
