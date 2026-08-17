import React, { useEffect, useImperativeHandle, useRef } from "react";

export interface SignatureCanvasHandle {
  isEmpty: () => boolean;
  clear: () => void;
  toDataUrl: () => string | null;
}

interface SignatureCanvasProps {
  height?: number;
  disabled?: boolean;
  onChange?: (hasContent: boolean) => void;
}

// Canvas de assinatura nativo (sem dependência nova) — Pointer Events cobre
// mouse, toque e caneta com o mesmo código, funciona em tablet e no
// Capacitor. Resolução interna = tamanho CSS × devicePixelRatio, pra não
// sair borrado em telas de alta densidade.
const SignatureCanvas = React.forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ height = 160, disabled, onChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const hasContentRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const getContext = () => canvasRef.current?.getContext("2d") ?? null;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = getContext();
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#111827";
        }
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, []);

    useImperativeHandle(ref, () => ({
      isEmpty: () => !hasContentRef.current,
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasContentRef.current = false;
        onChange?.(false);
      },
      toDataUrl: () => (hasContentRef.current && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null),
    }));

    const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastPointRef.current = pointFromEvent(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled || !drawingRef.current) return;
      const ctx = getContext();
      const last = lastPointRef.current;
      const point = pointFromEvent(e);
      if (ctx && last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        if (!hasContentRef.current) {
          hasContentRef.current = true;
          onChange?.(true);
        }
      }
      lastPointRef.current = point;
    };

    const stopDrawing = () => {
      drawingRef.current = false;
      lastPointRef.current = null;
    };

    return (
      <canvas
        ref={canvasRef}
        style={{ height, width: "100%", touchAction: "none" }}
        className="rounded-lg border border-border bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    );
  }
);

SignatureCanvas.displayName = "SignatureCanvas";

export default SignatureCanvas;
