import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// "Não sei o CEP": busca pelo nome da rua na mesma API do preenchimento
// automático (ViaCEP /ws/UF/cidade/rua/json) e preenche o endereço com o
// resultado escolhido — sem sair do sistema. O site dos Correios fica como
// última opção.

export interface PickedAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ViaCepAddress {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
}

// Faixas de CEP por estado (Correios) — só pra sugerir a UF quando o
// formulário ainda não tem uma (usa o CEP da clínica).
const CEP_RANGES: Array<[number, number, string]> = [
  [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"], [40000, 48999, "BA"],
  [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"], [58000, 58999, "PB"], [59000, 59999, "RN"],
  [60000, 63999, "CE"], [64000, 64999, "PI"], [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"],
  [69000, 69299, "AM"], [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 72799, "DF"],
  [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"], [77000, 77999, "TO"],
  [78000, 78899, "MT"], [79000, 79999, "MS"], [80000, 87999, "PR"], [88000, 89999, "SC"], [90000, 99999, "RS"],
];

/** UF de um CEP ("13970-170" → "SP"); vazio se não der pra saber. */
export function ufFromCep(cep: string | undefined): string {
  const prefix = parseInt((cep || "").replace(/\D/g, "").slice(0, 5), 10);
  if (!Number.isFinite(prefix)) return "";
  return CEP_RANGES.find(([from, to]) => prefix >= from && prefix <= to)?.[2] ?? "";
}

/** "Itapira/SP", "Itapira - SP" ou "Itapira, SP" → { city: "Itapira", uf: "SP" }; sem UF junto, só a cidade. */
export function splitCityUf(value: string | undefined): { city: string; uf: string } {
  const text = (value || "").trim();
  const m = text.match(/^(.*?)\s*[/,\-–]\s*([A-Za-z]{2})$/);
  return m ? { city: m[1].trim(), uf: m[2].toUpperCase() } : { city: text, uf: "" };
}

export function CepSearchDialog({
  open,
  onOpenChange,
  defaultStreet,
  defaultCity,
  defaultState,
  onPick,
  focusAfterPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStreet?: string;
  defaultCity?: string;
  defaultState?: string;
  onPick: (address: PickedAddress) => void;
  /** Pra onde vai o cursor depois de escolher (ex.: campo Número). Sem escolha, volta pro botão. */
  focusAfterPick?: () => void;
}) {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [results, setResults] = useState<ViaCepAddress[]>([]);
  const [formError, setFormError] = useState("");
  const streetRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef(false);

  // Cada vez que abre, começa do que já está no formulário.
  useEffect(() => {
    if (!open) return;
    setStreet(defaultStreet || "");
    setCity(defaultCity || "");
    setUf((defaultState || "").toUpperCase());
    setResults([]);
    setStatus("idle");
    setFormError("");
  }, [open, defaultStreet, defaultCity, defaultState]);

  const search = async () => {
    const s = street.trim();
    // Aceita a cidade digitada com a UF junto ("Itapira/SP").
    const parsed = splitCityUf(city);
    const c = parsed.city;
    const u = (uf.trim() || parsed.uf).toUpperCase();
    if (s.length < 3) return setFormError("Digite pelo menos 3 letras do nome da rua.");
    if (c.length < 3) return setFormError("Digite a cidade.");
    if (!/^[A-Z]{2}$/.test(u)) return setFormError("Digite a UF com 2 letras (ex.: SP).");
    setFormError("");
    setStatus("loading");
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${u}/${encodeURIComponent(c)}/${encodeURIComponent(s)}/json/`
      );
      const data = response.ok ? await response.json() : [];
      setResults(Array.isArray(data) ? (data as ViaCepAddress[]) : []);
      setStatus("done");
    } catch (error) {
      console.error("Erro ao buscar CEP pelo endereço:", error);
      setStatus("error");
    }
  };

  const pick = (r: ViaCepAddress) => {
    onPick({ cep: r.cep, street: r.logradouro, neighborhood: r.bairro, city: r.localidade, state: r.uf });
    pickedRef.current = true;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          streetRef.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          if (!pickedRef.current) return;
          pickedRef.current = false;
          if (focusAfterPick) {
            e.preventDefault();
            focusAfterPick();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Buscar CEP pelo endereço</DialogTitle>
          <DialogDescription>Digite o nome da rua (pode ser só uma parte) e a cidade.</DialogDescription>
        </DialogHeader>

        {/* stopPropagation: o submit deste form (num portal) não pode chegar ao
            formulário do cliente — o React propaga eventos pela árvore, não pelo DOM. */}
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void search();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cepSearchStreet">Rua</Label>
            <Input
              id="cepSearchStreet"
              ref={streetRef}
              value={street}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Ex.: Fidêncio (sem o número)"
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cepSearchCity">Cidade</Label>
              <Input id="cepSearchCity" value={city} autoComplete="off" onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cepSearchUf">UF</Label>
              <Input
                id="cepSearchUf"
                value={uf}
                maxLength={2}
                autoComplete="off"
                className="uppercase"
                onChange={(e) => setUf(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())}
              />
            </div>
          </div>
          {formError && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </form>

        {status === "error" && (
          <p className="text-sm text-destructive">Não deu para buscar agora. Tente de novo em instantes.</p>
        )}
        {status === "done" && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum endereço encontrado. Confira a grafia ou tente só uma parte do nome da rua.
          </p>
        )}
        {results.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {results.length === 1 ? "1 endereço encontrado" : `${results.length} endereços encontrados`} — toque para usar:
            </p>
            <ul className="max-h-72 divide-y divide-border/70 overflow-y-auto rounded-xl border border-border">
              {results.map((r, i) => (
                <li key={`${r.cep}-${i}`}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium text-foreground">
                        {r.logradouro || "(sem nome de rua)"}
                        {r.complemento ? <span className="font-normal text-muted-foreground"> ({r.complemento})</span> : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[r.bairro, `${r.localidade}-${r.uf}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{r.cep}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Não achou? Buscar no site dos Correios <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </DialogContent>
    </Dialog>
  );
}
