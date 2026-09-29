import { lazy, type ComponentType } from "react";

// Cada tela vira um arquivo separado, baixado só quando é aberta — antes o
// sistema inteiro (3,4 MB de bibliotecas + todas as telas) era baixado no
// primeiro acesso, o que pesava no celular/tablet.
//
// Depois de uma atualização publicada, quem estava com o sistema aberto ainda
// tem a versão antiga na memória e pede arquivos de tela que não existem
// mais no servidor. Nesse caso recarrega a página uma vez (pega a versão
// nova); se falhar de novo logo em seguida, deixa o erro aparecer.
const RELOAD_KEY = "vf:chunk-reload-at";

export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (error) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        // Segura a tela até o recarregamento acontecer.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
