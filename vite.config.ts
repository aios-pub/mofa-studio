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
        // 从请求头获取目标地址
        const targetUrl = req.headers['x-octos-target'] as string;

        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing X-Octos-Target header');
          return;
        }

        try {
          const target = new URL(targetUrl);
          const options = {
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: req.url,
            method: req.method,
            headers: {
              ...req.headers,
              host: target.host,
              // 移除代理专用头
              'x-octos-target': undefined,
            },
          };

          // 清理 undefined 的 header
          Object.keys(options.headers).forEach(key => {
            if (options.headers[key] === undefined) {
              delete options.headers[key];
            }
          });

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
