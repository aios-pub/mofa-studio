/**
 * API documentation type definitions
 * For generating visual API documentation
 */

/**
 * API documentation main structure
 */
export interface ApiDocumentation {
  info: DocInfo;
  servers?: ServerInfo[];
  tags?: string[];
  endpoints: EndpointDocumentation[];
}

/**
 * Documentation basic information
 */
export interface DocInfo {
  title: string;
  description?: string;
  version?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

/**
 * Server information
 */
export interface ServerInfo {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

/**
 * Server variables (for enum values)
 */
export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

/**
 * API endpoint documentation
 */
export interface EndpointDocumentation {
  id: string;
  name: string;
  description?: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  parameters?: Parameter[];
  headers?: Header[];
  request_body?: RequestBody;
  responses?: ResponseExample[];
  tags: string[];
  deprecated?: boolean;
  security?: SecurityRequirement[];
}

/**
 * Parameter definitions
 */
export interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required: boolean;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    default?: any;
    example?: any;
    properties?: Record<string, any>;
    items?: any;
  };
}

/**
 * Request header definitions
 */
export interface Header {
  name: string;
  description?: string;
  required: boolean;
  example?: string;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    default?: string;
  };
}

/**
 * Request body definitions
 */
export interface RequestBody {
  content_type: string;
  description?: string;
  required?: boolean;
  schema: any;
  example?: any;
}

/**
 * Response example
 */
export interface ResponseExample {
  status_code: number;
  description: string;
  headers?: ResponseHeader[];
  example?: any;
  schema?: any;
  content_type?: string;
}

/**
 * Response headers
 */
export interface ResponseHeader {
  name: string;
  value?: string;
  description?: string;
}

/**
 * Security authentication requirements
 */
export interface SecurityRequirement {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "bearer";
  scheme?: string;
  bearer_format?: string;
  description?: string;
  flows?: OAuthFlows;
}

/**
 * OAuth flow configuration
 */
export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

/**
 * OAuth flow details
 */
export interface OAuthFlow {
  authorization_url?: string;
  token_url?: string;
  refresh_url?: string;
  scopes: Record<string, string>;
}

/**
 * Test execution parameters (for inline testing on the documentation page)
 */
export interface TestExecutionParams {
  path_params?: Record<string, string>;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Test execution results
 */
export interface TestExecutionResult {
  status_code: number;
  status_message: string;
  headers: Array<{ name: string; value: string }>;
  body: string;
  duration: number;
  success: boolean;
  error?: string;
}
