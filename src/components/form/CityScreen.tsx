import { useState, useMemo } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScreenContainer } from "./ScreenContainer";
import { MapPin, Search } from "lucide-react";

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

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const CityScreen = () => {
  const { data, updateData, setStep } = useFormStore();
  const [query, setQuery] = useState(data.cidade || "");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return CIDADES_RS_SC.slice(0, 8);
    return CIDADES_RS_SC.filter((c) => normalize(c.cidade).includes(q));
  }, [query]);

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
    <ScreenContainer>
      <h2 className="text-[28px] leading-tight font-extrabold text-secondary mb-2 tracking-tight">
        De onde você é?
      </h2>
      <p className="text-muted-foreground mb-7">Atendemos toda a região Sul.</p>

      <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
        Cidade
      </Label>
      <div className="relative mt-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError("");
          }}
          placeholder="Comece a digitar..."
          className="h-[60px] rounded-2xl text-lg pl-12 border-2 focus-visible:border-primary focus-visible:ring-0"
        />
      </div>
      {error && <p className="text-[12px] text-destructive mt-2">{error}</p>}

      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border-2 border-border divide-y divide-border bg-card">
        {filtered.map((c) => {
          const isSelected = data.cidade === c.cidade;
          return (
            <button
              key={`${c.cidade}-${c.estado}`}
              onClick={() => select(c.cidade, c.estado)}
              className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${
                isSelected ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <MapPin
                className={`w-4 h-4 shrink-0 ${
                  isSelected ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="font-medium text-secondary flex-1">{c.cidade}</span>
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                {c.estado}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="p-4 text-muted-foreground text-sm text-center">
            Nenhuma cidade encontrada.
          </p>
        )}
      </div>

      <Button
        onClick={next}
        size="lg"
        className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-[60px] rounded-2xl text-lg font-bold shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--primary)_55%,transparent)] transition-all active:scale-[0.98]"
      >
        Continuar
      </Button>
    </ScreenContainer>
  );
};
