import { create } from 'zustand';

export type LeadData = {
  nome: string;
  whatsapp: string;
  email?: string;
  cidade: string;
  estado: string;
  tamanho_quintal: string;
  prazo_compra: string;
  orcamento: string;
};

type FormStore = {
  step: number;
  // Contexto da feira atual (preenchido pela rota /$slug)
  feiraId: string;
  feiraNome: string;
  feiraSlug: string;
  data: LeadData;
  submitted: {
    leadId: string | null;
    score: number;
    temperatura: 'quente' | 'morno' | 'frio';
    isDuplicate?: boolean;
  };
  setStep: (step: number) => void;
  setFeira: (id: string, nome: string, slug: string) => void;
  updateData: (newData: Partial<LeadData>) => void;
  setSubmitted: (s: { leadId: string; score: number; temperatura: 'quente' | 'morno' | 'frio'; isDuplicate?: boolean }) => void;
  reset: () => void;
};

const emptyData: LeadData = {
  nome: '',
  whatsapp: '',
  email: '',
  cidade: '',
  estado: '',
  tamanho_quintal: '',
  prazo_compra: '',
  orcamento: '',
};

export const useFormStore = create<FormStore>((set) => ({
  step: 0,
  feiraId: '',
  feiraNome: '',
  feiraSlug: '',
  data: emptyData,
  submitted: { leadId: null, score: 0, temperatura: 'frio', isDuplicate: false },
  setStep: (step) => set({ step }),
  setFeira: (feiraId, feiraNome, feiraSlug) => set({ feiraId, feiraNome, feiraSlug }),
  updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setSubmitted: (s) => set({ submitted: s }),
  reset: () =>
    set({
      step: 0,
      data: emptyData,
      submitted: { leadId: null, score: 0, temperatura: 'frio', isDuplicate: false },
      // feiraId/feiraNome/feiraSlug são mantidos para o caso de o usuário
      // querer preencher novamente na mesma feira
    }),
}));
