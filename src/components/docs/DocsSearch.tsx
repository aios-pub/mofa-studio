/**
 * Documentation search component
 * Supports searching API endpoints by path, method and tags
 */

import { useState } from "react";
import { Input, AutoComplete, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { EndpointDocumentation } from "@/types/documentation";

interface DocsSearchProps {
  value: string;
  onChange: (value: string) => void;
  endpoints: EndpointDocumentation[];
}

interface SearchOption {
  value: string;
  label: string;
  endpoint: EndpointDocumentation;
}

export function DocsSearch({ value, onChange, endpoints }: DocsSearchProps) {
  const [options, setOptions] = useState<SearchOption[]>([]);

  const handleSearch = (searchText: string) => {
    if (!searchText) {
      setOptions([]);
      return;
    }

    const filtered = endpoints.filter(
      (endpoint) =>
        endpoint.name.toLowerCase().includes(searchText.toLowerCase()) ||
        endpoint.path.toLowerCase().includes(searchText.toLowerCase()) ||
        endpoint.method.toLowerCase().includes(searchText.toLowerCase()) ||
        endpoint.tags.some((tag) =>
          tag.toLowerCase().includes(searchText.toLowerCase())
        )
    );

    const searchOptions: SearchOption[] = filtered.map((endpoint) => ({
      value: `${endpoint.method} ${endpoint.path}`,
      label: `${endpoint.method} ${endpoint.path}`,
      endpoint,
    }));

    setOptions(searchOptions);
  };

  const handleSelect = (optionValue: string) => {
    const selectedOption = options.find((o) => o.value === optionValue);
    if (selectedOption) {
      onChange(selectedOption.endpoint.path);
      setOptions([]);
    }
  };

  const methodColors: Record<string, string> = {
    GET: "blue",
    POST: "green",
    PUT: "orange",
    DELETE: "red",
    PATCH: "purple",
  };

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      onSearch={handleSearch}
      onSelect={handleSelect}
      options={options.map((opt) => ({
        value: opt.value,
        label: (
          <div className="flex items-center justify-between">
            <span>{opt.label}</span>
            <Tag color={methodColors[opt.endpoint.method]}>
              {opt.endpoint.method}
            </Tag>
          </div>
        ),
      }))}
      placeholder="搜索API..."
      className="w-full"
      allowClear
    >
      <Input
        prefix={<SearchOutlined className="text-gray-400" />}
        placeholder="搜索API名称、路径或方法..."
        allowClear
      />
    </AutoComplete>
  );
}
