export const isTauriApp = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return "__TAURI__" in window;
};
