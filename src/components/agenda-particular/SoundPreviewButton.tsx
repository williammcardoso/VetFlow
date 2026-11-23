import React from "react";
import { Square, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { soundLabel, soundPreviewUrl } from "@/lib/agendaParticular";
import { cn } from "@/lib/utils";

// Um som por vez na página inteira (igual ao alto-falante do site do
// Pushover): tocar outro para o anterior; tocar o mesmo de novo para.
let current: { audio: HTMLAudioElement; url: string; stop: () => void } | null = null;

/**
 * Alto-falante ao lado do som: toca a amostra no próprio navegador (vem do
 * site do Pushover) — não manda aviso nenhum, não gasta mensagem.
 */
export function SoundPreviewButton({ sound, className }: { sound: string | null | undefined; className?: string }) {
  const url = soundPreviewUrl(sound);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => () => {
    if (current && current.url === url && playing) current.stop();
  }, [url, playing]);

  const label = soundLabel(sound);
  if (!url) {
    return (
      <span
        className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60", className)}
        title={sound ? `${label}: sem som para ouvir` : "Sem som"}
      >
        <VolumeX className="h-4 w-4" aria-hidden />
      </span>
    );
  }

  const toggle = () => {
    if (current && current.url === url) {
      current.stop();
      return;
    }
    current?.stop();
    const audio = new Audio(url);
    const stop = () => {
      audio.pause();
      if (current?.audio === audio) current = null;
      setPlaying(false);
    };
    current = { audio, url, stop };
    audio.addEventListener("ended", stop);
    setPlaying(true);
    audio.play().catch(() => {
      stop();
      toast.error("Não deu para tocar o som agora. Confira a internet e o volume.");
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={playing ? "Parar" : `Ouvir "${label}"`}
      aria-label={playing ? "Parar o som" : `Ouvir o som ${label}`}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
        playing ? "border-teal-700 bg-teal-700 text-white" : "border-border bg-card text-teal-700 hover:bg-teal-50",
        className
      )}
    >
      {playing ? <Square className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
    </button>
  );
}
