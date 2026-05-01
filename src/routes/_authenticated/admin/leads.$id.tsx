import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Phone,
  MessageSquare,
  Copy,
  Mail,
  CheckCircle2,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import { TEMP_BADGE, LABELS, SPLASH_WHATSAPP, type Temperatura } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type Status = "novo" | "contatado" | "qualificado" | "descartado";

type LeadDetail = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  cidade: string;
  estado: string;
  tamanho_quintal: string;
  prazo_compra: string;
  orcamento: string;
  score: number;
  temperatura: Temperatura;
  status: Status;
  notes: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/leads/$id")({
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { id } = Route.useParams();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const { user } = useSupabaseAuth();
  const notesTimeoutRef = useRef<Timer | null>(null);

  useEffect(() => {
    const fetchLead = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setLead(data as LeadDetail);
        setNotes(data.notes || "");
      }
      setLoading(false);
    };

    fetchLead();
  }, [id]);

  const updateStatus = async (newStatus: Status) => {
    if (!lead) return;
    const prevStatus = lead.status;
    setLead({ ...lead, status: newStatus });
    
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao atualizar status.");
      setLead({ ...lead, status: prevStatus });
    } else {
      toast.success(`Status alterado para ${newStatus}`);
    }
  };

  const saveNotes = async (val: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({ notes: val })
      .eq("id", id);
    
    if (error) toast.error("Erro ao salvar nota.");
    setSaving(false);
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => {
      saveNotes(val);
    }, 1000);
  };

  const openWhatsApp = () => {
    if (!lead) return;
    const firstName = lead.nome.split(" ")[0];
    const sellerName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || "da Splash";
    const text = `Oi ${firstName}, aqui é ${sellerName} da Splash! Vi que você visitou nosso stand na FENASOJA e gostaria de saber mais sobre piscinas de fibra. Posso te ajudar?`;
    window.open(`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyToClipboard = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Copiado!");
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground font-bold">Lead não encontrado.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/admin/leads">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  const badge = TEMP_BADGE[lead.temperatura];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-400">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/admin/leads"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <h2 className="text-xl font-extrabold text-secondary tracking-tight">Detalhes do Lead</h2>
      </div>

      <div className="flex flex-col items-center text-center p-6 bg-card border border-border rounded-[32px] shadow-sm relative overflow-hidden">
        <div className={cn("w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl mb-4 border-4", badge.className)}>
          {lead.nome.charAt(0)}
        </div>
        <h1 className="text-2xl font-black text-secondary leading-tight">{lead.nome}</h1>
        <p className="text-muted-foreground font-bold text-sm flex items-center gap-1 mt-1">
          {lead.cidade}/{lead.estado}
        </p>
        
        <div className={cn("mt-4 text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest", badge.className)}>
          {lead.temperatura} • {lead.score} Pontos
        </div>
      </div>

      <Button 
        onClick={openWhatsApp}
        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-8 rounded-2xl shadow-xl flex gap-3 text-lg"
      >
        <Phone className="w-6 h-6 fill-current" /> Abrir WhatsApp
      </Button>

      <div className="grid gap-6">
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Qualificação
          </h3>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            <InfoRow label="Espaço" value={LABELS.tamanho_quintal[lead.tamanho_quintal as keyof typeof LABELS.tamanho_quintal] || lead.tamanho_quintal} />
            <InfoRow label="Prazo" value={LABELS.prazo_compra[lead.prazo_compra as keyof typeof LABELS.prazo_compra] || lead.prazo_compra} />
            <InfoRow label="Orçamento" value={LABELS.orcamento[lead.orcamento as keyof typeof LABELS.orcamento] || lead.orcamento} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <User className="w-4 h-4" /> Contato
          </h3>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">WhatsApp</p>
                <p className="font-bold text-secondary">{lead.whatsapp}</p>
              </div>
              <Button size="icon" variant="ghost" className="rounded-xl h-10 w-10" onClick={() => copyToClipboard(lead.whatsapp)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {lead.email && (
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">E-mail</p>
                  <p className="font-bold text-secondary truncate max-w-[200px]">{lead.email}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="rounded-xl h-10 w-10" onClick={() => copyToClipboard(lead.email!)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <a href={`mailto:${lead.email}`}>
                    <Button size="icon" variant="ghost" className="rounded-xl h-10 w-10">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Status do Atendimento
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <StatusButton active={lead.status === "novo"} label="Novo" color="bg-blue-500" onClick={() => updateStatus("novo")} />
            <StatusButton active={lead.status === "contatado"} label="Contatado" color="bg-amber-500" onClick={() => updateStatus("contatado")} />
            <StatusButton active={lead.status === "qualificado"} label="Qualificado" color="bg-green-500" onClick={() => updateStatus("qualificado")} />
            <StatusButton active={lead.status === "descartado"} label="Descartado" color="bg-slate-500" onClick={() => updateStatus("descartado")} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Notas Internas
            </h3>
            {saving && <span className="text-[10px] font-bold text-primary animate-pulse italic">Salvando...</span>}
          </div>
          <Textarea 
            placeholder="Anote detalhes da conversa aqui..." 
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="min-h-[120px] rounded-2xl bg-card border-border focus-visible:ring-primary focus-visible:border-primary text-base py-4"
          />
        </section>
      </div>

      <footer className="pt-10 border-t border-border/50 text-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
          <Clock className="w-3 h-3" /> Capturado em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
        <p className="text-[10px] font-bold text-muted-foreground">Lead ID: {lead.id.slice(0, 8).toUpperCase()}</p>
      </footer>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 flex justify-between items-center">
      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</span>
      <span className="font-bold text-secondary text-right">{value}</span>
    </div>
  );
}

function StatusButton({ active, label, color, onClick }: { active: boolean; label: string; color: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "py-3 rounded-xl font-black text-sm transition-all border-2",
        active 
          ? cn("text-white border-transparent shadow-lg scale-100", color) 
          : "bg-card border-border text-muted-foreground scale-95 opacity-70"
      )}
    >
      {label}
    </button>
  );
}