import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { validateDocumentByHash, type DocumentValidationResult } from "@/lib/documentValidationApi";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

// Rota pública (fora do login) — o hash é impresso no PDF via QR code, então
// pode ser acessada por qualquer pessoa com o papel em mãos, não só por
// quem usa o sistema. Consulta só a RPC validar_documento (Etapa 1), que
// devolve o mínimo — nunca dados pessoais do documento.
const ValidateDocumentPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DocumentValidationResult | null>(null);

  React.useEffect(() => {
    if (!hash) {
      setLoading(false);
      setError("Código de validação ausente.");
      return;
    }
    validateDocumentByHash(hash)
      .then((r) => setResult(r))
      .catch(() => setError("Não foi possível consultar o documento agora. Tente novamente em instantes."))
      .finally(() => setLoading(false));
  }, [hash]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md rounded-2xl border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <ShieldCheck className="h-6 w-6 text-teal-700" />
          </div>
          <CardTitle className="text-lg">Validação de Documento</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Consultando...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">Documento não encontrado</p>
              <p className="text-xs text-muted-foreground">
                Este código não corresponde a nenhum documento emitido, ou o link está incorreto.
              </p>
            </div>
          )}

          {!loading && !error && result && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              {result.status === "cancelado" ? (
                <XCircle className="h-8 w-8 text-destructive" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-teal-700" />
              )}
              <p className="text-sm font-semibold">
                {result.status === "cancelado" ? "Documento cancelado" : "Documento autêntico"}
              </p>
              <div className="w-full space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-left text-sm">
                <p><span className="text-muted-foreground">Modelo:</span> {result.codigoModelo} — {result.tituloModelo}</p>
                <p><span className="text-muted-foreground">Documento nº:</span> {result.numero}</p>
                <p><span className="text-muted-foreground">Status:</span> {STATUS_LABEL[result.status] || result.status}</p>
                <p><span className="text-muted-foreground">Emitido em:</span> {formatDateTime(result.emitidoEm)}</p>
                {result.canceladoEm && (
                  <p><span className="text-muted-foreground">Cancelado em:</span> {formatDateTime(result.canceladoEm)}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidateDocumentPage;
