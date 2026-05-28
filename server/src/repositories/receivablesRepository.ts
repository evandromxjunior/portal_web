import { config } from "../config.js";
import type { ReceivablesRepository } from "../types.js";
import { mockReceivablesRepository } from "./mockReceivablesRepository.js";
import { winthorReceivablesRepository } from "./winthorReceivablesRepository.js";

export function getReceivablesRepository(): ReceivablesRepository {
  return config.useMockData ? mockReceivablesRepository : winthorReceivablesRepository;
}
