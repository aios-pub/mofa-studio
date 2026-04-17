/**
 * Provider 类型定义
 * 支持主流模型厂商
 */

// Provider 厂商类型
export type ProviderType =
  // 主流云厂商
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'aws_bedrock'
  // 大型科技公司
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
  // 中国厂商
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
  // 模型聚合平台
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
  // 开源/本地部署
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
  // 特定领域
  | 'assemblyai'
  | 'elevenlabs'
  | 'aws_polly'
  | 'google_tts'
  | 'azure_speech'
  | 'whisper'
  | 'claude'
  | 'gemini'
  // 自定义
  | 'custom';

// Provider 厂商分类（按服务类型分类）
export type ProviderCategory = 'cloud' | 'opensource' | 'custom';

// 认证方式
export type AuthType = 'api_key' | 'bearer' | 'basic' | 'oauth' | 'none';

// 模型能力标识
export interface ModelCapabilities {
  vision: boolean;
  streaming: boolean;
  functionCalling: boolean;
  codeExecution: boolean;
  jsonMode: boolean;
}

// 模型信息
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

// 配置字段定义
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

// 厂商配置
export interface ProviderConfig {
  type: ProviderType;
  name: string;
  category: ProviderCategory;
  icon: string;
  description: string;
  website?: string;
  docs?: string;
  // API 配置
  api: {
    defaultBaseUrl: string;
    authType: AuthType;
    apiKeyPrefix?: string;
    apiKeyPlaceholder?: string;
    headers?: Record<string, string>;
  };
  // 配置字段
  configFields: ConfigField[];
  // 默认模型列表（已废弃，模型从厂商 API 实时获取）
  defaultModels?: ProviderModel[];
  // 能力
  capabilities: ModelCapabilities;
}

// Provider 实例
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

// 创建 Provider 的表单数据
export interface CreateProviderFormData {
  type: ProviderType;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  config?: Record<string, string | number>;
  selectedModels?: string[];
  customModels?: ProviderModel[];
}
