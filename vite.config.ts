import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { resolve } from "node:path";
import http from "node:http";
import { URL } from "node:url";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// 自定义动态代理插件
function dynamicProxyPlugin() {
  return {
    name: 'dynamic-octos-proxy',
    configureServer(server: any) {
      server.middlewares.use('/octos-proxy', (req: any, res: any, next: any) => {
        // 从请求头获取目标地址（普通请求）
        let targetUrl = req.headers['x-octos-target'] as string;

        // 解析 URL 参数（用于 SSE 和其他无法传递请求头的场景）
        let urlToken: string | undefined;
        let urlTarget: string | undefined;

        if (req.url) {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          urlToken = urlObj.searchParams.get('token') || undefined;
          urlTarget = urlObj.searchParams.get('target') || undefined;
        }

        // 如果没有请求头，尝试从 URL 参数获取（SSE 连接）
        if (!targetUrl) {
          targetUrl = urlTarget;
        }

        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing X-Octos-Target header or target parameter');
          return;
        }

        try {
          const target = new URL(targetUrl);
          // 获取不带查询参数的路径
          const reqPath = req.url ? req.url.split('?')[0] : '';

          const options = {
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: reqPath,
            method: req.method,
            headers: {
              ...req.headers,
              host: target.host,
            },
          };

          // 如果 URL 中有 token 参数，转换为 Authorization 请求头
          if (urlToken && !req.headers.authorization) {
            options.headers.authorization = `Bearer ${urlToken}`;
          }

          // 移除代理专用头
          delete options.headers['x-octos-target'];

          const proxyReq = http.request(options, (proxyRes: any) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
          });

          proxyReq.on('error', (err: any) => {
            console.error('Proxy error:', err.message);
            res.statusCode = 502;
            res.end(`Proxy error: ${err.message}`);
          });

          req.pipe(proxyReq);
        } catch (err: any) {
          res.statusCode = 400;
          res.end(`Invalid target URL: ${err.message}`);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  // 加载环境变量 (Vite 会自动加载，这里显式调用确保加载)
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), tailwindcss(), dynamicProxyPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // 多页面应用配置
    build: {
      rolldownOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          floating: resolve(__dirname, "floating.html"),
        },
      },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 3000,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
