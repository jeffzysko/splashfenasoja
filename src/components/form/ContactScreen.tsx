import React from "react";
import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const schema = z.object({
  nome: z.string().min(2, "A gente precisa do seu nome 🙂"),
  whatsapp: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Hmm, esse número não parece certo. Confere o DDD?"),
  email: z.string().email("Esse e-mail tá com cara de errado, dá uma olhada?").optional().or(z.literal("")),
});

export const ContactScreen = () => {
  const { updateData, setStep, data } = useFormStore();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nome: data.nome, whatsapp: data.whatsapp, email: data.email || "" },
  });

  const onSubmit = (values: any) => {
    updateData(values);
    setStep(2);
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-sky-950 mb-2">Como te encontramos?</h2>
      <p className="text-sky-700 mb-8">Promessa: nada de spam. Só o catálogo e um oi do consultor.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="nome" render={({ field }) => (
            <FormItem>
              <Label className="text-sky-700 font-bold uppercase text-[12px]">NOME</Label>
              <FormControl>
                <Input {...field} className="h-[60px] rounded-2xl text-lg" placeholder="Seu nome" />
              </FormControl>
              <FormMessage className="text-[12px] text-destructive" />
            </FormItem>
          )} />
          
          <FormField control={form.control} name="whatsapp" render={({ field }) => (
            <FormItem>
              <Label className="text-sky-700 font-bold uppercase text-[12px]">WHATSAPP</Label>
              <FormControl>
                <Input {...field} className="h-[60px] rounded-2xl text-lg" placeholder="(00) 00000-0000" />
              </FormControl>
              <FormMessage className="text-[12px] text-destructive" />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <Label className="text-sky-700 font-bold uppercase text-[12px]">E-MAIL (OPCIONAL)</Label>
              <FormControl>
                <Input {...field} className="h-[60px] rounded-2xl text-lg" placeholder="seu@email.com" />
              </FormControl>
              <FormMessage className="text-[12px] text-destructive" />
            </FormItem>
          )} />

          <Button type="submit" size="lg" className="w-full bg-orange-500 hover:bg-orange-600 h-[60px] rounded-2xl text-lg font-bold">
            Continuar
          </Button>
        </form>
      </Form>
    </div>
  );
};
