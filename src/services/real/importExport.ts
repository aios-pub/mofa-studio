/**
 * 导入导出 API 服务
 * 后端端点: /api/testset/import/... 和 /api/testset/export/...
 */

import { apiClient } from "../api/apiClient";

// ==================== 类型定义 ====================

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  testSets: Array<{
    id: string;
    name: string;
  }>;
}

interface ExportOptions {
  includeAssertions: boolean;
  includePreScripts?: boolean;
  includeTestScripts?: boolean;
  includeEnvironment?: boolean;
}

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
  };
  item: any[];
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version?: string;
    description?: string;
  };
  paths: Record<string, any>;
}

// ==================== API ====================

const importExportRealApi = {
  // ==================== 导入 ====================

  importPostman: async (
    content: PostmanCollection,
    options: {
      conflictResolution?: "skip" | "overwrite" | "rename";
      includeAssertions?: boolean;
      includePreScripts?: boolean;
      includeTestScripts?: boolean;
      includeEnvironment?: boolean;
    },
  ): Promise<ImportResult> => {
    return await apiClient.post<ImportResult>("/api/testset/import/postman", {
      content,
      options,
    });
  },

  importOpenAPI: async (
    spec: OpenAPISpec,
    options: {
      conflictResolution?: "skip" | "overwrite" | "rename";
      includeAssertions?: boolean;
      includePreScripts?: boolean;
      includeTestScripts?: boolean;
      includeEnvironment?: boolean;
    },
  ): Promise<ImportResult> => {
    return await apiClient.post<ImportResult>("/api/testset/import/openapi", {
      spec: spec as unknown as Record<string, unknown>,
      options,
    });
  },

  // ==================== 导出 ====================

  exportTestSet: async (
    testSetId: string,
    format: "postman" | "openapi",
    options: ExportOptions,
  ): Promise<PostmanCollection | OpenAPISpec> => {
    const queryParams = new URLSearchParams({
      format,
      include_assertions: String(options.includeAssertions),
      include_pre_scripts: String(options.includePreScripts ?? false),
      include_test_scripts: String(options.includeTestScripts ?? true),
      include_environment: String(options.includeEnvironment ?? false),
    });

    return await apiClient.get<PostmanCollection | OpenAPISpec>(
      `/api/testset/export/${testSetId}?${queryParams.toString()}`,
    );
  },

  exportCollection: async (
    testSetIds: string[],
    format: "postman" | "openapi",
    options: ExportOptions,
  ): Promise<PostmanCollection | OpenAPISpec> => {
    return await apiClient.post<PostmanCollection | OpenAPISpec>(
      "/api/testset/export/collection",
      {
        test_set_ids: testSetIds,
        format,
        options: {
          include_assertions: options.includeAssertions,
          include_pre_scripts: options.includePreScripts ?? false,
          include_test_scripts: options.includeTestScripts ?? true,
          include_environment: options.includeEnvironment ?? false,
        },
      },
    );
  },

};

// ==================== 工具函数 ====================

export function downloadAsFile(data: unknown, filename: string, mimeType: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { importExportRealApi };
export type { ImportResult, ExportOptions, PostmanCollection, OpenAPISpec };
