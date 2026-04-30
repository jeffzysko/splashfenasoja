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
  data: LeadData;
  // Resultado do submit (usado na tela de sucesso)
  submitted: {
    leadId: string | null;
    score: number;
    temperatura: 'quente' | 'morno' | 'frio';
  };
  setStep: (step: number) => void;
  updateData: (newData: Partial<LeadData>) => void;
  setSubmitted: (s: { leadId: string; score: number; temperatura: 'quente' | 'morno' | 'frio' }) => void;
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
  data: emptyData,
  submitted: { leadId: null, score: 0, temperatura: 'frio' },
  setStep: (step) => set({ step }),
  updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setSubmitted: (s) => set({ submitted: s }),
  reset: () =>
    set({
      step: 0,
      data: emptyData,
      submitted: { leadId: null, score: 0, temperatura: 'frio' },
    }),
}));
