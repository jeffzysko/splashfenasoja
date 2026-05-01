import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Flame, MoreHorizontal, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TEMP_BADGE,
  STATUS_BADGE,
  type Temperatura,
  type LeadStatus,
} from "@/lib/leads";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loadPrefs, shouldNotify, isInQuietHours } from "@/lib/notifPrefs";

const LAST_SEEN_KEY = "notif_last_seen_v1";
const MAX_ITEMS = 20;

type NotifLead = {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  temperatura: Temperatura;
  status: LeadStatus;
  created_at: string;
};

const STATUS_OPTIONS: LeadStatus[] = [
  "novo",
  "contatado",
  "qualificado",
  "vendido",
  "perdido",
  "descartado",
];

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carrega últimos leads + realtime
  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, nome, cidade, estado, temperatura, status, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_ITEMS);
      if (data) setItems(data as NotifLead[]);
    };
    fetchLeads();

    const channel = supabase
      .channel("notif-bell-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as NotifLead;
          setItems((prev) => [newLead, ...prev].slice(0, MAX_ITEMS));

          const prefs = loadPrefs();
          const { toast: shouldToast, sound: shouldSound } = shouldNotify(
            prefs,
            newLead.temperatura
          );

          if (shouldToast) {
            const isHot = newLead.temperatura === "quente";
            toast(isHot ? "🔥 Lead QUENTE chegou!" : "🔔 Novo lead", {
              description: `${newLead.nome} • ${newLead.cidade}/${newLead.estado}`,
              duration: isHot ? 8000 : 4000,
            });
          }

          if (shouldSound) {
            try {
              if (!audioRef.current) {
                audioRef.current = new Audio("https://cdn.gpteng.co/ding.mp3");
              }
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            } catch {}
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const updated = payload.new as NotifLead;
          setItems((prev) =>
            prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
          );
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

  const updateStatus = async (id: string, status: LeadStatus) => {
    setUpdatingId(id);
    // Atualiza otimisticamente
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);
    setUpdatingId(null);
    if (error) {
      toast.error("Erro ao atualizar status");
      // Recarrega para reverter
      const { data } = await supabase
        .from("leads")
        .select("id, nome, cidade, estado, temperatura, status, created_at")
        .order("created_at", { ascending: false })
        .limit(MAX_ITEMS);
      if (data) setItems(data as NotifLead[]);
    } else {
      toast.success(`Status atualizado: ${STATUS_BADGE[status].label}`);
    }
  };

  const quietActive = isInQuietHours(loadPrefs());

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
              unreadCount > 0 &&
                "text-primary animate-[wiggle_1.2s_ease-in-out_infinite]"
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
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0 rounded-2xl border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-black text-secondary tracking-tight flex items-center gap-1.5">
              Notificações
              {quietActive && (
                <span
                  title="Modo não perturbe ativo"
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full"
                >
                  <Moon className="w-2.5 h-2.5" />
                  Silencioso
                </span>
              )}
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
                const isUnread =
                  new Date(lead.created_at).getTime() > lastSeen;
                const tempBadge = TEMP_BADGE[lead.temperatura];
                const statusBadge = STATUS_BADGE[lead.status];
                const updating = updatingId === lead.id;
                return (
                  <li
                    key={lead.id}
                    className={cn(
                      "relative border-l-2 hover:bg-muted/50 transition-colors",
                      isUnread
                        ? "border-l-primary bg-primary/[0.03]"
                        : "border-l-transparent"
                    )}
                  >
                    <Link
                      to="/admin/leads/$id"
                      params={{ id: lead.id }}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 pr-12"
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
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider",
                              statusBadge.className
                            )}
                          >
                            <span
                              className={cn("w-1 h-1 rounded-full", statusBadge.dot)}
                            />
                            {statusBadge.label}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider",
                              tempBadge.className
                            )}
                          >
                            {lead.temperatura}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 ml-auto">
                            {formatDistanceToNow(new Date(lead.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Botão rápido de atualizar status */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Atualizar status"
                          disabled={updating}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors",
                            updating && "opacity-50"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Atualizar status
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {STATUS_OPTIONS.map((s) => {
                          const sb = STATUS_BADGE[s];
                          const current = s === lead.status;
                          return (
                            <DropdownMenuItem
                              key={s}
                              disabled={current}
                              onSelect={() => updateStatus(lead.id, s)}
                              className="gap-2 cursor-pointer"
                            >
                              <span
                                className={cn("w-2 h-2 rounded-full", sb.dot)}
                              />
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  current && "text-primary"
                                )}
                              >
                                {sb.label}
                              </span>
                              {current && (
                                <CheckCheck className="w-3 h-3 ml-auto text-primary" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
