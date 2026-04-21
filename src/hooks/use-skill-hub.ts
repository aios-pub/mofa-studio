/**
 * React Hooks for Skill Hub
 * Custom hooks for interacting with the Skill Hub API
 */

import { useState, useEffect, useCallback } from "react";
import {
  skillHubClient,
  type SkillSearchParams,
  type SkillSummary,
  type SkillDetail,
} from "@/services/skill-hub-client";

/**
 * Hook for fetching and paginating skills
 */
export function useSkills(params: SkillSearchParams) {
  const [data, setData] = useState<SkillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await skillHubClient.listSkills(params);
      setData(result.skills);
      setTotal(result.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  return { data, total, loading, error, refetch: fetchSkills };
}

/**
 * Hook for fetching a single skill by ID
 */
export function useSkill(skillId: number | null) {
  const [data, setData] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!skillId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    skillHubClient
      .getSkill(skillId)
      .then(setData)
      .catch((err) => {
        setError(err);
        console.error("Failed to fetch skill:", err);
      })
      .finally(() => setLoading(false));
  }, [skillId]);

  return { data, loading, error };
}

/**
 * Hook for fetching a skill by namespace and slug
 */
export function useSkillByNamespace(namespace: string, slug: string) {
  const [data, setData] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    skillHubClient
      .getSkillByNamespace(namespace, slug)
      .then(setData)
      .catch((err) => {
        setError(err);
        console.error("Failed to fetch skill:", err);
      })
      .finally(() => setLoading(false));
  }, [namespace, slug]);

  return { data, loading, error };
}

/**
 * Hook for managing skill star status
 */
export function useStar(skillId: number | null, enabled = true) {
  const [data, setData] = useState<{ starred: boolean }>({ starred: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!skillId || !enabled) {
      setData({ starred: false });
      return;
    }

    setLoading(true);
    skillHubClient
      .checkStarred(skillId)
      .then(setData)
      .catch(() => setData({ starred: false }))
      .finally(() => setLoading(false));
  }, [skillId, enabled]);

  const star = useCallback(async () => {
    if (!skillId) return;

    await skillHubClient.starSkill(skillId);
    setData({ starred: true });
  }, [skillId]);

  const unstar = useCallback(async () => {
    if (!skillId) return;

    await skillHubClient.unstarSkill(skillId);
    setData({ starred: false });
  }, [skillId]);

  return { data, loading, star, unstar };
}

/**
 * Hook for fetching skill versions
 */
export function useSkillVersions(
  skillId: number | null,
  page = 1,
  pageSize = 10,
) {
  const [data, setData] = useState<{ versions: any[]; total: number }>({
    versions: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!skillId) {
      setData({ versions: [], total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    skillHubClient
      .listVersions(skillId, page, pageSize)
      .then(setData)
      .catch((err) => {
        setError(err);
        console.error("Failed to fetch versions:", err);
      })
      .finally(() => setLoading(false));
  }, [skillId, page, pageSize]);

  return { data, loading, error };
}

/**
 * Hook for fetching namespaces
 */
export function useNamespaces(tenantId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    skillHubClient
      .listNamespaces(tenantId)
      .then(setData)
      .catch((err) => {
        setError(err);
        console.error("Failed to fetch namespaces:", err);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  return { data, loading, error };
}

/**
 * Hook for fetching labels
 */
export function useLabels(tenantId: string, type?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    skillHubClient
      .listLabels(tenantId, type)
      .then(setData)
      .catch((err) => {
        setError(err);
        console.error("Failed to fetch labels:", err);
      })
      .finally(() => setLoading(false));
  }, [tenantId, type]);

  return { data, loading, error };
}
