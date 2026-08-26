import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getTodayLocalISO } from "@/lib/utils";
import { ArrowLeft, FlaskConical, Plus, Trash2 } from "lucide-react";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { getPatientRecordPath } from "@/utils/patientDisplayId";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useSystemVets } from "@/hooks/useSystemVets";
import { addPatientDocument } from "@/lib/documentsApi";
import { fetchBiochemicalNames, DEFAULT_BIOCHEMICAL_NAMES } from "@/constants/examReferences";
import { EXAM_REQUEST_MARKER } from "@/lib/examRequestMarker";
import { formatAgeLong, formatPhoneBR } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const formatAddress = (address?: { cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state?: string }) => {
  if (!address) return "";
  const line1 = [address.street, address.number].filter(Boolean).join(", ");
  const line2 = [address.complement, address.neighborhood].filter(Boolean).join(" - ");
  const line3 = [address.city, address.state].filter(Boolean).join("/");
  return [line1, line2, line3, address.cep ? `CEP ${address.cep}` : ""].filter(Boolean).join(" — ");
};

const recordUrl = (clientId: string, animalId: string, patientCode?: number) =>
  `${getPatientRecordPath(clientId, animalId, patientCode)}?tab=documents`;

const HEMATOLOGIA = ["Hemograma completo", "Contagem de reticulócitos", "Coagulograma (TP/TTPA)", "Tipagem sanguínea"];
const URINA_FEZES = ["Urinálise (EAS)", "Urocultura + antibiograma", "Parasitológico de fezes (EPF)", "Pesquisa de sangue oculto nas fezes"];
const CITOLOGIA = ["CAAF (Citologia Aspirativa por Agulha Fina)", "Raspado cutâneo", "Citologia de ouvido", "Citologia vaginal", "Biópsia", "Histopatológico"];
const SOROLOGIA = ["Erliquiose", "Babesiose", "Leishmaniose", "Cinomose (PCR)", "Parvovirose (PCR/teste rápido)", "FIV/FeLV (snap)", "Dirofilariose (snap)"];
const ENDOCRINO = ["T4 total", "T4 livre", "TSH canino", "Cortisol basal", "Teste de estimulação com ACTH"];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const AddExamRequestPage: React.FC = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();
  const { data: clientData } = useClientWithAnimals(clientId);
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const { vets } = useSystemVets({ onlyVets: true });
  const { canAccessModule } = useAuth();
  const canEdit = canAccessModule("prescriptions", "edit");

  const client = clientData ?? undefined;
  const animal = client?.animals?.find((a) => a.id === animalId);
  const recordLink = clientId && animalId ? recordUrl(clientId, animalId, animal?.patientCode) : "/clients";

  const [laboratorio, setLaboratorio] = useState("");
  const [vetSolicitante, setVetSolicitante] = useState("");
  const [dataColeta, setDataColeta] = useState(() => getTodayLocalISO());
  const [horarioColeta, setHorarioColeta] = useState("");
  const [suspeita, setSuspeita] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customExams, setCustomExams] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [useDigitalSignature, setUseDigitalSignature] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Prioriza o nome de exibição do usuário logado (primeira opção da lista
    // de vets, já resolvida por useSystemVets) sobre o full_name cru — evita
    // a assinatura sair com o nome do perfil em vez do "nome para relatórios".
    if (!vetSolicitante && vets.length > 0) {
      setVetSolicitante(vets[0]);
    } else if (!vetSolicitante && currentUserProfile?.full_name) {
      setVetSolicitante(currentUserProfile.full_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vets, currentUserProfile?.full_name]);

  const [bioquimicos, setBioquimicos] = useState<string[]>(DEFAULT_BIOCHEMICAL_NAMES);
  useEffect(() => {
    let cancelled = false;
    fetchBiochemicalNames().then((names) => { if (!cancelled) setBioquimicos(names); });
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(
    () => [
      { title: "Hematologia", items: HEMATOLOGIA },
      { title: "Bioquímicos", items: bioquimicos },
      { title: "Urina e Fezes", items: URINA_FEZES },
      { title: "Citologia / Histopatologia", items: CITOLOGIA },
      { title: "Sorologia / PCR (doenças infecciosas)", items: SOROLOGIA },
      { title: "Endócrino", items: ENDOCRINO },
    ],
    [bioquimicos]
  );

  const toggle = (item: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const addCustomExam = () => {
    const v = customInput.trim();
    if (!v) return;
    if (customExams.includes(v)) {
      setCustomInput("");
      return;
    }
    setCustomExams((prev) => [...prev, v]);
    setCustomInput("");
  };

  const removeCustomExam = (v: string) => setCustomExams((prev) => prev.filter((x) => x !== v));

  const allChecked = useMemo(() => [...selected, ...customExams], [selected, customExams]);

  const hasSignatureImage = Boolean(currentUserProfile?.signature_url);

  const buildContentHtml = () => {
    const dataFormatada = new Date(`${dataColeta}T00:00`).toLocaleDateString("pt-BR");
    const crmv = currentUserProfile?.crmv ? ` — CRMV ${escapeHtml(currentUserProfile.crmv)}` : "";
    const signatureBlock =
      useDigitalSignature && currentUserProfile?.signature_url
        ? `<img src="${currentUserProfile.signature_url}" style="height:50px" /><br/>`
        : `<div style="height:1px;background:#CBD5E1;width:220px;margin:0 auto 4px auto;"></div>`;

    const TEAL = "#0F766E";
    const DARK = "#111827";
    const SLATE = "#64748B";
    const BORDER = "#E5E7EB";
    const LIGHT_GRAY = "#F9FAFB";

    const infoBox = (label: string, value: string) => `
<div style="border:1px solid ${BORDER};background:${LIGHT_GRAY};border-radius:4px;padding:8px;margin-bottom:6px;">
<p style="font-size:8px;color:${SLATE};font-weight:bold;letter-spacing:0.5px;margin:0 0 2px 0;">${label.toUpperCase()}</p>
<p style="font-size:11px;color:${DARK};font-weight:bold;margin:0;">${value}</p>
</div>`;

    const sectionTitle = (title: string) => `
<p style="font-size:10px;font-weight:bold;color:${TEAL};letter-spacing:0.8px;border-bottom:1px solid ${BORDER};padding-bottom:4px;margin:14px 0 8px 0;">${title.toUpperCase()}</p>`;

    return `<div style="font-family: Inter; font-size: 11px; color: ${DARK};">
<p style="font-size:16px;font-weight:bold;color:${TEAL};letter-spacing:1px;text-align:center;margin:0 0 4px 0;">PEDIDO DE EXAMES LABORATORIAIS</p>
<div style="height:2px;background:${TEAL};margin-bottom:14px;"></div>

${infoBox("Laboratório", escapeHtml(laboratorio.trim()))}
${infoBox("Data / Horário da coleta", `${dataFormatada}${horarioColeta ? ` às ${escapeHtml(horarioColeta)}` : ""}`)}
${infoBox("Veterinário solicitante", `${escapeHtml(vetSolicitante.trim())}${crmv}`)}
${infoBox("Paciente", `${escapeHtml(animal?.name || "")} — ${escapeHtml(animal?.species || "")}${animal?.breed ? `, ${escapeHtml(animal.breed)}` : ""}`)}
${infoBox("Tutor", escapeHtml(client?.name || ""))}

${suspeita.trim() ? `${sectionTitle("Suspeita clínica / Motivo")}<p style="margin:0;">${escapeHtml(suspeita.trim())}</p>` : ""}

${sectionTitle("Exames solicitados")}
<div style="border:1px solid ${BORDER};border-radius:4px;padding:8px 10px;">
${allChecked.map((e) => `<p style="margin:2px 0;font-size:10.5px;">☑ ${escapeHtml(e)}</p>`).join("\n")}
</div>

${observacoes.trim() ? `${sectionTitle("Observações")}<p style="margin:0;">${escapeHtml(observacoes.trim())}</p>` : ""}

<p style="text-align:center;margin-top:34px;">
${signatureBlock}
<span style="font-size:10.5px;font-weight:bold;">${escapeHtml(vetSolicitante.trim())}</span>${crmv ? `<br/><span style="font-size:9px;color:${SLATE};">${crmv.replace(/^ — /, "")}</span>` : ""}
</p>
</div>`;
  };

  const buildStructuredPayload = () => ({
    clientName: client?.name || "",
    clientPhone: formatPhoneBR(client?.mainPhoneContact) || "",
    clientAddress: formatAddress(client?.address),
    animalName: animal?.name || "",
    animalCode: animal?.patientCode != null ? String(animal.patientCode) : "",
    animalSpecies: animal?.species || "",
    animalBreed: animal?.breed || "",
    animalGender: animal?.gender || "",
    animalAge: formatAgeLong(animal?.birthday),
    animalWeight: animal?.weight ? `${animal.weight} kg` : "",
    animalCoatColor: animal?.coatColor || "",
    animalMicrochip: animal?.microchip || "",
    laboratorio: laboratorio.trim(),
    vetSolicitante: vetSolicitante.trim(),
    crmv: currentUserProfile?.crmv || "",
    dataColeta,
    horarioColeta: horarioColeta || "",
    suspeita: suspeita.trim(),
    observacoes: observacoes.trim(),
    exames: allChecked,
    signatureUrl: currentUserProfile?.signature_url || "",
    useDigitalSignature,
  });

  const handleSubmit = async () => {
    if (!canEdit) {
      toast.error("Você não possui permissão para criar documentos.");
      return;
    }
    if (!laboratorio.trim()) {
      toast.error("Informe o laboratório.");
      return;
    }
    if (!vetSolicitante.trim()) {
      toast.error("Informe o veterinário solicitante.");
      return;
    }
    if (allChecked.length === 0) {
      toast.error("Selecione ao menos um exame.");
      return;
    }
    if (!animalId) return;

    setSaving(true);
    try {
      const payload = buildStructuredPayload();
      const marker = `<!--${EXAM_REQUEST_MARKER}:${JSON.stringify(payload).replace(/-->/g, "--\\>")}-->`;
      const content = marker + buildContentHtml();
      const dataFormatada = new Date(`${dataColeta}T00:00`).toLocaleDateString("pt-BR");
      const created = await addPatientDocument(animalId, {
        name: `Pedido de Exame - ${laboratorio.trim()} - ${dataFormatada}`,
        source: "editor",
        content,
      });
      if (created) {
        toast.success("Pedido de exame gerado e salvo em Documentos!");
        navigate(recordLink);
      } else {
        toast.error("Não foi possível salvar o pedido de exame.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!client || !animal) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="link" asChild>
          <Link to="/clients">Voltar para clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Pedido de Exame Laboratorial"
        description={`Monte o pedido para enviar ao laboratório — ${animal.name} (${client.name}).`}
        icon={FlaskConical}
        module="clinical"
        breadcrumb={<>Painel &gt; Prontuário &gt; Pedido de Exame</>}
        actions={
          <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
            <Link to={recordLink}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao prontuário
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 vf-surface-card vf-tone-clinical rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lab">Laboratório *</Label>
              <Input id="lab" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} placeholder="Ex.: Patológica" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vet">Veterinário solicitante *</Label>
              {vets.length > 0 ? (
                <Select value={vetSolicitante} onValueChange={setVetSolicitante}>
                  <SelectTrigger id="vet">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vets.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="vet" value={vetSolicitante} onChange={(e) => setVetSolicitante(e.target.value)} placeholder="Nome do veterinário" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dataColeta">Data da coleta</Label>
                <Input id="dataColeta" type="date" value={dataColeta} onChange={(e) => setDataColeta(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="horarioColeta">Horário da coleta</Label>
                <Input id="horarioColeta" type="time" value={horarioColeta} onChange={(e) => setHorarioColeta(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suspeita">Suspeita clínica / Motivo</Label>
              <Textarea id="suspeita" value={suspeita} onChange={(e) => setSuspeita(e.target.value)} rows={3} placeholder="Ex.: Poliúria/polidipsia, investigação de função renal..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Jejum, cuidados de coleta, etc." />
            </div>

            {hasSignatureImage && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                <Checkbox
                  id="useSignature"
                  checked={useDigitalSignature}
                  onCheckedChange={(c) => setUseDigitalSignature(c === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="useSignature" className="text-xs font-normal text-muted-foreground leading-snug cursor-pointer">
                  Usar assinatura digital neste documento (em vez da linha em branco para assinar no papel)
                </Label>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white hover:bg-[hsl(var(--vf-clinical)/0.9)]"
            >
              {saving ? "Gerando..." : "Gerar Pedido de Exame"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 vf-surface-card vf-tone-clinical rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Exames a solicitar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selected.has(item)} onCheckedChange={() => toggle(item)} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-border pt-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Outro exame (não está na lista)
              </div>
              <div className="flex gap-2">
                <Input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomExam();
                    }
                  }}
                  placeholder="Digite o nome do exame e clique em Add"
                />
                <Button type="button" variant="outline" onClick={addCustomExam} className="gap-1 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {customExams.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customExams.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                      {v}
                      <button type="button" onClick={() => removeCustomExam(v)} className="text-muted-foreground hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {allChecked.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800">
                {allChecked.length} exame(s) selecionado(s).
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default AddExamRequestPage;
