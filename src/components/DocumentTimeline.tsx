import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, ExternalLink, Ban, Plus, Link2, PenLine, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePatientDocuments } from "@/hooks/usePatientDocuments";
import { getPatientSubPath } from "@/utils/patientDisplayId";
import { cancelDocument, type EmittedDocumentSummary } from "@/lib/documentEmissionApi";
import { getDocumentForSigning, type DocumentForSigning } from "@/lib/documentSigningLinkApi";
import { getMyUserProfile } from "@/lib/authApi";
import DocumentSignaturePanel from "@/components/DocumentSignaturePanel";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700 border-slate-300",
  emitido: "bg-sky-100 text-sky-700 border-sky-300",
  assinado: "bg-emerald-100 text-emerald-700 border-emerald-300",
  cancelado: "bg-red-100 text-red-700 border-red-300",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function CancelDialog({ doc, onClose, onCancelled }: { doc: EmittedDocumentSummary; onClose: () => void; onCancelled: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      toast.error("O motivo do cancelamento é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      await cancelDocument(doc.id, motivo.trim());
      toast.success("Documento cancelado.");
      onCancelled();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao cancelar documento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar documento nº {doc.numero}</DialogTitle>
          <DialogDescription>
            {doc.codigo} — {doc.titulo}. O documento fica marcado como cancelado (nunca é apagado) — se precisar de um
            novo, emita outro a partir do prontuário.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Motivo do cancelamento (obrigatório)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="min-h-[90px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={saving}>
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Revisar e assinar" — abre o documento e o painel de assinatura (vet +
 * responsável, presencial) sem precisar voltar pra tela de emissão, que só
 * mostrava esse painel uma vez, logo depois de emitir. Se o vet emitiu e não
 * assinou na hora, antes só sobrava o link pro responsável assinar sozinho
 * no celular — sem jeito de os dois assinarem juntos, presencialmente,
 * depois.
 */
function SignInPersonDialog({
  doc,
  onClose,
  onSigned,
}: {
  doc: EmittedDocumentSummary;
  onClose: () => void;
  onSigned: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<DocumentForSigning | null>(null);
  const [vetImagemSalva, setVetImagemSalva] = useState<string | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    Promise.all([getDocumentForSigning(doc.id), getMyUserProfile().catch(() => null)])
      .then(([documentInfo, profile]) => {
        if (!ativo) return;
        setInfo(documentInfo);
        setVetImagemSalva(profile?.signature_url || undefined);
      })
      .catch(() => {
        if (ativo) setError("Não foi possível carregar o documento agora.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [doc.id]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisar e assinar — nº {doc.numero}</DialogTitle>
          <DialogDescription>
            {doc.codigo} — {doc.titulo}. Assine aqui mesmo, na tela: você (veterinário) e o responsável, um logo após o
            outro no mesmo aparelho.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-2 py-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!loading && (error || !info) && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{error || "Documento não encontrado."}</AlertTitle>
          </Alert>
        )}

        {!loading && info && info.status === "cancelado" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Este documento foi cancelado — não é possível assinar.</AlertTitle>
          </Alert>
        )}

        {!loading && info && info.status !== "cancelado" && (
          <div className="space-y-4">
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
              {info.corpoRenderizado}
            </pre>

            <DocumentSignaturePanel
              documentId={doc.id}
              exigeAssinaturaResponsavel={info.exigeAssinaturaResponsavel}
              exigeTestemunhas={info.exigeTestemunhas}
              respNome={info.respNome}
              respCpf={info.respCpf}
              vetNome={info.vetNome}
              vetCrmvLabel={info.vetCrmvLabel}
              vetImagemSalva={vetImagemSalva}
              onSigned={() => {
                onSigned();
                onClose();
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentTimelineProps {
  pacienteId: string;
  clientId: string;
  animalId: string;
  patientCode?: number;
}

const DocumentTimeline: React.FC<DocumentTimelineProps> = ({ pacienteId, clientId, animalId, patientCode }) => {
  const { data: docs, isLoading, isError } = usePatientDocuments(pacienteId);
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<EmittedDocumentSummary | null>(null);
  const [signTarget, setSignTarget] = useState<EmittedDocumentSummary | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["patient-documents", pacienteId] });

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileSignature className="h-4 w-4 text-primary" /> Termos e atestados (modelos oficiais)
        </h3>
        <Button size="sm" variant="outline" asChild>
          <Link to={getPatientSubPath(clientId, animalId, patientCode, "/emit-document")}>
            <Plus className="mr-2 h-4 w-4" /> Emitir novo
          </Link>
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar documentos emitidos</AlertTitle>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !docs || docs.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Nenhum termo ou atestado emitido pelo módulo de documentos ainda.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {doc.codigo} — {doc.titulo} <span className="text-muted-foreground">nº {doc.numero}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Emitido em {formatDateTime(doc.emitidoEm)}
                  {doc.status === "cancelado" && doc.motivoCancelamento ? ` · Motivo: ${doc.motivoCancelamento}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[doc.status] ?? ""}`}>
                {STATUS_LABEL[doc.status] ?? doc.status}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {doc.pdfPath && (
                  <Button asChild variant="ghost" size="icon" title="Abrir PDF">
                    <a href={doc.pdfPath} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {doc.status === "emitido" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Revisar e assinar agora (veterinário e responsável, na tela)"
                      onClick={() => setSignTarget(doc)}
                    >
                      <PenLine className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Copiar link para o responsável assinar"
                      onClick={() => {
                        const link = `${window.location.origin}/assinar/${doc.id}`;
                        navigator.clipboard.writeText(link).then(
                          () => toast.success("Link copiado."),
                          () => toast.error("Não foi possível copiar o link.")
                        );
                      }}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {doc.status !== "cancelado" && (
                  <Button variant="ghost" size="icon" title="Cancelar" onClick={() => setCancelTarget(doc)}>
                    <Ban className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <CancelDialog doc={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={refetch} />
      )}

      {signTarget && (
        <SignInPersonDialog
          doc={signTarget}
          onClose={() => setSignTarget(null)}
          onSigned={() => {
            refetch();
            toast.success("Assinaturas concluídas.");
          }}
        />
      )}
    </div>
  );
};

export default DocumentTimeline;
