import { create } from "zustand";
import type { DealWithLead, PipelineColumn } from "@/types";
import { DealStage } from "@prisma/client";

interface CrmState {
  columns: PipelineColumn[];
  selectedDealId: string | null;
  filterIndustry: string | null;
  filterPriority: string | null;
  searchQuery: string;
  setColumns: (cols: PipelineColumn[]) => void;
  setSelectedDeal: (id: string | null) => void;
  setFilter: (key: "filterIndustry" | "filterPriority", value: string | null) => void;
  setSearchQuery: (q: string) => void;
  moveDeal: (dealId: string, toStage: DealStage) => void;
}

export const useCrmStore = create<CrmState>()((set) => ({
  columns: [],
  selectedDealId: null,
  filterIndustry: null,
  filterPriority: null,
  searchQuery: "",
  setColumns: (cols) => set({ columns: cols }),
  setSelectedDeal: (id) => set({ selectedDealId: id }),
  setFilter: (key, value) => set({ [key]: value }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  moveDeal: (dealId, toStage) =>
    set((state) => {
      let movedDeal: DealWithLead | undefined;
      const newCols = state.columns.map((col) => {
        const deal = col.deals.find((d) => d.id === dealId);
        if (deal) {
          movedDeal = { ...deal, stage: toStage };
          return { ...col, deals: col.deals.filter((d) => d.id !== dealId) };
        }
        return col;
      });
      if (!movedDeal) return state;
      return {
        columns: newCols.map((col) =>
          col.stage === toStage
            ? { ...col, deals: [...col.deals, movedDeal!] }
            : col
        ),
      };
    }),
}));
