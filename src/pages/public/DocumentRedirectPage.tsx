import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, XCircle, FileText } from "lucide-react";
import { resolveShareLink } from "@/lib/documentShareLinksApi";

// Rota pública (fora do login) — link curto mandado por WhatsApp
// (ver createShareLink em documentShareLinksApi.ts). Só resolve o código
// pra URL real do Storage e redireciona; não guarda nem mostra nada do
// documento em si.
const DocumentRedirectPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!code) {
      setError("Link incompleto.");
      return;
    }
    let cancelled = false;
    resolveShareLink(code).then((targetUrl) => {
      if (cancelled) return;
      if (targetUrl) {
        window.location.replace(targetUrl);
      } else {
        setError("Este link não existe ou expirou.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!error) {
    return (
      <div className="flex vf-viewport-min-h items-center justify-center bg-muted/40 p-4">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Abrindo documento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex vf-viewport-min-h items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md rounded-2xl border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <FileText className="h-6 w-6 text-teal-700" />
          </div>
          <CardTitle className="text-lg">Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentRedirectPage;
