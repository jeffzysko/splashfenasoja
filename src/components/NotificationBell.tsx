import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TEMP_BADGE, type Temperatura } from "@/lib/leads";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LAST_SEEN_KEY = "notif_last_seen_v1";
const MAX_ITEMS = 20;

type NotifLead = {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  temperatura: Temperatura;
  created_at: string;
};

function readLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  return raw ? Number(raw) || 0 : 0;
}

function writeLastSeen(ts: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SEEN_KEY, String(ts));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifLead[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => readLastSeen());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carrega últimos leads
  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, nome, cidade, estado, temperatura, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_ITEMS);
      if (data) setItems(data as NotifLead[]);
    };
    fetchLeads();

    // Realtime: novo lead chegando
    const channel = supabase
      .channel("notif-bell-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as NotifLead;
          setItems((prev) => [newLead, ...prev].slice(0, MAX_ITEMS));

          // Toast
          const isHot = newLead.temperatura === "quente";
          toast(
            isHot ? "🔥 Lead QUENTE chegou!" : "🔔 Novo lead",
            {
              description: `${newLead.nome} • ${newLead.cidade}/${newLead.estado}`,
              duration: isHot ? 8000 : 4000,
            }
          );

          // Som (se ativado)
          try {
            if (
              typeof window !== "undefined" &&
              localStorage.getItem("notifSound") === "on"
            ) {
              if (!audioRef.current) {
                audioRef.current = new Audio("https://cdn.gpteng.co/ding.mp3");
              }
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = useMemo(
    () =>
      items.filter((l) => new Date(l.created_at).getTime() > lastSeen).length,
    [items, lastSeen]
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && items.length > 0) {
      // Marca o mais recente como visto ao abrir (após pequeno delay para o usuário ver o highlight)
      const newest = new Date(items[0].created_at).getTime();
      setTimeout(() => {
        writeLastSeen(newest);
        setLastSeen(newest);
      }, 1500);
    }
  };

  const markAllRead = () => {
    if (items.length === 0) return;
    const newest = new Date(items[0].created_at).getTime();
    writeLastSeen(newest);
    setLastSeen(newest);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Notificações"
        >
          <Bell
            className={cn(
              "w-5 h-5 transition-transform",
              unreadCount > 0 && "text-primary animate-[wiggle_1.2s_ease-in-out_infinite]"
            )}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] max-w-[calc(100vw-2rem)] p-0 rounded-2xl border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-black text-secondary tracking-tight">
              Notificações
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              {unreadCount > 0
                ? `${unreadCount} ${unreadCount === 1 ? "novo lead" : "novos leads"}`
                : "Tudo em dia"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-8 text-[11px] font-bold text-primary hover:text-primary"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Marcar lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">
                Sem notificações ainda
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Você verá aqui quando um lead chegar
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {items.map((lead) => {
                const isUnread = new Date(lead.created_at).getTime() > lastSeen;
                const tempBadge = TEMP_BADGE[lead.temperatura];
                return (
                  <li key={lead.id}>
                    <Link
                      to="/admin/leads/$id"
                      params={{ id: lead.id }}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-l-2",
                        isUnread
                          ? "border-l-primary bg-primary/[0.03]"
                          : "border-l-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center font-black shrink-0",
                          tempBadge.className.split(" ")[0],
                          tempBadge.className.split(" ")[1]
                        )}
                      >
                        {lead.temperatura === "quente" ? (
                          <Flame className="w-4 h-4" />
                        ) : (
                          lead.nome.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-secondary truncate">
                            {lead.nome}
                          </p>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.cidade}/{lead.estado}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {formatDistanceToNow(new Date(lead.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                          tempBadge.className
                        )}
                      >
                        {lead.temperatura}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-border px-4 py-2">
          <Link
            to="/admin/leads"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-bold text-primary hover:underline py-1"
          >
            Ver todos os leads
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
