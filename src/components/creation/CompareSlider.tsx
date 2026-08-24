/**
 * Version compare slider (TOOL-05 版本对比滑杆): two history entries
 * stacked; a draggable divider clips the top image. Pure and controlled —
 * the parent owns the position.
 */

import { useCallback } from "react";

export interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  /** 0–100: how much of the BEFORE image is visible. */
  position: number;
  onPositionChange: (position: number) => void;
}

export default function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  position,
  onPositionChange,
}: CompareSliderProps) {
  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onPositionChange(Number(event.target.value));
    },
    [onPositionChange],
  );

  return (
    <div className="space-y-2" data-testid="compare-slider">
      <div className="relative overflow-hidden rounded-xl border border-(--color-border) select-none">
        {/* AFTER (base layer) */}
        <img src={afterSrc} alt={afterLabel} className="w-full block" draggable={false} />
        {/* BEFORE (clipped overlay) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
          data-testid="compare-clip"
        >
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="h-full w-auto max-w-none object-cover"
            style={{ width: "100%", objectFit: "cover" }}
            draggable={false}
          />
        </div>
        {/* Divider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
          style={{ left: `${position}%` }}
          aria-hidden
        />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs">
          {beforeLabel}
        </span>
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs">
          {afterLabel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={handleInput}
        className="w-full"
        aria-label="对比滑杆"
      />
    </div>
  );
}
