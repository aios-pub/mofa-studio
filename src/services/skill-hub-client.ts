/**
 * Skill Hub API Client
 * Provides methods to interact with the Skill Hub backend API
 */

const API_BASE_URL = import.meta.env.VITE_SKILL_HUB_API_URL || 'http://localhost:8080'

/**
 * Generic API request wrapper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Skill Hub API client
 */
export const skillHubClient = {
  // Namespace operations
  async listNamespaces(tenantId: string) {
    return apiRequest<Namespace[]>(`/api/namespaces?tenant_id=${tenantId}`)
  },

  async getNamespace(id: number) {
    return apiRequest<Namespace>(`/api/namespaces/${id}`)
  },

  async createNamespace(data: CreateNamespaceRequest) {
    return apiRequest<Namespace>('/api/namespaces', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Skill operations
  async listSkills(params: SkillSearchParams) {
    const searchParams = new URLSearchParams()
    if (params.tenant_id) searchParams.append('tenant_id', params.tenant_id)
    if (params.query) searchParams.append('q', params.query)
    if (params.namespace) searchParams.append('namespace', params.namespace)
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.page_size) searchParams.append('page_size', params.page_size.toString())

    return apiRequest<SkillSearchResult>(`/api/skills?${searchParams}`)
  },

  async getSkill(id: number) {
    return apiRequest<SkillDetail>(`/api/skills/${id}`)
  },

  async getSkillByNamespace(namespace: string, slug: string) {
    return apiRequest<SkillDetail>(`/api/skills/${namespace}/${slug}`)
  },

  async createSkill(data: CreateSkillRequest) {
    return apiRequest<SkillDetail>('/api/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSkill(id: number, data: UpdateSkillRequest) {
    return apiRequest<SkillDetail>(`/api/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteSkill(id: number) {
    return apiRequest<void>(`/api/skills/${id}`, {
      method: 'DELETE',
    })
  },

  // Version operations
  async listVersions(skillId: number, page = 1, pageSize = 20) {
    return apiRequest<{ versions: SkillVersion[]; total: number }>(
      `/api/skills/${skillId}/versions?page=${page}&page_size=${pageSize}`
    )
  },

  async publishVersion(skillId: number, versionData: PublishVersionRequest) {
    return apiRequest<SkillVersion>(`/api/skills/${skillId}/versions`, {
      method: 'POST',
      body: JSON.stringify(versionData),
    })
  },

  async downloadSkill(skillId: number, version: string) {
    window.open(`${API_BASE_URL}/api/skills/${skillId}/download/${version}`, '_blank')
  },

  // Star operations
  async starSkill(skillId: number) {
    return apiRequest<void>(`/api/skills/${skillId}/star`, {
      method: 'POST',
    })
  },

  async unstarSkill(skillId: number) {
    return apiRequest<void>(`/api/skills/${skillId}/star`, {
      method: 'DELETE',
    })
  },

  async checkStarred(skillId: number) {
    return apiRequest<{ starred: boolean }>(`/api/skills/${skillId}/star`)
      .catch(() => ({ starred: false }))
  },

  // Rating operations
  async rateSkill(skillId: number, score: number) {
    return apiRequest<void>(`/api/skills/${skillId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    })
  },

  async getSkillRating(skillId: number) {
    return apiRequest<{ rating: number; count: number }>(`/api/skills/${skillId}/rating`)
      .catch(() => ({ rating: 0, count: 0 }))
  },

  // Labels
  async listLabels(tenantId: string, type?: string) {
    const params = new URLSearchParams({ tenant_id: tenantId })
    if (type) params.append('type', type)

    return apiRequest<Label[]>(`/api/labels?${params}`)
  },

  async setSkillLabels(skillId: number, labelIds: number[]) {
    return apiRequest<void>(`/api/skills/${skillId}/labels`, {
      method: 'PUT',
      body: JSON.stringify({ label_ids: labelIds }),
    })
  },

  // Search and facets
  async getSearchFacets(tenantId: string) {
    return apiRequest<SearchFacets>(`/api/search/facets?tenant_id=${tenantId}`)
  },
}

// Type definitions
export interface Namespace {
  id: number
  tenant_id: string
  slug: string
  display_name: string
  type: string
  description?: string
  status: string
  member_count?: number
  skill_count?: number
}

export interface SkillSummary {
  id: number
  namespace: string
  slug: string
  display_name: string
  summary?: string
  download_count: number
  star_count: number
  rating_avg: number
  rating_count: number
  latest_version?: string
  visibility: string
  status: string
}

export interface SkillDetail extends SkillSummary {
  created_at: string
  updated_at: string
  owner_id: string
  tags: string[]
  labels: Label[]
  versions: SkillVersion[]
}

export interface SkillVersion {
  id: number
  version: string
  status: string
  changelog?: string
  file_count: number
  total_size: number
  published_at?: string
  created_at: string
}

export interface Label {
  id: number
  slug: string
  display_name: string
  type: string
  color?: string
}

export interface SkillSearchResult {
  skills: SkillSummary[]
  total: number
  page: number
  page_size: number
  facets?: SearchFacets
}

export interface SearchFacets {
  namespaces: NamespaceFacet[]
  labels: LabelFacet[]
}

export interface NamespaceFacet {
  slug: string
  display_name: string
  count: number
}

export interface LabelFacet {
  id: number
  slug: string
  display_name: string
  type: string
  count: number
}

// Request types
export interface SkillSearchParams {
  tenant_id: string
  query?: string
  namespace?: string
  labels?: string[]
  page?: number
  page_size?: number
}

export interface CreateNamespaceRequest {
  tenant_id: string
  slug: string
  display_name: string
  type: string
  description?: string
  created_by: string
}

export interface CreateSkillRequest {
  tenant_id: string
  namespace_id: number
  slug: string
  display_name: string
  summary?: string
  visibility?: string
}

export interface UpdateSkillRequest {
  display_name?: string
  summary?: string
  visibility?: string
}

export interface PublishVersionRequest {
  version: string
  files: File[]
  changelog?: string
}
