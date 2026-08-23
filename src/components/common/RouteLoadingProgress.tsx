/**
 * Route loading progress bar component
 * Show a top progress bar during route changes
 */

import { useEffect, useState } from "react";
import { Progress } from "antd";

export function RouteLoadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let lastHref = window.location.href;
    let timer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    const handleRouteChange = () => {
      setProgress(0);
      let currentProgress = 0;

      interval = setInterval(() => {
        currentProgress += 2;
        setProgress(currentProgress);
      }, 5);

      timer = setTimeout(() => {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setProgress(0), 100);
      }, 500);
    };

    // Watch href changes
    const observer = new MutationObserver(() => {
      const currentHref = window.location.href;
      if (currentHref !== lastHref) {
        lastHref = currentHref;
        handleRouteChange();
      }
    });

    // Observe changes to the whole document
    observer.observe(document, {
      subtree: true,
      childList: true,
    });

    // Listen to popstate (browser back/forward)
    window.addEventListener("popstate", handleRouteChange);

    // Trigger once on initial load
    handleRouteChange();

    // Clean up listeners
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", handleRouteChange);
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return progress > 0 ? (
    <div className="fixed top-0 left-0 right-0 z-[var(--z-tooltip)]">
      <Progress
        percent={progress}
        showInfo={false}
        strokeColor="var(--color-primary)"
        railColor="transparent"
        size="small"
        className="!h-[3px]"
      />
    </div>
  ) : null;
}

export default RouteLoadingProgress;
