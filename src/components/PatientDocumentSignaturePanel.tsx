import React, { useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, CheckCircle2, ImageIcon, PenLine } from "lucide-react";
import { toast } from "sonner";
import SignatureCanvas, { type SignatureCanvasHandle } from "@/components/SignatureCanvas";
import { savePatientDocumentSignature, type PatientDocSignatureTipo } from "@/lib/patientDocumentSignatureApi";

interface Signatario {
  key: string;
  tipo: PatientDocSignatureTipo;
  nome: string;
  cpf?: string;
  funcao: string;
  /** Assinatura digital já salva no perfil (Configurações > Usuário) — hoje só o veterinário tem. */
  imagemSalva?: string;
}

interface SignatureSlotHandle {
  isEmpty: () => boolean;
  getResult: () => { dataUrlPng?: string; imagemSalvaUrl?: string } | null;
}

const SignatureSlot = React.forwardRef<SignatureSlotHandle, { signatario: Signatario }>(({ signatario }, ref) => {
  const canvasHandleRef = useRef<SignatureCanvasHandle | null>(null);
  const [usarSalva, setUsarSalva] = useState(!!signatario.imagemSalva);
  const [assinado, setAssinado] = useState(false);

  useImperativeHandle(ref, () => ({
    isEmpty: () => (usarSalva ? false : !assinado),
    getResult: () => {
      if (usarSalva && signatario.imagemSalva) return { imagemSalvaUrl: signatario.imagemSalva };
      const dataUrl = canvasHandleRef.current?.toDataUrl();
      return dataUrl ? { dataUrlPng: dataUrl } : null;
    },
  }));

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-semibold">{signatario.nome || "(nome não informado)"}</p>
        <p className="text-xs text-muted-foreground">
          {signatario.funcao}
          {signatario.cpf ? ` · CPF ${signatario.cpf}` : ""}
        </p>
      </div>

      {usarSalva && signatario.imagemSalva ? (
        <div className="flex h-[160px] items-center justify-center rounded-lg border border-border bg-white p-2">
          <img src={signatario.imagemSalva} alt={`Assinatura salva de ${signatario.nome}`} className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <SignatureCanvas
          ref={(handle) => {
            canvasHandleRef.current = handle;
          }}
          onChange={setAssinado}
        />
      )}

      <div className="flex items-center justify-between">
        {signatario.imagemSalva ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setUsarSalva((v) => !v)}>
            {usarSalva ? (
              <>
                <PenLine className="mr-2 h-3.5 w-3.5" /> Assinar agora
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-3.5 w-3.5" /> Usar assinatura salva
              </>
            )}
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => canvasHandleRef.current?.clear()}>
            <Eraser className="mr-2 h-3.5 w-3.5" /> Limpar
          </Button>
        )}
        {(usarSalva || assinado) && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {usarSalva ? "Assinatura salva selecionada" : "Assinado"}
          </span>
        )}
      </div>
    </div>
  );
});
SignatureSlot.displayName = "SignatureSlot";

interface PatientDocumentSignaturePanelProps {
  patientDocumentId: string;
  respNome: string;
  respCpf?: string;
  vetNome: string;
  vetCrmvLabel?: string;
  vetImagemSalva?: string;
  onSigned?: () => void;
}

/**
 * Assinatura presencial (vet + responsável) pra documentos LIVRES (editor) —
 * irmã mais simples de DocumentSignaturePanel.tsx (modelo oficial CFMV): sem
 * testemunhas e sem link público, porque documento livre não passa por
 * template/numeração/hash. Sem "regenerar PDF" no final: o PDF desses
 * documentos já é montado na hora (DocumentPdfContent busca as assinaturas
 * salvas toda vez que alguém visualiza/baixa/manda por WhatsApp).
 */
const PatientDocumentSignaturePanel: React.FC<PatientDocumentSignaturePanelProps> = ({
  patientDocumentId,
  respNome,
  respCpf,
  vetNome,
  vetCrmvLabel,
  vetImagemSalva,
  onSigned,
}) => {
  const [saving, setSaving] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const handlesRef = useRef<Record<string, SignatureSlotHandle | null>>({});

  const signatarios: Signatario[] = [
    {
      key: "veterinario",
      tipo: "veterinario",
      nome: vetNome,
      funcao: `Médico-Veterinário${vetCrmvLabel ? ` — CRMV ${vetCrmvLabel}` : ""}`,
      imagemSalva: vetImagemSalva,
    },
    {
      key: "responsavel",
      tipo: "responsavel",
      nome: respNome,
      cpf: respCpf,
      funcao: "Responsável pelo animal",
    },
  ];

  const handleSalvar = async () => {
    const pendencias: string[] = [];
    for (const sig of signatarios) {
      const handle = handlesRef.current[sig.key];
      if (!handle || handle.isEmpty()) pendencias.push(`Assinatura de ${sig.funcao}`);
    }
    if (pendencias.length > 0) {
      toast.error(`Faltando: ${pendencias.join(", ")}.`);
      return;
    }

    setSaving(true);
    try {
      for (const sig of signatarios) {
        const resultado = handlesRef.current[sig.key]?.getResult();
        if (!resultado) continue;
        await savePatientDocumentSignature({
          patientDocumentId,
          tipo: sig.tipo,
          nome: sig.nome,
          cpf: sig.cpf,
          funcao: sig.funcao,
          dataUrlPng: resultado.dataUrlPng,
          imagemSalvaUrl: resultado.imagemSalvaUrl,
        });
      }
      setConcluido(true);
      toast.success("Assinaturas gravadas.");
      onSigned?.();
    } catch (err: any) {
      toast.error(err.message || "Falha ao gravar assinaturas.");
    } finally {
      setSaving(false);
    }
  };

  if (concluido) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 className="h-5 w-5" /> Documento assinado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {signatarios.map((sig) => (
          <SignatureSlot
            key={sig.key}
            signatario={sig}
            ref={(handle) => {
              handlesRef.current[sig.key] = handle;
            }}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSalvar} disabled={saving}>
          {saving ? "Gravando..." : "Confirmar assinaturas"}
        </Button>
      </div>
    </div>
  );
};

export default PatientDocumentSignaturePanel;
