/**
 * Builds placeholders Map for the Procuracao PF document generation.
 * LOGS PREFIX CODE: PORTAL_PROC_PF_PLACEHOLDERS_BUILT
 */
import { buildProcuracaoPfPlaceholders as unifiedBuild } from './placeholderBuilders';

export function buildProcuracaoPfPlaceholders(client: any): Record<string, string> {
  return unifiedBuild(client);
}

