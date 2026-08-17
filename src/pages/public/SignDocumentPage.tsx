import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, FileSignature, Eraser } from "lucide-react";
import { toast } from "sonner";
import SignatureCanvas, { type SignatureCanvasHandle } from "@/components/SignatureCanvas";
import { getDocumentForSigning, type DocumentForSigning } from "@/lib/documentSigningLinkApi";
import { saveSignature, markDocumentAsSigned } from "@/lib/documentSignatureApi";
import { regenerarPdfComAssinaturas } from "@/lib/documentPdfRegeneration";

// Rota pública (fora do login) — o link é enviado direto ao responsável
// (ex.: WhatsApp), pra assinar no próprio celular quando só há PC (sem
// touch) no consultório. Mesmo nível de confiança de qualquer link
// compartilhado: quem tiver o link vê o documento e pode assinar.
const SignDocumentPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentForSigning | null>(null);
  const [saving, setSaving] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);
  const [assinado, setAssinado] = useState(false);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      setError("Link inválido.");
      return;
    }
    getDocumentForSigning(documentId)
      .then((d) => setDoc(d))
      .catch(() => setError("Não foi possível carregar o documento agora. Tente novamente em instantes."))
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleConfirmar = async () => {
    if (!doc || !documentId) return;
    if (canvasRef.current?.isEmpty()) {
      toast.error("Assine no campo acima antes de confirmar.");
      return;
    }
    const dataUrl = canvasRef.current?.toDataUrl();
    if (!dataUrl) return;

    setSaving(true);
    try {
      await saveSignature({
        documentId,
        tipo: "responsavel",
        nome: doc.respNome,
        cpf: doc.respCpf,
        funcao: "Responsável pelo animal",
        dataUrlPng: dataUrl,
      });
      // Só marca como assinado se o veterinário já tiver assinado também
      // (ou não for exigido) — senão o documento fica "emitido" até o vet assinar.
      if (doc.jaTemAssinaturaVeterinario) {
        await markDocumentAsSigned(documentId);
      }
      await regenerarPdfComAssinaturas(documentId);
      setConcluido(true);
      toast.success("Assinatura registrada.");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gravar a assinatura.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-xl rounded-2xl border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <FileSignature className="h-6 w-6 text-teal-700" />
          </div>
          <CardTitle className="text-lg">Assinatura de Documento</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Carregando...</p>
            </div>
          )}

          {!loading && (error || !doc) && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error || "Documento não encontrado."}</p>
            </div>
          )}

          {!loading && doc && doc.status === "cancelado" && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">Este documento foi cancelado</p>
              <p className="text-xs text-muted-foreground">Fale com a clínica para emitir um novo.</p>
            </div>
          )}

          {!loading && doc && doc.status !== "cancelado" && (concluido || doc.jaTemAssinaturaResponsavel) && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="text-sm font-medium">Assinatura já registrada. Obrigado!</p>
            </div>
          )}

          {!loading && doc && doc.status !== "cancelado" && !concluido && !doc.jaTemAssinaturaResponsavel && (
            <div className="space-y-4">
              <div>
                <CardDescription>
                  {doc.codigo} — {doc.titulo} · Documento nº {doc.numero}
                </CardDescription>
                <p className="mt-1 text-sm">
                  Responsável: <span className="font-medium">{doc.respNome || "(nome não informado)"}</span>
                  {doc.respCpf ? ` · CPF ${doc.respCpf}` : ""}
                </p>
              </div>

              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                {doc.corpoRenderizado}
              </pre>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assine abaixo</p>
                <SignatureCanvas ref={(h) => (canvasRef.current = h)} onChange={setAssinado} height={180} />
                <div className="flex items-center justify-between">
                  <Button type="button" variant="ghost" size="sm" onClick={() => canvasRef.current?.clear()}>
                    <Eraser className="mr-2 h-3.5 w-3.5" /> Limpar
                  </Button>
                  {assinado && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pronto pra confirmar
                    </span>
                  )}
                </div>
              </div>

              <Button className="w-full" onClick={handleConfirmar} disabled={saving}>
                {saving ? "Gravando..." : "Confirmar assinatura"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignDocumentPage;
