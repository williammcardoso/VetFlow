import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eraser, CheckCircle2, ImageIcon, PenLine, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import SignatureCanvas, { type SignatureCanvasHandle } from "@/components/SignatureCanvas";
import { saveSignature, markDocumentAsSigned, getSignaturesByDocument, type SignatureTipo } from "@/lib/documentSignatureApi";
import { regenerarPdfComAssinaturas } from "@/lib/documentPdfRegeneration";

interface Signatario {
  key: string;
  tipo: SignatureTipo;
  nome: string;
  cpf?: string;
  funcao: string;
  /** Testemunha não tem nome/CPF pré-preenchido — precisa de campo pra digitar. */
  editavel?: boolean;
  onNomeChange?: (nome: string) => void;
  onCpfChange?: (cpf: string) => void;
  /** Assinatura digital já salva no perfil (Configurações > Usuário) — hoje só o veterinário tem. */
  imagemSalva?: string;
  /** Já assinou por outro caminho (ex.: link público /assinar) — detectado por polling, não precisa desenhar aqui de novo. */
  jaAssinadoRemotamente?: boolean;
}

interface DocumentSignaturePanelProps {
  documentId: string;
  exigeAssinaturaResponsavel: boolean;
  exigeTestemunhas: boolean;
  respNome: string;
  respCpf?: string;
  vetNome: string;
  vetCrmvLabel?: string;
  vetImagemSalva?: string;
  /** Chamado com a URL nova do PDF (já com as assinaturas desenhadas) depois de regenerar — sem isso, quem chamou este painel fica preso mostrando o link do PDF antigo, de antes de assinar. */
  onSigned?: (novaPdfUrl: string | null) => void;
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
    isEmpty: () => (signatario.jaAssinadoRemotamente ? false : usarSalva ? false : !assinado),
    getResult: () => {
      // Já foi salvo por outro caminho (ex.: link público) — nada novo pra gravar aqui.
      if (signatario.jaAssinadoRemotamente) return null;
      if (usarSalva && signatario.imagemSalva) return { imagemSalvaUrl: signatario.imagemSalva };
      const dataUrl = canvasHandleRef.current?.toDataUrl();
      return dataUrl ? { dataUrlPng: dataUrl } : null;
    },
  }));

  if (signatario.jaAssinadoRemotamente) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div>
          <p className="text-sm font-semibold">{signatario.nome || "(nome não informado)"}</p>
          <p className="text-xs text-muted-foreground">{signatario.funcao}</p>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Já assinado (detectado automaticamente)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {signatario.editavel ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Nome da testemunha" value={signatario.nome} onChange={(e) => signatario.onNomeChange?.(e.target.value)} />
          <Input placeholder="CPF" value={signatario.cpf ?? ""} onChange={(e) => signatario.onCpfChange?.(e.target.value)} />
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold">{signatario.nome || "(nome não informado)"}</p>
          <p className="text-xs text-muted-foreground">
            {signatario.funcao}
            {signatario.cpf ? ` · CPF ${signatario.cpf}` : ""}
          </p>
        </div>
      )}

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

