/**
 * Octos Provider 静态目录
 * 从 Octos 项目同步的 providers.json，用于 Provider/Model 选择
 */

import type { OctosProviderCatalogEntry } from "@/types/octos";
import catalog from "./octos-providers.json";

export const OCTOS_PROVIDER_CATALOG: Record<string, OctosProviderCatalogEntry> = catalog;
export const OCTOS_PROVIDER_NAMES = Object.keys(catalog);
