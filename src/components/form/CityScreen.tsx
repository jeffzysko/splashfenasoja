import { useState, useEffect } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// --- City screen ---
const CIDADES_RS_SC = [
  { cidade: "Santa Rosa", estado: "RS" },
  { cidade: "Ijuí", estado: "RS" },
  { cidade: "Santo Ângelo", estado: "RS" },
  { cidade: "Cruz Alta", estado: "RS" },
  { cidade: "Passo Fundo", estado: "RS" },
  { cidade: "Erechim", estado: "RS" },
  { cidade: "Porto Alegre", estado: "RS" },
  { cidade: "Caxias do Sul", estado: "RS" },
  { cidade: "Santa Maria", estado: "RS" },
  { cidade: "Pelotas", estado: "RS" },
  { cidade: "Chapecó", estado: "SC" },
  { cidade: "Florianópolis", estado: "SC" },
  { cidade: "Joinville", estado: "SC" },
  { cidade: "Blumenau", estado: "SC" },
  { cidade: "Lages", estado: "SC" },
  { cidade: "Criciúma", estado: "SC" },
];

export const CityScreen = () => {
  const { data, updateData, setStep } = useFormStore();
  const [query, setQuery] = useState(data.cidade || "");
  const [error, setError] = useState("");

  const filtered = query.length > 0
    ? CIDADES_RS_SC.filter((c) => c.cidade.toLowerCase().includes(query.toLowerCase()))
    : CIDADES_RS_SC.slice(0, 6);

  const select = (cidade: string, estado: string) => {
    updateData({ cidade, estado });
    setQuery(cidade);
    setError("");
  };

  const next = () => {
    const match = CIDADES_RS_SC.find((c) => c.cidade === query);
    if (!match) {
      setError("Selecione sua cidade na lista 🙂");
      return;
    }
    setStep(3);
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-sky-950 mb-2">De onde você é?</h2>
      <p className="text-sky-700 mb-6">Atendemos toda a região Sul.</p>

      <Label className="text-sky-700 font-bold uppercase text-[12px]">CIDADE</Label>
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setError(""); }}
        placeholder="Comece a digitar..."
        className="h-[60px] rounded-2xl text-lg mt-2"
      />
      {error && <p className="text-[12px] text-destructive mt-2">{error}</p>}

      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-sky-100">
        {filtered.map((c) => (
          <button
            key={`${c.cidade}-${c.estado}`}
            onClick={() => select(c.cidade, c.estado)}
            className={`w-full text-left px-4 py-3 border-b border-sky-50 last:border-b-0 hover:bg-sky-50 transition ${
              data.cidade === c.cidade ? "bg-sky-100" : ""
            }`}
          >
            <span className="font-medium text-sky-950">{c.cidade}</span>
            <span className="text-sky-500 text-sm ml-2">— {c.estado}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-sky-500 text-sm">Nenhuma cidade encontrada.</p>
        )}
      </div>

      <Button onClick={next} size="lg" className="w-full mt-6 bg-orange-500 hover:bg-orange-600 h-[60px] rounded-2xl text-lg font-bold">
        Continuar
      </Button>
    </div>
  );
};

// --- Generic option-picker screens ---
const OptionScreen = ({
  title, subtitle, options, field, nextStep,
}: {
  title: string; subtitle: string;
  options: { value: string; label: string; hint?: string }[];
  field: "tamanho_quintal" | "prazo_compra" | "orcamento";
  nextStep: number;
}) => {
  const { data, updateData, setStep } = useFormStore();
  const selected = data[field];

  const choose = (value: string) => {
    updateData({ [field]: value } as any);
    setTimeout(() => setStep(nextStep), 200);
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-sky-950 mb-2">{title}</h2>
      <p className="text-sky-700 mb-6">{subtitle}</p>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => choose(opt.value)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
              selected === opt.value
                ? "border-orange-500 bg-orange-50"
                : "border-sky-100 bg-white hover:border-sky-300"
            }`}
          >
            <div className="font-bold text-sky-950 text-lg">{opt.label}</div>
            {opt.hint && <div className="text-sky-600 text-sm mt-1">{opt.hint}</div>}
          </button>
        ))}
      </div>
    </div>
  );
};

export const SizeScreen = () => (
  <OptionScreen
    title="Como é seu quintal?"
    subtitle="Pra gente sugerir o tamanho ideal."
    field="tamanho_quintal"
    nextStep={4}
    options={[
      { value: "pequeno", label: "Pequeno", hint: "Cabe uma piscina de até 4m" },
      { value: "medio", label: "Médio", hint: "Espaço pra piscina de 5 a 7m" },
      { value: "grande", label: "Grande", hint: "8m ou mais, pode soltar a imaginação" },
      { value: "nao_sei", label: "Ainda não sei", hint: "Tudo bem, a gente te ajuda" },
    ]}
  />
);

export const TimelineScreen = () => (
  <OptionScreen
    title="Pra quando é o sonho?"
    subtitle="Sem pressão, só pra entender seu momento."
    field="prazo_compra"
    nextStep={5}
    options={[
      { value: "ate_30_dias", label: "Já quero, pra ontem", hint: "Em até 30 dias" },
      { value: "ate_3_meses", label: "Próximos 3 meses" },
      { value: "ate_6_meses", label: "Até 6 meses" },
      { value: "pesquisando", label: "Só pesquisando ainda" },
    ]}
  />
);

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

// --- Submitting screen — saves to Supabase ---
export const SubmittingScreen = () => {
  const { data, setStep } = useFormStore();

  useEffect(() => {
    const submit = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const { error } = await supabase.from("leads").insert({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email || null,
          cidade: data.cidade,
          estado: data.estado,
          tamanho_quintal: data.tamanho_quintal,
          prazo_compra: data.prazo_compra,
          orcamento: data.orcamento,
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          user_agent: navigator.userAgent,
        });
        if (error) throw error;
        setTimeout(() => setStep(7), 800);
      } catch (err: any) {
        console.error("Erro ao salvar lead:", err);
        toast.error("Ops, algo deu errado. Tenta de novo?");
        setStep(5);
      }
    };
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-16 h-16 text-sky-500 animate-spin mb-6" />
      <h2 className="text-2xl font-bold text-sky-950 mb-2">Quase lá...</h2>
      <p className="text-sky-700">Salvando seus dados com segurança 🔒</p>
    </div>
  );
};

// --- Success screen ---
export const SuccessScreen = () => {
  const { data, reset } = useFormStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-sky-950 mb-4 max-w-sm">
        Prontinho, {data.nome.split(" ")[0]}! 🎉
      </h1>
      <p className="text-lg text-sky-700 mb-2 max-w-md">
        Em instantes você recebe o catálogo no WhatsApp.
      </p>
      <p className="text-sky-600 mb-8 max-w-md">
        Um consultor da Splash vai te chamar pra tirar dúvidas e montar uma proposta sob medida.
      </p>
      <Button
        onClick={reset}
        size="lg"
        variant="outline"
        className="border-sky-300 text-sky-700 rounded-2xl h-[56px] px-8"
      >
        Cadastrar outro lead
      </Button>
    </div>
  );
};
