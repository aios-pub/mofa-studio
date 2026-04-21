/**
 * Install Command Component
 * Displays the installation command for a skill with copy functionality
 */

import { useState } from "react";
import { Button } from "antd";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";

interface InstallCommandProps {
  namespace: string;
  slug: string;
  version?: string;
  className?: string;
}

/**
 * Generates the installation command for a skill
 */
function generateInstallCommand(
  namespace: string,
  slug: string,
  version?: string,
): string {
  const versionPart = version ? `@${version}` : "";
  return `skillhub install ${namespace}/${slug}${versionPart}`;
}

/**
 * Displays the installation command for a skill with a copy button
 */
export function InstallCommand({
  namespace,
  slug,
  version,
}: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  const command = generateInstallCommand(namespace, slug, version);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-gray-500 font-mono text-sm">$</span>
          <code className="text-sm font-mono truncate text-gray-800">
            {command}
          </code>
        </div>
        <Button
          size="small"
          onClick={handleCopy}
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        >
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
    </div>
  );
}
