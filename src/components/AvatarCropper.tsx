import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn } from "lucide-react";

interface AvatarCropperProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
}

const VIEWPORT = 260; // px na tela
const OUTPUT_SIZE = 480; // px do PNG final — dá pra ampliar sem borrar muito

/**
 * Recorte de avatar: o usuário arrasta a foto e ajusta o zoom até a região
 * que vai aparecer na "bolinha" ficar do jeito que quer, sem esticar/achatar
 * a imagem (o bug antigo era o <img> sem object-fit: cover, esticando fotos
 * não-quadradas). Cálculo nativo com canvas — sem biblioteca nova, mesmo
 * espírito do SignatureCanvas (Pointer Events).
 */
const AvatarCropper: React.FC<AvatarCropperProps> = ({ file, open, onClose, onConfirm }) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !open) {
      setImg(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  // Escala "cover": a menor escala que já cobre o viewport inteiro sem sobrar espaço vazio.
  const baseScale = useMemo(() => {
    if (!img) return 1;
    return Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight);
  }, [img]);

  const effectiveScale = baseScale * zoom;

  const clampPan = (x: number, y: number, scale: number) => {
    if (!img) return { x: 0, y: 0 };
    const dispW = img.naturalWidth * scale;
    const dispH = img.naturalHeight * scale;
    const minX = Math.min(0, VIEWPORT - dispW);
    const minY = Math.min(0, VIEWPORT - dispH);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  };

  // Re-clampa o pan quando o zoom muda, pra não deixar buraco na borda.
  useEffect(() => {
    setPan((prev) => clampPan(prev.x, prev.y, effectiveScale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScale]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!img) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPan(clampPan(drag.panX + dx, drag.panY + dy, effectiveScale));
  };

  const stopDragging = () => {
    draggingRef.current = null;
  };

  const handleConfirm = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Região visível no viewport, convertida de volta pra pixels originais da imagem.
    const sx = -pan.x / effectiveScale;
    const sy = -pan.y / effectiveScale;
    const sSize = VIEWPORT / effectiveScale;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png", 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            ref={viewportRef}
            className="relative overflow-hidden rounded-full border-2 border-border bg-muted touch-none select-none"
            style={{ width: VIEWPORT, height: VIEWPORT, cursor: img ? "grab" : "default" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerLeave={stopDragging}
            onPointerCancel={stopDragging}
          >
            {img && (
              <img
                src={img.src}
                alt="Prévia do recorte"
                draggable={false}
                style={{
                  position: "absolute",
                  left: pan.x,
                  top: pan.y,
                  width: img.naturalWidth * effectiveScale,
                  height: img.naturalHeight * effectiveScale,
                  maxWidth: "none",
                }}
              />
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">Arraste a foto pra posicionar. Use o controle abaixo pra dar zoom.</p>

          <div className="flex w-full items-center gap-3 px-2">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={1}
              max={3}
              step={0.01}
              disabled={!img}
              className="flex-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!img}>Usar esta foto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropper;
