// FILE: HarosLogoButton.tsx
// Purpose: Expose the canonical Haros mark as an accessible Soft Orbit button.
// Layer: Shared app branding primitive

import { useEffect, useRef, type ButtonHTMLAttributes, type PointerEvent } from "react";

import {
  createSoftOrbitController,
  type SoftOrbitController,
  type SoftOrbitSnapshot,
} from "~/motion/softOrbit";
import { HarosLogo } from "./HarosLogo";

export interface HarosLogoButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  readonly size?: number;
  readonly duration?: number;
  readonly reducedMotion?: boolean | "auto";
  readonly onMotionStateChange?: (snapshot: SoftOrbitSnapshot) => void;
}

export function HarosLogoButton({
  size = 32,
  duration = 650,
  reducedMotion = "auto",
  onMotionStateChange,
  className,
  style,
  onClick,
  onPointerDown,
  onPointerLeave,
  onPointerCancel,
  "aria-label": ariaLabel = "Activate Haros",
  type = "button",
  ...buttonProps
}: HarosLogoButtonProps) {
  const markRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<SoftOrbitController | null>(null);
  const stateChangeRef = useRef(onMotionStateChange);
  stateChangeRef.current = onMotionStateChange;

  useEffect(() => {
    if (!markRef.current) return undefined;
    const controller = createSoftOrbitController(markRef.current, {
      duration,
      reducedMotion,
      onStateChange: (snapshot) => stateChangeRef.current?.(snapshot),
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [duration, reducedMotion]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>): void => {
    onPointerDown?.(event);
    if (!event.defaultPrevented) controllerRef.current?.press();
  };

  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={ariaLabel}
      className={["harnessos-logo-trigger", className].filter(Boolean).join(" ")}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (!event.defaultPrevented) controllerRef.current?.release();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        if (!event.defaultPrevented) controllerRef.current?.release();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) controllerRef.current?.trigger();
      }}
    >
      <span ref={markRef} className="harnessos-logo-motion-target" aria-hidden="true">
        <HarosLogo size={size} />
      </span>
    </button>
  );
}
