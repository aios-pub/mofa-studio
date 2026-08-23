/**
 * Environment variable工具函数
 * 处理Environment variable的替换和管理
 */

import type { Environment, EnvironmentVariable } from "@/types/testset";

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 替换字符串中的变量占位符
 * 支持 {{variable_name}} 格式
 */
export function replaceVariables(
  text: string,
  variables: EnvironmentVariable[],
): string {
  if (!text) return text;

  let result = text;
  const enabledVars = variables.filter((v) => v.enabled);

  for (const variable of enabledVars) {
    const placeholder = `{{${escapeRegExp(variable.key)}}}`;
    const regex = new RegExp(placeholder, "g");
    result = result.replace(regex, () => variable.value);
  }

  return result;
}

/**
 * 替换对象中的所有变量占位符
 * 支持嵌套对象和数组
 */
export function replaceVariablesInObject(
  obj: unknown,
  variables: EnvironmentVariable[],
): unknown {
  if (typeof obj === "string") {
    return replaceVariables(obj, variables);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceVariablesInObject(item, variables));
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = replaceVariablesInObject(value, variables);
    }
    return result;
  }

  return obj;
}

/**
 * 从字符串中提取所有变量占位符
 * 返回变量名数组
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    variables.push(match[1]);
  }

  return variables;
}

/**
 * 验证Environment variable配置
 * 检查是否有循环引用或其他问题
 */
export function validateEnvironment(env: Environment): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if variable name is duplicated
  const keys = env.variables.map((v) => v.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    errors.push(`发现重复的变量名: ${duplicates.join(", ")}`);
  }

  // Check variable name format
  const invalidKeys = keys.filter((key) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key));
  if (invalidKeys.length > 0) {
    errors.push(`变量名格式不正确: ${invalidKeys.join(", ")}`);
  }

  // Check for circular references（Variable value references other variables）
  const enabledVars = env.variables.filter((v) => v.enabled);
  for (const variable of enabledVars) {
    const referencedVars = extractVariables(variable.value);
    for (const refVar of referencedVars) {
      const refVariable = enabledVars.find((v) => v.key === refVar);
      if (refVariable) {
        // Check for circular reference
        const refRefVars = extractVariables(refVariable.value);
        if (refRefVars.includes(variable.key)) {
          errors.push(`检测到循环引用: ${variable.key} <-> ${refVar}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取Environment variable的预览值
 * 返回替换后的结果，用于预览
 */
export function getPreviewValue(
  text: string,
  variables: EnvironmentVariable[],
): string {
  try {
    return replaceVariables(text, variables);
  } catch (error) {
    return `${text} (替换失败)`;
  }
}

/**
 * 创建变量解析器
 * 用于在请求构建过程中动态替换变量
 */
export function createVariableResolver(variables: EnvironmentVariable[]) {
  return {
    resolve: (text: string) => replaceVariables(text, variables),
    resolveObject: (obj: unknown) => replaceVariablesInObject(obj, variables),
    extract: (text: string) => extractVariables(text),
    getVariables: () => variables,
  };
}
