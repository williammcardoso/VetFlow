import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getMyUserProfile } from "@/lib/authApi";
import PatientDocumentSignaturePanel from "@/components/PatientDocumentSignaturePanel";
import type { PatientDocumentEntry } from "@/lib/documentsApi";

interface PatientDocumentSignDialogProps {
  doc: PatientDocumentEntry;
  /** HTML já com as variáveis do template resolvidas (mesmo texto usado pra montar o PDF) — só pra pré-visualização aqui. */
  previewHtml: string;
  respNome: string;
  respCpf?: string;
  onClose: () => void;
  onSigned: () => void;
}

/**
 * "Assinar" pra documentos LIVRES (editor) do prontuário — pedido do usuário
 * logo depois de aprovar o mesmo fluxo pros documentos oficiais (Termos e
 * atestados). Reaproveita PatientDocumentSignaturePanel; essa parte só busca
 * o perfil do veterinário logado (pra assinatura salva/CRMV) e mostra a
 * prévia do texto antes dos campos de assinatura.
 */
const PatientDocumentSignDialog: React.FC<PatientDocumentSignDialogProps> = ({
  doc,
  previewHtml,
  respNome,
  respCpf,
  onClose,
  onSigned,
}) => {
  const [loading, setLoading] = useState(true);
  const [vetNome, setVetNome] = useState("");
  const [vetImagemSalva, setVetImagemSalva] = useState<string | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    getMyUserProfile()
      .then((profile) => {
        if (!ativo) return;
        setVetNome(profile.full_name || "");
        setVetImagemSalva(profile.signature_url || undefined);
      })
      .catch(() => {
        // segue sem os dados do vet — o painel deixa preencher/assinar na hora mesmo assim
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisar e assinar — {doc.name}</DialogTitle>
          <DialogDescription>
            Assine aqui mesmo, na tela: você (veterinário) e o responsável, um logo após o outro no mesmo aparelho.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />

            <PatientDocumentSignaturePanel
              patientDocumentId={doc.id}
              respNome={respNome}
              respCpf={respCpf}
              vetNome={vetNome}
              vetImagemSalva={vetImagemSalva}
              onSigned={onSigned}
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
};

export default PatientDocumentSignDialog;
