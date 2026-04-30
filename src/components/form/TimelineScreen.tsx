import { OptionScreen } from "./OptionScreen";
import { PRAZO_OPTIONS } from "@/lib/leads";

export const TimelineScreen = () => (
  <OptionScreen
    title="Pra quando é o sonho?"
    subtitle="Honesto é melhor — ninguém vai te apressar."
    field="prazo_compra"
    nextStep={5}
    options={PRAZO_OPTIONS.map((o) => ({ ...o }))}
  />
);
