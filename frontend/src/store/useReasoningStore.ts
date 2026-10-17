import { create } from "zustand";

/**
 * State for the floating reasoning window.
 * Tracks which assistant message's reasoning is currently shown.
 */
interface ReasoningState {
  openMessageId: string | null;
  open: (messageId: string) => void;
  close: () => void;
}

export const useReasoningStore = create<ReasoningState>((set) => ({
  openMessageId: null,
  open: (messageId) => set({ openMessageId: messageId }),
  close: () => set({ openMessageId: null }),
}));
