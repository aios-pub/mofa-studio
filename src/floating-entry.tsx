import React from "react";
import ReactDOM from "react-dom/client";
import FloatingApp from "./floating/FloatingApp";

// 悬浮窗口专用入口 - 不加载任何全局样式
document.documentElement.classList.add("floating-html");
document.body.classList.add("floating-body");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <FloatingApp />
  </React.StrictMode>,
);
