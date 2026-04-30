import { useState } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const filtered =
    query.length > 0
      ? CIDADES_RS_SC.filter((c) =>
          c.cidade.toLowerCase().includes(query.toLowerCase()),
        )
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
      <h2 className="text-2xl font-bold text-secondary mb-2">De onde você é?</h2>
      <p className="text-muted-foreground mb-6">Atendemos toda a região Sul.</p>

      <Label className="text-secondary font-bold uppercase text-[12px]">CIDADE</Label>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setError("");
        }}
        placeholder="Comece a digitar..."
        className="h-[60px] rounded-2xl text-lg mt-2"
      />
      {error && <p className="text-[12px] text-destructive mt-2">{error}</p>}

      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-border">
        {filtered.map((c) => (
          <button
            key={`${c.cidade}-${c.estado}`}
            onClick={() => select(c.cidade, c.estado)}
            className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted transition ${
              data.cidade === c.cidade ? "bg-muted" : ""
            }`}
          >
            <span className="font-medium text-secondary">{c.cidade}</span>
            <span className="text-muted-foreground text-sm ml-2">— {c.estado}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-muted-foreground text-sm">Nenhuma cidade encontrada.</p>
        )}
      </div>

      <Button
        onClick={next}
        size="lg"
        className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-[60px] rounded-2xl text-lg font-bold"
      >
        Continuar
      </Button>
    </div>
  );
};
