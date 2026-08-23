/**
 * Octos provider static catalog
 * providers.json synced from the Octos project, used for provider/model selection
 */

import type { OctosProviderCatalogEntry } from "@/types/octos";
import catalog from "./octos-providers.json";

export const OCTOS_PROVIDER_CATALOG: Record<string, OctosProviderCatalogEntry> = catalog;
export const OCTOS_PROVIDER_NAMES = Object.keys(catalog);
