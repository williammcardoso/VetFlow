import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { ChoiceGroup, Field, FieldGrid, FormSection, StickyActionBar, ToggleChip, focusField } from "@/components/forms/FormLayout";
import { CepSearchDialog, splitCityUf, ufFromCep } from "@/components/forms/CepSearchDialog";
import { mockCompanySettings } from "@/mockData/settings";
import { Client } from "@/types/client";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import { addClient, updateClient } from "@/lib/clientsApi";

// Cadastro de cliente numa página só, em seções (antes: 3 abas — Endereço e
// Observações ficavam escondidas e o "Salvar" repetido em cada aba). Só nome
// e telefone são obrigatórios. O antigo "Adicionar outro telefone" (lista sem
// coluna no banco — o número sumia) virou um segundo telefone de verdade,
// com colunas próprias (migration 20260928120000).
// Grade de 12 colunas no computador: campos curtos (CEP, número, UF) do
// tamanho do conteúdo, mais campos por linha, e a página com largura máxima.

const applyCpfMask = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const applyCnpjMask = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const applyRgMask = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1})$/, "$1-$2");

const applyPhoneMask = (raw: string) => {
  const value = raw.replace(/\D/g, "");
  if (value.length > 10) return value.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
  if (value.length > 6) return value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  if (value.length > 2) return value.replace(/^(\d*)/, "($1) ");
  if (value.length > 0) return value.replace(/^(\d*)/, "($1");
  return value;
};

const STATES: Array<[string, string]> = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
];

type FieldErrors = Partial<Record<"fullName" | "mainPhoneContact" | "secondaryPhoneContact" | "identificationNumber", string>>;
type CepStatus = "idle" | "loading" | "found" | "not-found" | "error";

const ClientFormPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const isEditing = !!clientId;
  const queryClient = useQueryClient();
  const { data: clientToEdit, isLoading: isClientLoading, isError: isClientError, error: clientError } =
    useClientWithAnimals(isEditing ? clientId : undefined);

  const [clientType, setClientType] = useState<Client["clientType"]>("physical");
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState<Client["nationality"]>("brazilian");
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [secondaryIdentification, setSecondaryIdentification] = useState("");
  const [birthday, setBirthday] = useState("");
  const [profession, setProfession] = useState("");
  const [acceptEmail, setAcceptEmail] = useState<Client["acceptEmail"]>("yes");
  const [acceptWhatsapp, setAcceptWhatsapp] = useState<Client["acceptWhatsapp"]>("yes");
  const [acceptSMS, setAcceptSMS] = useState<Client["acceptSMS"]>("yes");
  const [mainEmailContact, setMainEmailContact] = useState("");
  const [mainPhoneContact, setMainPhoneContact] = useState("");
  const [secondaryPhoneContact, setSecondaryPhoneContact] = useState("");
  const [secondaryPhoneLabel, setSecondaryPhoneLabel] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [cepStatus, setCepStatus] = useState<CepStatus>("idle");
  const [cepDialogOpen, setCepDialogOpen] = useState(false);
  const [showMissingIdentificationDialog, setShowMissingIdentificationDialog] = useState(false);
  const [loadedClientId, setLoadedClientId] = useState<string | null>(null);
  const lastFetchedCep = useRef("");
  const numberInputRef = useRef<HTMLInputElement>(null);

  const isPerson = clientType === "physical";
  const docLabel = isPerson ? "CPF" : "CNPJ";

  // Carregar dados do cliente se estiver em modo de edição
  useEffect(() => {
    if (!isEditing) return;
    if (isClientLoading) return;
    if (isClientError) {
      toast.error(`Erro ao carregar cliente do banco: ${clientError instanceof Error ? clientError.message : "erro desconhecido"}.`);
      navigate("/clients");
      return;
    }
    if (!clientToEdit) {
      toast.error("Cliente não encontrado para edição.");
      navigate("/clients");
      return;
    }
    if (loadedClientId === clientToEdit.id) return;

    setClientType(clientToEdit.clientType);
    setFullName(clientToEdit.name);
    setNationality(clientToEdit.nationality);
    setGender(clientToEdit.gender || undefined);
    setIdentificationNumber(clientToEdit.identificationNumber);
    setSecondaryIdentification(clientToEdit.secondaryIdentification);
    setBirthday(clientToEdit.birthday);
    setProfession(clientToEdit.profession);
    setAcceptEmail(clientToEdit.acceptEmail);
    setAcceptWhatsapp(clientToEdit.acceptWhatsapp);
    setAcceptSMS(clientToEdit.acceptSMS);
    setMainEmailContact(clientToEdit.mainEmailContact);
    setMainPhoneContact(clientToEdit.mainPhoneContact);
    setSecondaryPhoneContact(clientToEdit.secondaryPhoneContact || "");
    setSecondaryPhoneLabel(clientToEdit.secondaryPhoneLabel || "");
    setCep(clientToEdit.address.cep);
    lastFetchedCep.current = clientToEdit.address.cep;
    setStreet(clientToEdit.address.street);
    setNumber(clientToEdit.address.number);
    setComplement(clientToEdit.address.complement);
    setNeighborhood(clientToEdit.address.neighborhood);
    setCity(clientToEdit.address.city);
    setState(clientToEdit.address.state || undefined);
    setNotes(clientToEdit.notes);
    setLoadedClientId(clientToEdit.id);
  }, [isEditing, isClientLoading, isClientError, clientError, clientToEdit, loadedClientId, navigate]);

  const invalidateClientQueries = async (targetClientId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["clients-with-animals"] });
    if (targetClientId) {
      await queryClient.invalidateQueries({ queryKey: ["client-with-animals", targetClientId] });
    }
  };

  const clearError = (key: keyof FieldErrors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const docError = (value: string, type: Client["clientType"]) => {
    const raw = value.replace(/\D/g, "");
    if (!raw) return undefined;
    if (type === "physical" && raw.length !== 11) return "CPF incompleto — são 11 números.";
    if (type === "legal" && raw.length !== 14) return "CNPJ incompleto — são 14 números.";
    return undefined;
  };

  const handleClientTypeChange = (value: Client["clientType"] | undefined) => {
    if (!value || value === clientType) return;
    setClientType(value);
    // Documento de PF não serve pra PJ (e vice-versa): limpa pra não gravar número com a máscara errada.
    setIdentificationNumber("");
    setSecondaryIdentification("");
    clearError("identificationNumber");
  };

  const fetchAddressByCep = async (value: string) => {
    if (value.length !== 9 || value === lastFetchedCep.current) return;
    lastFetchedCep.current = value;
    setCepStatus("loading");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${value.replace("-", "")}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepStatus("not-found");
        return;
      }
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || undefined);
      setCepStatus("found");
      numberInputRef.current?.focus();
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      lastFetchedCep.current = "";
      setCepStatus("error");
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    setCep(value);
    if (value.length < 9) setCepStatus("idle");
    // Busca assim que o CEP fica completo — não precisa sair do campo.
    if (value.length === 9) void fetchAddressByCep(value);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!fullName.trim()) next.fullName = isPerson ? "Informe o nome do cliente." : "Informe o nome ou a razão social.";
    const phoneDigits = mainPhoneContact.replace(/\D/g, "");
    if (!phoneDigits) next.mainPhoneContact = "Informe um telefone para contato.";
    else if (phoneDigits.length < 10) next.mainPhoneContact = "Telefone incompleto — inclua o DDD.";
    const phone2Digits = secondaryPhoneContact.replace(/\D/g, "");
    if (phone2Digits && phone2Digits.length < 10) next.secondaryPhoneContact = "Telefone incompleto — inclua o DDD.";
    const doc = docError(identificationNumber, clientType);
    if (doc) next.identificationNumber = doc;
    return next;
  };

  const handleSaveClient = async () => {
    if (isSaving) return;
    const found = validate();
    setErrors(found);
    const firstInvalid = (["fullName", "identificationNumber", "mainPhoneContact", "secondaryPhoneContact"] as const).find((k) => found[k]);
    if (firstInvalid) {
      toast.error("Confira os campos destacados.");
      focusField(firstInvalid);
      return;
    }
    if (!identificationNumber.replace(/\D/g, "")) {
      setShowMissingIdentificationDialog(true);
      return;
    }
    await saveClient();
  };

  const saveClient = async () => {
    const clientData: Omit<Client, "id" | "animals"> = {
      name: fullName.trim(),
      clientType,
      nationality,
      gender: isPerson ? gender || "" : "",
      identificationNumber,
      secondaryIdentification,
      birthday,
      profession: isPerson ? profession : "",
      acceptEmail,
      acceptWhatsapp,
      acceptSMS,
      mainEmailContact: mainEmailContact.trim(),
      mainPhoneContact,
      secondaryPhoneContact: secondaryPhoneContact.replace(/\D/g, "") ? secondaryPhoneContact : "",
      secondaryPhoneLabel: secondaryPhoneContact.replace(/\D/g, "") ? secondaryPhoneLabel.trim() : "",
      dynamicContacts: [],
      address: { cep, street, number, complement, neighborhood, city, state: state || "" },
      notes,
    };

    setIsSaving(true);
    try {
      if (isEditing && clientId) {
        if (!clientToEdit) {
          toast.error("Cliente não encontrado para edição.");
          return;
        }
        const updated = await updateClient({ ...clientData, id: clientId, animals: clientToEdit.animals || [] });
        if (updated.ok) {
          if (updated.warning) toast.warning(updated.warning, { duration: 10000 });
          await invalidateClientQueries(clientId);
          toast.success("Cliente atualizado.");
          navigate(`/clients/${clientId}`);
        } else {
          toast.error("Erro ao atualizar cliente no banco.");
        }
      } else {
        const result = await addClient(clientData);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        await invalidateClientQueries(result.client.id);
        if (result.warning) toast.warning(result.warning, { duration: 10000 });
        toast.success("Cliente cadastrado.");
        navigate(`/clients/${result.client.id}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isClientLoading && !clientToEdit) {
    return (
      <PageShell>
        <div className="p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold">Carregando…</h1>
          <p className="text-muted-foreground">Buscando dados do cliente.</p>
        </div>
      </PageShell>
    );
  }

  const cancelPath = isEditing ? `/clients/${clientId}` : "/clients";
  const cepHint =
    cepStatus === "loading"
      ? "Buscando endereço…"
      : cepStatus === "found"
        ? "Endereço preenchido pelo CEP — confira o número."
        : cepStatus === "not-found"
          ? "CEP não encontrado. Preencha o endereço à mão."
          : cepStatus === "error"
            ? "Não deu para buscar o CEP agora. Preencha à mão."
            : "Não sabe o CEP? Use o Buscar.";

  return (
    <PageShell className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      <PageHeader
        title={isEditing ? "Editar cliente" : "Novo cliente"}
        description="Só o nome e o telefone são obrigatórios (*). O resto pode ser completado depois."
        icon={isEditing ? Users : UserPlus}
        module="clinical"
        className="mb-0 sm:mb-0"
        breadcrumb={
          <>
            Painel &gt;{" "}
            <Link to="/clients" className="hover:text-primary">
              Clientes
            </Link>{" "}
            &gt; {isEditing ? fullName || "Editar" : "Novo cliente"}
          </>
        }
      />

      <form
        noValidate
        className="space-y-6 sm:space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSaveClient();
        }}
      >
        <FormSection title="Dados pessoais" description="Quem é o responsável pelo animal.">
          <FieldGrid>
            <Field label="Tipo de cadastro" labelId="clientType-label" className="sm:col-span-6 lg:col-span-5">
              <ChoiceGroup
                labelledBy="clientType-label"
                value={clientType}
                onChange={handleClientTypeChange}
                options={[
                  { value: "physical", label: "Pessoa física" },
                  { value: "legal", label: "Pessoa jurídica" },
                ]}
              />
            </Field>

            <Field label={isPerson ? "Nome completo" : "Nome ou razão social"} htmlFor="fullName" required error={errors.fullName} className="sm:col-span-6 lg:col-span-7">
              <Input
                id="fullName"
                value={fullName}
                autoComplete="off"
                aria-invalid={Boolean(errors.fullName)}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearError("fullName");
                }}
                placeholder={isPerson ? "Ex.: Maria da Silva" : "Ex.: Agropecuária São José"}
              />
            </Field>

            <Field label={docLabel} htmlFor="identificationNumber" error={errors.identificationNumber} className="col-span-1 sm:col-span-3 lg:col-span-3">
              <Input
                id="identificationNumber"
                inputMode="numeric"
                placeholder={isPerson ? "000.000.000-00" : "00.000.000/0000-00"}
                value={identificationNumber}
                maxLength={isPerson ? 14 : 18}
                aria-invalid={Boolean(errors.identificationNumber)}
                onChange={(e) => {
                  const masked = isPerson ? applyCpfMask(e.target.value) : applyCnpjMask(e.target.value);
                  setIdentificationNumber(masked);
                  if (errors.identificationNumber && !docError(masked, clientType)) clearError("identificationNumber");
                }}
                onBlur={() => setErrors((prev) => ({ ...prev, identificationNumber: docError(identificationNumber, clientType) }))}
              />
            </Field>

            <Field label={isPerson ? "RG" : "Inscrição estadual"} htmlFor="secondaryIdentification" className="col-span-1 sm:col-span-3 lg:col-span-3">
              <Input
                id="secondaryIdentification"
                inputMode={isPerson ? "text" : "numeric"}
                placeholder={isPerson ? "00.000.000-0" : "Somente números"}
                value={secondaryIdentification}
                maxLength={isPerson ? 12 : undefined}
                onChange={(e) =>
                  setSecondaryIdentification(isPerson ? applyRgMask(e.target.value) : e.target.value.replace(/\D/g, ""))
                }
              />
            </Field>

            <Field label={isPerson ? "Nascimento" : "Fundação"} htmlFor="birthday" className="col-span-1 sm:col-span-3 lg:col-span-3">
              <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </Field>

            {isPerson && (
              <Field label="Profissão" htmlFor="profession" className="col-span-1 sm:col-span-3 lg:col-span-3">
                <Input id="profession" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Ex.: Professora" />
              </Field>
            )}

            {isPerson && (
              <Field label="Sexo" labelId="gender-label" className="sm:col-span-3 lg:col-span-6">
                <ChoiceGroup
                  labelledBy="gender-label"
                  value={gender}
                  onChange={setGender}
                  allowDeselect
                  options={[
                    { value: "male", label: "Masculino" },
                    { value: "female", label: "Feminino" },
                    { value: "other", label: "Outro" },
                  ]}
                />
              </Field>
            )}

            <Field label="Nacionalidade" labelId="nationality-label" className="sm:col-span-3 lg:col-span-6">
              <ChoiceGroup
                labelledBy="nationality-label"
                value={nationality}
                onChange={(v) => v && setNationality(v)}
                options={[
                  { value: "brazilian", label: "Brasileira" },
                  { value: "other", label: "Outra" },
                ]}
              />
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Contato" description="Usado nos lembretes e para enviar receitas e exames pelo WhatsApp.">
          <FieldGrid>
            <Field label="Telefone (WhatsApp)" htmlFor="mainPhoneContact" required error={errors.mainPhoneContact} className="sm:col-span-3 lg:col-span-4">
              <Input
                id="mainPhoneContact"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(00) 00000-0000"
                value={mainPhoneContact}
                maxLength={15}
                aria-invalid={Boolean(errors.mainPhoneContact)}
                onChange={(e) => {
                  setMainPhoneContact(applyPhoneMask(e.target.value));
                  clearError("mainPhoneContact");
                }}
              />
            </Field>

            <Field label="Outro telefone" htmlFor="secondaryPhoneContact" error={errors.secondaryPhoneContact} className="col-span-1 sm:col-span-3 lg:col-span-4">
              <Input
                id="secondaryPhoneContact"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(00) 00000-0000"
                value={secondaryPhoneContact}
                maxLength={15}
                aria-invalid={Boolean(errors.secondaryPhoneContact)}
                onChange={(e) => {
                  setSecondaryPhoneContact(applyPhoneMask(e.target.value));
                  clearError("secondaryPhoneContact");
                }}
              />
            </Field>

            <Field label="De quem é" htmlFor="secondaryPhoneLabel" className="col-span-1 sm:col-span-3 lg:col-span-4">
              <Input
                id="secondaryPhoneLabel"
                autoComplete="off"
                placeholder="Ex.: esposa"
                value={secondaryPhoneLabel}
                onChange={(e) => setSecondaryPhoneLabel(e.target.value)}
              />
            </Field>

            <Field label="E-mail" htmlFor="mainEmailContact" className="sm:col-span-3 lg:col-span-6">
              <Input
                id="mainEmailContact"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nome@exemplo.com"
                value={mainEmailContact}
                onChange={(e) => setMainEmailContact(e.target.value)}
              />
            </Field>

            <Field label="Aceita receber mensagens por" labelId="accept-label" className="sm:col-span-6 lg:col-span-6">
              <div role="group" aria-labelledby="accept-label" className="flex flex-wrap gap-2">
                <ToggleChip pressed={acceptWhatsapp === "yes"} onPressedChange={(on) => setAcceptWhatsapp(on ? "yes" : "no")}>
                  WhatsApp
                </ToggleChip>
                <ToggleChip pressed={acceptEmail === "yes"} onPressedChange={(on) => setAcceptEmail(on ? "yes" : "no")}>
                  E-mail
                </ToggleChip>
                <ToggleChip pressed={acceptSMS === "yes"} onPressedChange={(on) => setAcceptSMS(on ? "yes" : "no")}>
                  SMS
                </ToggleChip>
              </div>
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Endereço" description="Digite o CEP e o resto é preenchido sozinho.">
          <FieldGrid>
            <Field label="CEP" htmlFor="zipCode" hint={cepHint} className="sm:col-span-3 lg:col-span-4">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                <Input
                  id="zipCode"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="00000-000"
                  value={cep}
                  maxLength={9}
                  onChange={handleCepChange}
                  onBlur={() => void fetchAddressByCep(cep)}
                  className="pr-9"
                />
                {cepStatus === "loading" && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
                )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={() => setCepDialogOpen(true)}
                  title="Não sabe o CEP? Buscar pelo nome da rua"
                >
                  <Search className="mr-1.5 h-4 w-4" aria-hidden /> Buscar
                </Button>
              </div>
            </Field>

            <Field label="Rua" htmlFor="street" className="sm:col-span-3 lg:col-span-6">
              <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua, avenida…" />
            </Field>

            <Field label="Número" htmlFor="number" className="col-span-1 sm:col-span-2 lg:col-span-2">
              <Input id="number" ref={numberInputRef} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ex.: 120" />
            </Field>

            <Field label="Complemento" htmlFor="complement" className="col-span-1 sm:col-span-4 lg:col-span-3">
              <Input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, bloco, fundos…" />
            </Field>

            <Field label="Bairro" htmlFor="neighborhood" className="sm:col-span-3 lg:col-span-4">
              <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </Field>

            <Field label="Cidade" htmlFor="city" className="col-span-1 sm:col-span-2 lg:col-span-3">
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>

            <Field label="UF" htmlFor="state" className="col-span-1 sm:col-span-1 lg:col-span-2">
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state">
                  {/* Campo estreito: mostra só a sigla; a lista tem o nome inteiro. */}
                  <SelectValue placeholder="UF">{state}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATES.map(([uf, name]) => (
                    <SelectItem key={uf} value={uf}>
                      {uf} — {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Observações" description="Algo importante sobre o cliente — aparece em destaque na ficha.">
          <Field label="Observações" htmlFor="notes">
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: prefere contato à tarde; pagamento sempre no PIX."
            />
          </Field>
        </FormSection>

        <StickyActionBar>
          <Button type="button" variant="outline" onClick={() => navigate(cancelPath)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving} className="min-w-[9rem] font-semibold">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? "Salvar alterações" : "Salvar cliente"}
          </Button>
        </StickyActionBar>
      </form>

      <CepSearchDialog
        open={cepDialogOpen}
        onOpenChange={setCepDialogOpen}
        defaultStreet={street}
        // Sem cidade no formulário, sugere a da clínica (gravada como "Itapira/SP").
        defaultCity={city || splitCityUf(mockCompanySettings.city).city}
        defaultState={state || splitCityUf(mockCompanySettings.city).uf || ufFromCep(mockCompanySettings.zipCode)}
        onPick={(address) => {
          setCep(address.cep);
          lastFetchedCep.current = address.cep;
          setStreet(address.street);
          setNeighborhood(address.neighborhood);
          setCity(address.city);
          setState(address.state || undefined);
          setCepStatus("found");
        }}
        focusAfterPick={() => numberInputRef.current?.focus()}
      />

      <AlertDialog open={showMissingIdentificationDialog} onOpenChange={setShowMissingIdentificationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{docLabel} não informado</AlertDialogTitle>
            <AlertDialogDescription>
              O {docLabel} do cliente não foi preenchido. Dá para salvar assim e completar depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e preencher</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowMissingIdentificationDialog(false);
                void saveClient();
              }}
            >
              Salvar sem {docLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default ClientFormPage;
