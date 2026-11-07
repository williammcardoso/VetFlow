type DocumentPictureInPicture = {
  window: Window | null;
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
};

export const MINI_AGENDA_PATH = "/agenda-mini";
const POPUP_FEATURES = "popup=yes,width=360,height=640";

/** True quando o navegador consegue deixar a agenda flutuando sobre as outras janelas (Chrome/Edge 116+). */
export function canPinMiniAgenda() {
  return "documentPictureInPicture" in window;
}

/**
 * Abre a agenda compacta numa janelinha sempre por cima (Picture-in-Picture de documento).
 * Ela fica aberta enquanto a aba que a abriu estiver aberta. Navegador sem esse recurso
 * abre uma janela pequena comum.
 */
export async function openMiniAgenda() {
  const pip = (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;
  if (!pip) {
    window.open(MINI_AGENDA_PATH, "vetflow-agenda-mini", POPUP_FEATURES);
    return;
  }

  if (pip.window) {
    pip.window.focus();
    return;
  }

  const win = await pip.requestWindow({ width: 360, height: 640 });
  win.document.title = "Agenda";
  win.document.body.style.margin = "0";
  win.document.body.style.overflow = "hidden";

  const frame = win.document.createElement("iframe");
  frame.src = `${window.location.origin}${MINI_AGENDA_PATH}`;
  frame.style.cssText = "border:0;width:100vw;height:100vh;display:block";
  win.document.body.append(frame);
}
