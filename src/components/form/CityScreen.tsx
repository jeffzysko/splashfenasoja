import { useState, useEffect, useMemo, useRef } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScreenContainer } from "./ScreenContainer";
import { Search, Loader2 } from "lucide-react";

type Municipio = { nome: string; uf: string };

// Cache em memória (lifetime da sessão)
let MUNICIPIOS_CACHE: Municipio[] | null = null;
let MUNICIPIOS_PROMISE: Promise<Municipio[]> | null = null;

async function fetchMunicipios(): Promise<Municipio[]> {
  if (MUNICIPIOS_CACHE) return MUNICIPIOS_CACHE;
  if (MUNICIPIOS_PROMISE) return MUNICIPIOS_PROMISE;
  MUNICIPIOS_PROMISE = (async () => {
    const res = await fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
    );
    if (!res.ok) throw new Error("Falha IBGE");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any[] = await res.json();
    const list: Municipio[] = json.map((m) => ({
      nome: m.nome,
      uf: m?.microrregiao?.mesorregiao?.UF?.sigla ?? "",
    }));
    MUNICIPIOS_CACHE = list;
    return list;
  })();
  return MUNICIPIOS_PROMISE;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const CityScreen = () => {
  const { data, updateData, setStep } = useFormStore();
  const [query, setQuery] = useState(data.cidade || "");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(MUNICIPIOS_CACHE);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (municipios) return;
    setLoading(true);
    fetchMunicipios()
      .then(setMunicipios)
      .catch(() => setError("Não consegui carregar a lista de cidades. Tenta de novo?"))
      .finally(() => setLoading(false));
  }, [municipios]);

  // Quando o usuário digita, qualquer cidade previamente confirmada é invalidada
  // até que ele selecione novamente da lista.
  const isConfirmed = !!data.cidade && query === data.cidade && !!data.estado;

  const filtered = useMemo(() => {
    if (!municipios) return [];
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    
    // Prioridade por estado: RS > SC > PR > Outros
    const getPriority = (uf: string) => {
      if (uf === "RS") return 0;
      if (uf === "SC") return 1;
      if (uf === "PR") return 2;
      return 3;
    };

    return municipios
      .filter((m) => normalize(m.nome).includes(q))
      .sort((a, b) => {
        const priorityA = getPriority(a.uf);
        const priorityB = getPriority(b.uf);
        
        // Primeiro ordena por prioridade de estado
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Se no mesmo nível de prioridade, ordena alfabeticamente pelo nome
        return a.nome.localeCompare(b.nome, 'pt-BR');
      })
      .slice(0, 8);
  }, [municipios, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const select = (m: Municipio) => {
    updateData({ cidade: m.nome, estado: m.uf });
    setQuery(m.nome);
    setOpen(false);
    setError("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        select(filtered[highlight]);
      } else if (isConfirmed) {
        e.preventDefault();
        next();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const next = () => {
    if (!isConfirmed) {
      setError("Selecione sua cidade na lista 🙂");
      return;
    }
    setStep(3);
  };

  return (
    <ScreenContainer>
      <h2 className="text-[28px] leading-tight font-extrabold text-secondary mb-2 tracking-tight">
        Onde fica o futuro paraíso?
      </h2>
      <p className="text-muted-foreground mb-7">
        Digita as primeiras letras da sua cidade — a gente preenche o estado.
      </p>

      <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
        Cidade
      </Label>
      <div className="relative mt-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (data.cidade && e.target.value !== data.cidade) {
              updateData({ cidade: "", estado: "" });
            }
            setError("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          placeholder="Comece a digitar..."
          className="h-[60px] rounded-2xl text-lg pl-12 pr-20 border-2 focus-visible:border-primary focus-visible:ring-0"
        />
        {/* Badge UF flutuando */}
        {isConfirmed && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 text-primary text-xs font-extrabold px-2.5 py-1 rounded-full border border-primary/30 tracking-wider">
            {data.estado}
          </span>
        )}
        {loading && !isConfirmed && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 left-0 right-0 top-[68px] max-h-72 overflow-y-auto rounded-2xl border-2 border-border bg-card shadow-xl divide-y divide-border"
          >
            {filtered.map((m, i) => (
              <li
                key={`${m.nome}-${m.uf}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(m);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-4 py-3.5 flex items-center gap-3 cursor-pointer ${
                  i === highlight ? "bg-primary/5" : ""
                }`}
              >
                <span className="font-medium text-secondary flex-1">{m.nome}</span>
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  · {m.uf}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Começa a digitar e escolha sua cidade na lista.
      </p>
      {error && <p className="text-[12px] text-destructive mt-2">{error}</p>}

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
