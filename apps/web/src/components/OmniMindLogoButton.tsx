// FILE: OmniMindLogoButton.tsx
// Purpose: Expose the canonical OmniMind mark as an accessible Soft Orbit button.
// Layer: Shared app branding primitive

import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type PointerEvent,
} from "react";

import {
  createSoftOrbitController,
  type SoftOrbitController,
  type SoftOrbitSnapshot,
} from "~/motion/softOrbit";
import { OmniMindLogo, type OmniMindLogoVariant } from "./OmniMindLogo";

export interface OmniMindLogoButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  readonly size?: number;
  readonly variant?: OmniMindLogoVariant;
  readonly duration?: number;
  readonly reducedMotion?: boolean | "auto";
  readonly onMotionStateChange?: (snapshot: SoftOrbitSnapshot) => void;
}

export function OmniMindLogoButton({
  size = 32,
  variant = "flat",
  duration = 650,
  reducedMotion = "auto",
  onMotionStateChange,
  className,
  style,
  onClick,
  onPointerDown,
  onPointerLeave,
  onPointerCancel,
  "aria-label": ariaLabel = "Activate OmniMind",
  type = "button",
  ...buttonProps
}: OmniMindLogoButtonProps) {
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
      className={["omnimind-logo-trigger", className].filter(Boolean).join(" ")}
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
      <span ref={markRef} className="omnimind-logo-motion-target" aria-hidden="true">
        <OmniMindLogo size={size} variant={variant} />
      </span>
    </button>
  );
}