const DocumentSignaturePanel: React.FC<DocumentSignaturePanelProps> = ({
  documentId,
  exigeAssinaturaResponsavel,
  exigeTestemunhas,
  respNome,
  respCpf,
  vetNome,
  vetCrmvLabel,
  vetImagemSalva,
  onSigned,
}) => {
  const [modoTestemunhas, setModoTestemunhas] = useState(false);
  const [testemunha1, setTestemunha1] = useState({ nome: "", cpf: "" });
  const [testemunha2, setTestemunha2] = useState({ nome: "", cpf: "" });
  const [saving, setSaving] = useState(false);
  const [concluido, setConcluido] = useState(false);
  // Tipos já assinados por FORA deste painel (ex.: responsável assinou pelo
  // link público /assinar enquanto o vet está com esta tela aberta).
  const [tiposJaAssinados, setTiposJaAssinados] = useState<Set<SignatureTipo>>(new Set());

  const handlesRef = useRef<Record<string, SignatureSlotHandle | null>>({});

  // Verifica a cada poucos segundos se alguém assinou por outro caminho —
  // sem isso, quem manda o link pro responsável assinar no celular fica
  // preso: esta tela nunca saberia que a assinatura dele já existe e
  // continuaria pedindo pra desenhar aqui de novo.
  useEffect(() => {
    let ativo = true;
    const verificar = async () => {
      try {
        const assinaturas = await getSignaturesByDocument(documentId);
        if (!ativo) return;
        setTiposJaAssinados(new Set(assinaturas.map((a) => a.tipo)));
      } catch {
        // silencioso — só é uma verificação em segundo plano, não crítica
      }
    };
    verificar();
    const intervalo = setInterval(verificar, 4000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [documentId]);

  const usaTestemunhas = exigeTestemunhas && modoTestemunhas && exigeAssinaturaResponsavel;
  const precisaResponsavel = exigeAssinaturaResponsavel && !usaTestemunhas;

  const signatarios: Signatario[] = [
    {
      key: "veterinario",
      tipo: "veterinario",
      nome: vetNome,
      funcao: `Médico-Veterinário${vetCrmvLabel ? ` — CRMV ${vetCrmvLabel}` : ""}`,
      imagemSalva: vetImagemSalva,
      jaAssinadoRemotamente: tiposJaAssinados.has("veterinario"),
    },
    ...(precisaResponsavel
      ? [
          {
            key: "responsavel",
            tipo: "responsavel" as const,
            nome: respNome,
            cpf: respCpf,
            funcao: "Responsável pelo animal",
            jaAssinadoRemotamente: tiposJaAssinados.has("responsavel"),
          },
        ]
      : []),
    ...(usaTestemunhas
      ? [
          {
            key: "testemunha1",
            tipo: "testemunha" as const,
            nome: testemunha1.nome,
            cpf: testemunha1.cpf,
            funcao: "Testemunha 1",
            editavel: true,
            onNomeChange: (nome: string) => setTestemunha1((p) => ({ ...p, nome })),
            onCpfChange: (cpf: string) => setTestemunha1((p) => ({ ...p, cpf })),
          },
          {
            key: "testemunha2",
            tipo: "testemunha" as const,
            nome: testemunha2.nome,
            cpf: testemunha2.cpf,
            funcao: "Testemunha 2",
            editavel: true,
            onNomeChange: (nome: string) => setTestemunha2((p) => ({ ...p, nome })),
            onCpfChange: (cpf: string) => setTestemunha2((p) => ({ ...p, cpf })),
          },
        ]
      : []),
  ];

  const handleSalvar = async () => {
    const pendencias: string[] = [];
    for (const sig of signatarios) {
      const handle = handlesRef.current[sig.key];
      if (!handle || handle.isEmpty()) pendencias.push(`Assinatura de ${sig.funcao}`);
      if (sig.editavel && !sig.nome.trim()) pendencias.push(`Nome de ${sig.funcao}`);
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
        await saveSignature({
          documentId,
          tipo: sig.tipo,
          nome: sig.nome,
          cpf: sig.cpf,
          funcao: sig.funcao,
          dataUrlPng: resultado.dataUrlPng,
          imagemSalvaUrl: resultado.imagemSalvaUrl,
        });
      }
      await markDocumentAsSigned(documentId);
      setConcluido(true);

      const { url, errorMessage } = await regenerarPdfComAssinaturas(documentId);
      if (url) {
        toast.success("Assinaturas gravadas e PDF atualizado com as assinaturas.");
      } else {
        toast.warning(`Assinaturas gravadas, mas o PDF com as assinaturas não pôde ser gerado: ${errorMessage || "motivo desconhecido"}.`);
      }
      onSigned?.(url);
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
      {exigeAssinaturaResponsavel && exigeTestemunhas && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={modoTestemunhas} onCheckedChange={(v) => setModoTestemunhas(v === true)} />
          Responsável se recusou a assinar — registrar com duas testemunhas presenciais
        </label>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {signatarios.map((sig) => (
          <div key={sig.key} className="space-y-1.5">
            <SignatureSlot
              signatario={sig}
              ref={(handle) => {
                handlesRef.current[sig.key] = handle;
              }}
            />
            {sig.tipo === "responsavel" && !sig.jaAssinadoRemotamente && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  const link = `${window.location.origin}/assinar/${documentId}`;
                  navigator.clipboard.writeText(link).then(
                    () => toast.success("Link copiado — envie pro responsável assinar no celular dele."),
                    () => toast.error("Não foi possível copiar o link.")
                  );
                }}
              >
                <LinkIcon className="mr-1.5 h-3 w-3" /> Ou copiar link pro responsável assinar no celular
              </Button>
            )}
          </div>
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

export default DocumentSignaturePanel;
