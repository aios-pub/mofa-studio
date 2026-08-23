/**
 * Provider 类型定义
 * 支持主流模型厂商
 */

// Provider vendor type
export type ProviderType =
  // Major cloud providers
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'aws_bedrock'
  // Large tech companies
  | 'meta'
  | 'mistral'
  | 'cohere'
  | 'deepseek'
  | 'groq'
  | 'perplexity'
  | 'nvidia'
  | 'ai21'
  | 'grok'
  | 'cognition'
  | 'stability'
  | 'character_ai'
  | 'inflection'
  | 'aleph_alpha'
  | 'microsoft'
  | 'ibm'
  // Chinese vendors
  | 'zhipu'
  | 'alibaba'
  | 'baidu'
  | 'tencent'
  | 'bytedance'
  | 'moonshot'
  | 'minimax'
  | 'baichuan'
  | 'yi'
  | 'sensetime'
  | 'iflytek'
  | 'stepfun'
  | 'kuaishou'
  | 'modelscope'
  | 'siliconflow'
  | 'deepseek_cn'
  | 'baidu_qianfan'
  | 'xunfei'
  | '360ai'
  | 'netease'
  | 'meituan'
  | 'zhihu'
  | 'sina'
  | 'sohu'
  | 'lenovo'
  // Model aggregation platforms
  | 'openrouter'
  | 'together'
  | 'huggingface'
  | 'replicate'
  | 'fireworks'
  | 'anyscale'
  | 'modal'
  | 'runpod'
  | 'lambda_labs'
  | 'vertex_ai'
  | 'watsonx'
  | 'clarifai'
  | 'nomic'
  | 'prem'
  | 'monsterapi'
  | 'neuro'
  // Open source / local deployment
  | 'ollama'
  | 'vllm'
  | 'lmstudio'
  | 'localai'
  | 'textgen'
  | 'koboldcpp'
  | 'llamacpp'
  | 'text_generation_webui'
  | 'jan'
  | 'gpt4all'
  | 'privategpt'
  | 'anythingllm'
  | 'dify'
  | 'fastgpt'
  | 'langchain_chatchat'
  // Specialized domains
  | 'assemblyai'
  | 'elevenlabs'
  | 'aws_polly'
  | 'google_tts'
  | 'azure_speech'
  | 'whisper'
  | 'claude'
  | 'gemini'
  // Custom
  | 'custom';

// Provider vendor classification（按服务类型分类）
export type ProviderCategory = 'cloud' | 'opensource' | 'custom';

// Authentication method
export type AuthType = 'api_key' | 'bearer' | 'basic' | 'oauth' | 'none';

// Model capability identifier
export interface ModelCapabilities {
  vision: boolean;
  streaming: boolean;
  functionCalling: boolean;
  codeExecution: boolean;
  jsonMode: boolean;
}

// Model information
export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  maxTokens: number;
  pricing: {
    input: number;
    output: number;
  };
  capabilities?: Partial<ModelCapabilities>;
  enabled?: boolean;
}

// Configuration field definition
export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select';
  placeholder?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    message?: string;
  };
}

// Vendor configuration
export interface ProviderConfig {
  type: ProviderType;
  name: string;
  category: ProviderCategory;
  icon: string;
  description: string;
  website?: string;
  docs?: string;
  // API configuration
  api: {
    defaultBaseUrl: string;
    authType: AuthType;
    apiKeyPrefix?: string;
    apiKeyPlaceholder?: string;
    headers?: Record<string, string>;
  };
  // Configuration fields
  configFields: ConfigField[];
  // Default model list（Deprecated，Models fetched from vendor API in real-time）
  defaultModels?: ProviderModel[];
  // Capabilities
  capabilities: ModelCapabilities;
}

// Provider instance
export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  models: ProviderModel[];
  status: 'active' | 'inactive' | 'error';
  config?: Record<string, string | number>;
  usage: {
    totalCalls: number;
    totalTokens: number;
    lastUsed: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Form data for creating a provider
export interface CreateProviderFormData {
  type: ProviderType;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  config?: Record<string, string | number>;
  selectedModels?: string[];
  customModels?: ProviderModel[];
}
