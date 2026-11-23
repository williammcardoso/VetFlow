import React from "react";
import { CheckCircle2, ExternalLink, FolderLock, Loader2, Save, Send, Settings2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/finance/FinanceUI";
import { PUSHOVER_SOUNDS, joinDevices, splitDevices, type PrivateConfig } from "@/lib/agendaParticular";
import { fetchPushoverDevices, saveConfig, sendTest, type Creds, type PushoverDevices } from "@/lib/agendaParticularApi";
import { SoundPreviewButton } from "@/components/agenda-particular/SoundPreviewButton";

const NO_SOUND = "__nenhum";

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 border-b border-border/70 px-4 py-4 last:border-b-0">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h3>
      {children}
    </div>
  );
}

const devicesText = (s: string | null) => (s ? splitDevices(s).join(", ") : "todos os celulares");

export function PrivateSettings({ creds, config, onChanged }: { creds: Creds; config: PrivateConfig; onChanged: () => void }) {
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [devices, setDevices] = React.useState<PushoverDevices | null>(null);
  const [vetflowSel, setVetflowSel] = React.useState<string[]>(splitDevices(config.aparelhosVetflow));
  const [particularSel, setParticularSel] = React.useState<string[]>(splitDevices(config.aparelhosParticular));
  const [hora, setHora] = React.useState(config.horaPadrao);
  const [som, setSom] = React.useState(config.somPadrao ?? NO_SOUND);

  React.useEffect(() => {
    setVetflowSel(splitDevices(config.aparelhosVetflow));
    setParticularSel(splitDevices(config.aparelhosParticular));
    setHora(config.horaPadrao);
    setSom(config.somPadrao ?? NO_SOUND);
  }, [config]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusy(null);
    }
  };

  const saveToken = (value: string) =>
    run("token", async () => {
      await saveConfig(creds, { pushover_token: value });
      setToken("");
      toast.success(value ? "Pasta PARTICULAR ligada." : "Voltou a usar a pasta VETFLOW.");
      onChanged();
    });

  const toggle = (list: string[], set: (l: string[]) => void, device: string, on: boolean) =>
    set(on ? [...list.filter((d) => d !== device), device] : list.filter((d) => d !== device));

  return (
    <Panel title="Configurações" icon={Settings2} tone="slate" description="Pasta no Pushover, celulares e padrões.">
      <Section title="Pasta no Pushover" icon={FolderLock}>
        {config.tokenParticular ? (
          <p className="flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <span>
              Os lembretes chegam na pasta <strong>PARTICULAR</strong> (token terminado em {config.tokenParticular}).
            </span>
          </p>
        ) : (
          <div className="space-y-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Hoje os lembretes chegam na pasta VETFLOW. Para ter a pasta PARTICULAR:</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-[13px]">
              <li>
                Entre em{" "}
                <a href="https://pushover.net/apps/build" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
                  pushover.net/apps/build <ExternalLink className="h-3 w-3" />
                </a>{" "}
                (mesma conta do celular).
              </li>
              <li>Em <em>Name</em> escreva <strong>PARTICULAR</strong>; escolha um ícone se quiser; aceite os termos e crie.</li>
              <li>Copie o <strong>API Token</strong> que aparece e cole aqui embaixo.</li>
            </ol>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={config.tokenParticular ? "Trocar o token" : "Cole o API Token"}
            className="w-full sm:w-[17rem]"
            autoComplete="off"
            aria-label="API Token do aplicativo PARTICULAR"
          />
          <Button size="sm" onClick={() => saveToken(token.trim())} disabled={!token.trim() || busy === "token"}>
            {busy === "token" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Salvar
          </Button>
          {config.tokenParticular ? (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => saveToken("")} disabled={busy === "token"}>
              Voltar para a VETFLOW
            </Button>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("teste", async () => {
            await sendTest(creds, null);
            toast.success("Teste enviado. Confira no celular.");
          })}
          disabled={busy === "teste"}
        >
          {busy === "teste" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Enviar teste
        </Button>
      </Section>

      <Section title="Em qual celular chega" icon={Smartphone}>
        <p className="text-[13px] text-muted-foreground">
          Para receber em outro celular: instale o Pushover nele e entre com a <strong>mesma conta</strong> (iPhone: a mesma
          compra vale; Android: compra à parte). Depois toque em <em>Buscar celulares</em>.
        </p>
        {devices ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-semibold">Celular</th>
                  <th className="px-2 py-1.5 text-center font-semibold">VETFLOW</th>
                  <th className="px-2 py-1.5 text-center font-semibold">PARTICULAR</th>
                </tr>
              </thead>
              <tbody>
                {devices.devices.map((d) => (
                  <tr key={d} className="border-t border-border/70">
                    <td className="break-all px-3 py-1.5 font-medium">{d}</td>
                    <td className="px-2 py-1.5 text-center">
                      <Checkbox checked={vetflowSel.includes(d)} onCheckedChange={(v) => toggle(vetflowSel, setVetflowSel, d, v === true)} aria-label={`VETFLOW em ${d}`} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Checkbox checked={particularSel.includes(d)} onCheckedChange={(v) => toggle(particularSel, setParticularSel, d, v === true)} aria-label={`PARTICULAR em ${d}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              Nenhum marcado numa coluna = todos os celulares. Compras na conta: {devices.licenses.join(", ") || "nenhuma"}.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 text-sm">
            <li>
              <strong>VETFLOW</strong> (agenda): {devicesText(config.aparelhosVetflow)}
            </li>
            <li>
              <strong>PARTICULAR</strong>: {devicesText(config.aparelhosParticular)}
            </li>
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => run("aparelhos", async () => setDevices(await fetchPushoverDevices(creds)))}
            disabled={busy === "aparelhos"}
          >
            {busy === "aparelhos" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Smartphone className="mr-1.5 h-4 w-4" />} Buscar celulares
          </Button>
          {devices ? (
            <Button
              size="sm"
              onClick={() => run("salvar-aparelhos", async () => {
                await saveConfig(creds, { aparelhos_vetflow: joinDevices(vetflowSel), aparelhos_particular: joinDevices(particularSel) });
                toast.success("Celulares salvos.");
                onChanged();
              })}
              disabled={busy === "salvar-aparelhos"}
            >
              <Save className="mr-1.5 h-4 w-4" /> Salvar celulares
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title="Padrões para lembretes novos" icon={Settings2}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="pa-hora-padrao" className="text-xs">Hora</Label>
            <Input id="pa-hora-padrao" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-[7.5rem]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Som</Label>
            <div className="flex items-center gap-2">
              <Select value={som} onValueChange={setSom}>
                <SelectTrigger className="w-[13rem]" aria-label="Som padrão">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SOUND}>Padrão do app</SelectItem>
                  {PUSHOVER_SOUNDS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* "Padrão do app" = som "Pushover". */}
              <SoundPreviewButton sound={som === NO_SOUND ? "pushover" : som} />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => run("padroes", async () => {
              await saveConfig(creds, { hora_padrao: hora, som_padrao: som === NO_SOUND ? "" : som });
              toast.success("Padrões salvos.");
              onChanged();
            })}
            disabled={busy === "padroes"}
          >
            <Save className="mr-1.5 h-4 w-4" /> Salvar
          </Button>
        </div>
      </Section>
    </Panel>
  );
}
