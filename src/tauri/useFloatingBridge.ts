import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Window } from "@tauri-apps/api/window";
import { isTauriApp } from "../utils/tauri";

type NavigatePayload = {
  path?: string;
};

export const useFloatingBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTauriApp()) {
      return;
    }

    const appWindow = Window.getCurrent();
    if (appWindow.label !== "main") {
      return;
    }

    let unlistenNavigate: (() => void) | undefined;
    let unlistenClose: (() => void) | undefined;

    const setup = async () => {
      unlistenNavigate = await appWindow.listen<NavigatePayload>(
        "floating:navigate",
        (event) => {
          if (event.payload?.path) {
            navigate(event.payload.path);
          }
        },
      );

      unlistenClose = await appWindow.onCloseRequested(async (event) => {
        event.preventDefault();
        const floating = await Window.getByLabel("floating");
        if (floating) {
          await floating.show();
          await floating.setFocus();
        }
        await appWindow.hide();
      });
    };

    void setup();

    return () => {
      unlistenNavigate?.();
      unlistenClose?.();
    };
  }, [navigate]);
};
