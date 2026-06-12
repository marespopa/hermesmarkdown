import { atom } from "jotai";
import type { VaultSchema } from "@/app/services/vault-schema";

export const atom_vaultSchema = atom<VaultSchema | null>(null);
