import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ScreenContainer } from "./ScreenContainer";

const schema = z.object({
  nome: z.string().trim().min(2, "A gente precisa do seu nome 🙂").max(80),
  whatsapp: z
    .string()
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length === 10 || digits.length === 11;
    }, "Hmm, esse número não parece certo. Confere o DDD?"),
  email: z
    .string()
    .trim()
    .email("Esse e-mail tá com cara de errado, dá uma olhada?")
    .max(255)
    .optional()
    .or(z.literal("")),
});

const maskWhatsapp = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  
  if (d.length <= 10) {
    // Formato Fixo: (99) 9999-9999
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  // Formato Celular: (99) 99999-9999
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const ContactScreen = () => {
  const { updateData, setStep, data } = useFormStore();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nome: data.nome, whatsapp: data.whatsapp, email: data.email || "" },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    updateData(values);
    setStep(2);
  };

  return (
    <ScreenContainer>
      <h2 className="text-[28px] leading-tight font-extrabold text-secondary mb-2 tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-forwards">
        Como te encontramos?
      </h2>
      <p className="text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-forwards">
        Promessa: nada de spam. Só o catálogo e um oi do consultor.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200 fill-mode-forwards">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
                  Nome
                </Label>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="name"
                    className="h-[60px] rounded-2xl text-lg border-2 focus-visible:border-primary focus-visible:ring-0"
                    placeholder="Seu nome"
                  />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
                  WhatsApp
                </Label>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    autoComplete="tel"
                    onChange={(e) => field.onChange(maskWhatsapp(e.target.value))}
                    className="h-[60px] rounded-2xl text-lg border-2 focus-visible:border-primary focus-visible:ring-0"
                    placeholder="(00) 00000-0000"
                  />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
                  E-mail (opcional)
                </Label>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    className="h-[60px] rounded-2xl text-lg border-2 focus-visible:border-primary focus-visible:ring-0"
                    placeholder="seu@email.com"
                  />
                </FormControl>
                <FormMessage className="text-[12px]" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-[60px] rounded-2xl text-lg font-bold mt-2 shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--primary)_55%,transparent)] transition-all active:scale-[0.98]"
          >
            Continuar
          </Button>
        </form>
      </Form>
    </ScreenContainer>
  );
};