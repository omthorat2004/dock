"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;
const BUTTON_STEP = 1.2;

type View = { scale: number; x: number; y: number };

const INITIAL: View = { scale: 1, x: 0, y: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The grid surface a space opens as: pan by dragging, zoom by pinching, by
 * ctrl-scrolling, or with the controls in the corner.
 *
 * Zooming is **one CSS transform on one wrapper**, which is what keeps this
 * cheap. The cards are ordinary DOM inside that wrapper: nothing re-renders as
 * the view changes, nothing is drawn per frame, and there is no scene graph or
 * canvas library holding a second copy of everything. Two details do the work:
 *
 *  - the cards arrive as `children`, so a pan or zoom re-renders this component
 *    and *only* this component — React reuses the same child elements and skips
 *    them entirely;
 *  - the transform is composited by the GPU, so a drag never triggers layout.
 */
export function SpaceCanvas({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(INITIAL);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  /**
   * Scale by `factor`, keeping the point under the cursor where it is.
   *
   * Without a focal point, zooming walks the thing you are looking at off the
   * screen. `focal` is in client coordinates; it defaults to the middle.
   */
  const zoomBy = useCallback((factor: number, focal?: { x: number; y: number }) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centreX = rect.width / 2;
    const centreY = rect.height / 2;
    const focalX = focal ? focal.x - rect.left : centreX;
    const focalY = focal ? focal.y - rect.top : centreY;

    setView((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      if (scale === current.scale) return current;

      // Where the focal point sits on the plane, in unscaled units.
      const planeX = (focalX - centreX - current.x) / current.scale;
      const planeY = (focalY - centreY - current.y) / current.scale;

      return {
        scale,
        x: current.x - planeX * (scale - current.scale),
        y: current.y - planeY * (scale - current.scale),
      };
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        // A trackpad pinch arrives as ctrl+wheel. The exponential keeps each
        // notch the same *proportional* step at any zoom level.
        zoomBy(Math.exp(-event.deltaY / 240), { x: event.clientX, y: event.clientY });
        return;
      }
      setView((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
    }

    // Attached by hand rather than with onWheel: React registers wheel
    // listeners as passive, and a passive listener cannot preventDefault — so
    // ctrl+scroll would zoom the browser instead of the canvas.
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Cards handle their own pointer events — a drag that starts on one is a
    // click on its buttons, not a pan.
    if ((event.target as HTMLElement).closest("[data-canvas-card]")) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;

    setView((current) => ({
      ...current,
      x: state.originX + (event.clientX - state.startX),
      y: state.originY + (event.clientY - state.startY),
    }));
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const pan = event.shiftKey ? 120 : 48;

    switch (event.key) {
      case "+":
      case "=":
        return zoomBy(BUTTON_STEP);
      case "-":
        return zoomBy(1 / BUTTON_STEP);
      case "0":
        return setView(INITIAL);
      case "ArrowUp":
        event.preventDefault();
        return setView((c) => ({ ...c, y: c.y + pan }));
      case "ArrowDown":
        event.preventDefault();
        return setView((c) => ({ ...c, y: c.y - pan }));
      case "ArrowLeft":
        event.preventDefault();
        return setView((c) => ({ ...c, x: c.x + pan }));
      case "ArrowRight":
        event.preventDefault();
        return setView((c) => ({ ...c, x: c.x - pan }));
      default:
        return;
    }
  }

  const percent = Math.round(view.scale * 100);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Space canvas. Drag to pan, use the controls or the plus and minus keys to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className={`grid-surface relative touch-none select-none overflow-hidden bg-background focus-visible:outline-none ${className}`}
    >
      <div
        // A zero-sized origin pinned to the middle: children position
        // themselves around (0, 0), so the lesson sits dead centre whatever
        // the container's size.
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: "0 0",
        }}
        className="absolute left-1/2 top-1/2 h-0 w-0"
      >
        {children}
      </div>

      <ZoomControls
        percent={percent}
        onZoomIn={() => zoomBy(BUTTON_STEP)}
        onZoomOut={() => zoomBy(1 / BUTTON_STEP)}
        onReset={() => setView(INITIAL)}
        canZoomIn={view.scale < MAX_SCALE}
        canZoomOut={view.scale > MIN_SCALE}
      />
    </div>
  );
}

/** Positions one node on the canvas, measured from the centre. */
export function CanvasNode({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ left: x, top: y }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      {children}
    </div>
  );
}

function ZoomControls({
  percent,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
}: {
  percent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}) {
  const button =
    "flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="absolute bottom-6 right-6 flex items-center rounded-lg border border-border bg-surface shadow-sm">
      <button type="button" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" className={button}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2} aria-hidden>
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      <span
        aria-live="polite"
        className="w-14 border-x border-border py-1.5 text-center font-mono text-xs text-muted"
      >
        {percent}%
      </span>

      <button type="button" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in" className={button}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2} aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onReset}
        className="border-l border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        Reset
      </button>
    </div>
  );
}
