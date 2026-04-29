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
  setStep: (step: number) => void;
  updateData: (newData: Partial<LeadData>) => void;
  reset: () => void;
};

export const useFormStore = create<FormStore>((set) => ({
  step: 0,
  data: {
    nome: '',
    whatsapp: '',
    email: '',
    cidade: '',
    estado: '',
    tamanho_quintal: '',
    prazo_compra: '',
    orcamento: '',
  },
  setStep: (step) => set({ step }),
  updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  reset: () => set({
    step: 0,
    data: {
      nome: '',
      whatsapp: '',
      email: '',
      cidade: '',
      estado: '',
      tamanho_quintal: '',
      prazo_compra: '',
      orcamento: '',
    }
  }),
}));
