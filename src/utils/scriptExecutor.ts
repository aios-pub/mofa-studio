/**
 * Script execution engine
 * Execute pre/post JavaScript scripts
 */

import type { ScriptContext, ScriptExecutionResult } from "@/types/testset";

/**
 * Create a sandboxed script execution environment
 */
function createSandbox(context: ScriptContext, logs: string[]): any {
  const sandbox = {
    pm: {
      environment: context.environment,
      globals: context.globals,
      request: context.request,
      response: context.response,
      test: context.test,
      utils: context.utils,
    },
    console: {
      log: (...args: unknown[]) => {
        const message = args.map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" ");
        logs.push(message);
        console.log("[Script]", ...args);
      },
      error: (...args: unknown[]) => {
        const message = args.map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" ");
        logs.push(`ERROR: ${message}`);
        console.error("[Script]", ...args);
      },
      warn: (...args: unknown[]) => {
        const message = args.map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" ");
        logs.push(`WARN: ${message}`);
        console.warn("[Script]", ...args);
      },
    },
  };

  return sandbox;
}

/**
 * Execute script
 */
export async function executeScript(
  script: string,
  context: ScriptContext,
): Promise<ScriptExecutionResult> {
  const logs: string[] = [];
  const testResults: Array<{ name: string; passed: boolean; error?: string }> = [];
  const environmentChanges: Array<{ key: string; value: string; action: "set" | "unset" }> = [];

  // Watch environment variable changes
  const originalEnvGet = context.environment.get;
  const originalEnvSet = context.environment.set;
  const originalEnvUnset = context.environment.unset;
  const trackedEnv = {
    get: originalEnvGet,
    set: (key: string, value: string) => {
      environmentChanges.push({ key, value, action: "set" });
      return originalEnvSet(key, value);
    },
    unset: (key: string) => {
      environmentChanges.push({ key, value: "", action: "unset" });
      return originalEnvUnset(key);
    },
    clear: context.environment.clear,
    toArray: context.environment.toArray,
  };

  // Create test function
  const tests: Array<{ name: string; fn: () => void }> = [];
  const testFn = (name: string, fn: () => void) => {
    tests.push({ name, fn });
  };

  // Create enhanced context
  const enhancedContext: ScriptContext = {
    ...context,
    environment: trackedEnv,
    test: testFn,
  };

  try {
    // Create sandbox environment
    const sandbox = createSandbox(enhancedContext, logs);

    // Execute scripts via the Function constructor (safer than eval)
    const scriptFn = new Function(
      ...Object.keys(sandbox),
      `"use strict";\n${script}`
    );

    // Execute script
    await scriptFn(...Object.values(sandbox));

    // Execute test assertions
    for (const { name, fn } of tests) {
      try {
        fn();
        testResults.push({ name, passed: true });
      } catch (error: any) {
        testResults.push({
          name,
          passed: false,
          error: error.message || "Test failed",
        });
      }
    }

    return {
      success: true,
      logs,
      testResults,
      environmentChanges,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Script execution failed",
      logs,
      testResults,
    };
  }
}

/**
 * Create default script context
 */
export function createScriptContext(
  environment: Record<string, string>,
  globals: Record<string, string>,
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  },
  response?: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
  },
): ScriptContext {
  return {
    environment: {
      get: (key: string) => environment[key],
      set: (key: string, value: string) => {
        environment[key] = value;
      },
      unset: (key: string) => {
        delete environment[key];
      },
      clear: () => {
        Object.keys(environment).forEach((key) => delete environment[key]);
      },
      toArray: () =>
        Object.entries(environment).map(([key, value]) => ({ key, value })),
    },
    globals: {
      get: (key: string) => globals[key],
      set: (key: string, value: string) => {
        globals[key] = value;
      },
      unset: (key: string) => {
        delete globals[key];
      },
      clear: () => {
        Object.keys(globals).forEach((key) => delete globals[key]);
      },
      toArray: () =>
        Object.entries(globals).map(([key, value]) => ({ key, value })),
    },
    request,
    response,
    utils: {
      replaceVariables: (text: string) => {
        // Simple variable substitution implementation
        return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
          return environment[key] || globals[key] || `{{${key}}}`;
        });
      },
      base64Encode: (text: string) => {
        try {
          return btoa(text);
        } catch {
          throw new Error("Base64 encoding failed");
        }
      },
      base64Decode: (text: string) => {
        try {
          return atob(text);
        } catch {
          throw new Error("Base64 decoding failed");
        }
      },
      jsonParse: (text: string) => {
        try {
          return JSON.parse(text);
        } catch {
          throw new Error("JSON parsing failed");
        }
      },
      jsonStringify: (obj: unknown) => {
        try {
          return JSON.stringify(obj);
        } catch {
          throw new Error("JSON stringifying failed");
        }
      },
    },
  };
}
