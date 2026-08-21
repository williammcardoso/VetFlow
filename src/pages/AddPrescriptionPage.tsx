"use client";

import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTimes, FaEye, FaSave, FaPrint, FaDownload, FaClipboardList } from "@/components/icons/fa";
import { ClipboardList } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PrescriptionMedicationForm, { MedicationData } from "@/components/PrescriptionMedicationForm";
import PrescriptionManipulatedForm from "@/components/PrescriptionManipulatedForm";
import { toast } from "sonner";
import { PrescriptionPdfContent } from "@/components/PrescriptionPdfContent";
import { PrescriptionEntry, ManipulatedPrescriptionData } from "@/types/medication";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useClientWithAnimals } from "@/hooks/useSupabaseClients";
import * as prescriptionsApi from "@/lib/prescriptionsApi";
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
import { createPdfBlob, downloadPdf, openPdf } from "@/lib/pdfExport";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

function formatAddress(client: { address: { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string } }): string {
  const a = client.address;
  return [a.street, a.number, a.complement, a.neighborhood, a.city, a.state].filter(Boolean).join(", ") || "";
}

const AddPrescriptionPage = () => {
  const { clientId, animalId, prescriptionId } = useParams<{ clientId: string; animalId: string; prescriptionId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prescriptionType = (searchParams.get('type') as 'simple' | 'controlled' | 'manipulated') || 'simple';

  const { data: client, isLoading: clientLoading, isError: clientError } = useClientWithAnimals(clientId);
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const animal = client?.animals.find(a => a.id === animalId);
  const { prescriptions, refetch: refetchPrescriptions } = usePrescriptions(animalId ?? undefined);

  // Estados para Receita Simples/Controlada
  const [currentPrescriptionMedications, setCurrentPrescriptionMedications] = useState<MedicationData[]>([]);
  const [currentPrescriptionGeneralObservations, setCurrentPrescriptionGeneralObservations] = useState<string>("");
  const [treatmentDescription, setTreatmentDescription] = useState<string>("");

  // Estados para Receita Manipulada
  const [manipulatedPrescriptionData, setManipulatedPrescriptionData] = useState<ManipulatedPrescriptionData | undefined>(undefined);

  // Estados para dados do farmacêutico (NÃO APARECEM NO FORMULÁRIO, APENAS PARA O PDF)
  const [pharmacistName] = useState<string>("Farmacêutico(a) Responsável");
  const [pharmacistCpf] = useState<string>("CPF: 000.000.000-00");
  const [pharmacistCfr] = useState<string>("CRF: 00000");
  const [pharmacistAddress] = useState<string>("Endereço da Farmácia, 000 - Cidade - UF");
  const [pharmacistPhone] = useState<string>("Telefone: (00) 00000-0000");

  // Estado para o AlertDialog de confirmação de múltiplos medicamentos
  const [isControlledMedicationWarningOpen, setIsControlledMedicationWarningOpen] = useState(false);
  const [allowMultipleMedications, setAllowMultipleMedications] = useState(false);


  useEffect(() => {
    if (!prescriptionId) {
      setAllowMultipleMedications(false);
      setManipulatedPrescriptionData(undefined);
      setCurrentPrescriptionMedications([]);
      setCurrentPrescriptionGeneralObservations("");
      setTreatmentDescription("");
      return;
    }

    const applyPrescription = (existingPrescription: import("@/types/medication").PrescriptionEntry) => {
      setTreatmentDescription(existingPrescription.treatmentDescription || "");
      if (existingPrescription.type === "manipulated" && existingPrescription.manipulatedPrescription) {
        setManipulatedPrescriptionData(existingPrescription.manipulatedPrescription);
        setCurrentPrescriptionGeneralObservations(existingPrescription.manipulatedPrescription.generalObservations ?? "");
      } else if (existingPrescription.medications) {
        setCurrentPrescriptionMedications(existingPrescription.medications.map((med) => ({ ...med, isCollapsed: true })));
        setCurrentPrescriptionGeneralObservations(existingPrescription.instructions ?? "");
        if (existingPrescription.type === "controlled") {
          setAllowMultipleMedications(existingPrescription.medications.length > 1);
        }
      }
    };

    const fromList = prescriptions.find((p) => p.id === prescriptionId);
    if (fromList) {
      applyPrescription(fromList);
      return;
    }

    prescriptionsApi.getPrescriptionById(prescriptionId).then((p) => {
      if (p) applyPrescription(p);
      else {
        toast.error("Receita não encontrada.");
        navigate(`/clients/${clientId}/animals/${animalId}/record`);
      }
    });
  }, [prescriptionId, clientId, animalId, navigate, prescriptions]);


  if (!client || !animal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Animal ou Cliente não encontrado.</h1>
        <Link to="/clients">
          <Button variant="outline">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  const handleAddMedication = () => {
    if (prescriptionType === 'controlled' && currentPrescriptionMedications.length >= 1 && !allowMultipleMedications) {
      setIsControlledMedicationWarningOpen(true);
      return;
    }

    const newMedication: MedicationData = {
      id: `med-${Date.now()}`,
      useType: "",
      pharmacyType: "",
      medicationName: "",
      concentration: "",
      pharmaceuticalForm: "",
      customPharmaceuticalForm: "",
      dosePerAdministration: "",
      frequency: "",
      customFrequency: "",
      period: "",
      customPeriod: "",
      useCustomInstructions: false,
      generatedInstructions: "",
      generalObservations: "",
      totalQuantity: "",
      totalQuantityDisplay: "",
      isCollapsed: false,
    };
    setCurrentPrescriptionMedications((prev) => [...prev, newMedication]);
  };

  const handleConfirmAddMultipleMedications = () => {
    setAllowMultipleMedications(true);
    setIsControlledMedicationWarningOpen(false);
    handleAddMedication();
  };

  const handleSaveMedication = (updatedMedication: MedicationData) => {
    setCurrentPrescriptionMedications((prev) =>
      prev.map((med) => (med.id === updatedMedication.id ? updatedMedication : med))
    );
    toast.success(`Medicamento '${updatedMedication.medicationName || 'sem nome'}' salvo no formulário!`);
  };

  const handleDeleteMedication = (id: string) => {
    setCurrentPrescriptionMedications((prev) => prev.filter((med) => med.id !== id));
    toast.info("Medicamento removido do formulário.");
  };

  const handleToggleMedicationCollapse = (id: string) => {
    setCurrentPrescriptionMedications((prev) =>
      prev.map((med) =>
        med.id === id ? { ...med, isCollapsed: !med.isCollapsed } : med
      )
    );
  };

  const handleSaveManipulatedPrescription = (data: ManipulatedPrescriptionData) => {
    setManipulatedPrescriptionData(data);
    setCurrentPrescriptionGeneralObservations(data.generalObservations); // Sincronizar observações gerais
    toast.success("Dados da receita manipulada salvos no formulário!");
  };

  const handleSavePrescription = async () => {
    if (prescriptionType !== 'manipulated' && currentPrescriptionMedications.length === 0) {
      toast.error("Adicione pelo menos um medicamento à receita.");
      return;
    }
    if (prescriptionType === 'manipulated' && !manipulatedPrescriptionData) {
      toast.error("Preencha os dados da receita manipulada antes de salvar.");
      return;
    }
    if (!animalId) {
      toast.error("Animal não identificado.");
      return;
    }

    let newPrescription: PrescriptionEntry & { animalId?: string };
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (prescriptionType === 'manipulated' && manipulatedPrescriptionData) {
      newPrescription = {
        id: prescriptionId || `rx-${Date.now()}`,
        date: now.toISOString().split('T')[0],
        time: currentTime,
        medicationName: manipulatedPrescriptionData.formulaComponents.map(c => c.name).join(", ") || "Receita Manipulada",
        treatmentDescription: treatmentDescription.trim() || undefined,
        instructions: manipulatedPrescriptionData.generalObservations,
        type: prescriptionType,
        manipulatedPrescription: manipulatedPrescriptionData,
      };
    } else {
      const summaryMedicationName = currentPrescriptionMedications
        .map(med => med.medicationName)
        .filter(name => name.trim() !== "")
        .join(", ");

      newPrescription = {
        id: prescriptionId || `rx-${Date.now()}`,
        date: now.toISOString().split('T')[0],
        time: currentTime,
        medicationName: summaryMedicationName || "Receita sem medicamentos",
        treatmentDescription: treatmentDescription.trim() || undefined,
        instructions: currentPrescriptionGeneralObservations,
        type: prescriptionType,
        medications: currentPrescriptionMedications.map(med => ({ ...med, isCollapsed: true })),
      };
    }

    if (prescriptionId) {
      const ok = await prescriptionsApi.updatePrescription(newPrescription as PrescriptionEntry);
      if (ok) {
        await refetchPrescriptions();
        toast.success("Receita salva com sucesso!");
        navigate(`/clients/${clientId}/animals/${animalId}/record`);
      } else {
        toast.error("Falha ao atualizar receita.");
      }
    } else {
      const entry = { ...newPrescription, animalId };
      const created = await prescriptionsApi.addPrescription(entry as Omit<PrescriptionEntry, "id"> & { animalId: string });
      if (created) {
        await refetchPrescriptions();
        toast.success("Receita salva com sucesso!");
        navigate(`/clients/${clientId}/animals/${animalId}/record`);
      } else {
        toast.error("Falha ao salvar receita.");
      }
    }
  };

  const handlePrintPrescription = async () => {
    if (prescriptionType !== 'manipulated' && currentPrescriptionMedications.length === 0) {
      toast.error("Adicione pelo menos um medicamento para imprimir a receita.");
      return;
    }
    if (prescriptionType === 'manipulated' && !manipulatedPrescriptionData) {
      toast.error("Preencha os dados da receita manipulada antes de imprimir.");
      return;
    }

    try {
      const blob = await createPdfBlob(
        PrescriptionPdfContent({
          animalName: animal.name,
          animalId: animal.id,
          animalSpecies: animal.species,
          animalBreed: animal.breed,
          animalSex: animal.gender,
          animalBirthday: animal.birthday,
          animalWeight: animal.weight,
          animalMicrochip: animal.microchip,
          tutorName: client.name,
          tutorAddress: formatAddress(client),
          tutorDocument: client.identificationNumber,
          tutorPhone: client.mainPhoneContact,
          medications: currentPrescriptionMedications, // Passar vazio se for manipulada
          generalObservations: currentPrescriptionGeneralObservations,
          showElectronicSignatureText: false,
          prescriptionType: prescriptionType,
          pharmacistName: pharmacistName,
          pharmacistCpf: pharmacistCpf,
          pharmacistCfr: pharmacistCfr,
          pharmacistAddress: pharmacistAddress,
          pharmacistPhone: pharmacistPhone,
          manipulatedPrescription: manipulatedPrescriptionData, // Passar dados da manipulada
          userProfile: currentUserProfile,
        })
      );
      await openPdf({
        blob,
        fileName: `receita_${animal.name}_${client.name}_${new Date().toISOString().split("T")[0]}.pdf`,
        persistOptions: { folder: "prescriptions" },
      });
    } catch (error) {
      console.error("Erro ao imprimir a receita:", error);
      toast.error("Erro ao gerar PDF para impressão. Verifique o console para detalhes.");
    }
  };

  const handleSavePdf = async () => {
    if (prescriptionType !== 'manipulated' && currentPrescriptionMedications.length === 0) {
      toast.error("Adicione pelo menos um medicamento para salvar a receita em PDF.");
      return;
    }
    if (prescriptionType === 'manipulated' && !manipulatedPrescriptionData) {
      toast.error("Preencha os dados da receita manipulada antes de salvar em PDF.");
      return;
    }

    try {
      const blob = await createPdfBlob(
        PrescriptionPdfContent({
          animalName: animal.name,
          animalId: animal.id,
          animalSpecies: animal.species,
          animalBreed: animal.breed,
          animalSex: animal.gender,
          animalBirthday: animal.birthday,
          animalWeight: animal.weight,
          animalMicrochip: animal.microchip,
          tutorName: client.name,
          tutorAddress: formatAddress(client),
          tutorDocument: client.identificationNumber,
          tutorPhone: client.mainPhoneContact,
          medications: currentPrescriptionMedications, // Passar vazio se for manipulada
          generalObservations: currentPrescriptionGeneralObservations,
          showElectronicSignatureText: true,
          prescriptionType: prescriptionType,
          pharmacistName: pharmacistName,
          pharmacistCpf: pharmacistCpf,
          pharmacistCfr: pharmacistCfr,
          pharmacistAddress: pharmacistAddress,
          pharmacistPhone: pharmacistPhone,
          manipulatedPrescription: manipulatedPrescriptionData, // Passar dados da manipulada
          userProfile: currentUserProfile,
        })
      );
      await downloadPdf({
        blob,
        fileName: `receita_${animal.name}_${client.name}_${new Date().toISOString().split("T")[0]}.pdf`,
        persistOptions: { folder: "prescriptions" },
      });

      toast.success("Receita salva em PDF com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar a receita em PDF:", error);
      toast.error("Erro ao gerar PDF para download. Verifique o console para detalhes.");
    }
  };

  const getPrescriptionTitle = () => {
    const baseTitle = prescriptionId ? "Editar Receita" : "Adicionar Nova Receita";
    let typeText = '';
    if (prescriptionType === 'simple') typeText = 'Simples';
    else if (prescriptionType === 'controlled') typeText = 'Controlada';
    else if (prescriptionType === 'manipulated') typeText = 'Manipulada';
    return `${baseTitle} (${typeText}) para ${animal?.name ?? "animal"}`;
  };

  // Condição para desabilitar os botões de impressão/salvamento
  const isPrintSaveDisabled = (prescriptionType !== 'manipulated' && currentPrescriptionMedications.length === 0) || (prescriptionType === 'manipulated' && !manipulatedPrescriptionData);

  if (clientLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Carregando cliente e animal...</p>
      </div>
    );
  }
  if (clientError || !client || !animal) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Animal ou Cliente não encontrado.</h1>
        <Link to="/clients">
          <Button variant="outline">
            <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={getPrescriptionTitle()}
        description={`Gerencie os detalhes da receita para ${animal.name}.`}
        icon={ClipboardList}
        module="clinical"
        breadcrumb={
          <>
            Painel &gt; <Link to="/clients" className="hover:text-primary">Clientes</Link> &gt; <Link to={`/clients/${client.id}`} className="hover:text-primary">{client.name}</Link> &gt; <Link to={`/clients/${clientId}/animals/${animalId}/record`} className="hover:text-primary">{animal.name}</Link> &gt; Receita
          </>
        }
        actions={
          <Link to={`/clients/${clientId}/animals/${animalId}/record`}>
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Prontuário
            </Button>
          </Link>
        }
      />

      <div>
        <div className="flex flex-col lg:flex-row gap-1">
          <div className="flex-1 lg:pr-2">
            <div className="grid gap-1 py-1">
              <Card className="vf-surface-card vf-tone-clinical card-hover mb-1 rounded-xl border border-border/80">
            <CardHeader>
              <CardTitle>Descrição do Tratamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
              <Label htmlFor="treatmentDescription">Tratamento (Ex: Tratamento de Anemia)</Label>
                <Input
                  id="treatmentDescription"
                  placeholder="Ex: Tratamento de Anemia"
                  value={treatmentDescription}
                  onChange={(e) => setTreatmentDescription(e.target.value)}
                  className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200 h-10"
                />
              </div>
            </CardContent>
          </Card>

          {prescriptionType === 'manipulated' ? (
            <PrescriptionManipulatedForm
              initialData={manipulatedPrescriptionData}
              onSave={handleSaveManipulatedPrescription}
            />
          ) : (
            <Card className="vf-surface-card vf-tone-clinical card-hover mb-1 rounded-xl border border-border/80">
              <CardHeader>
                <CardTitle>Medicamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentPrescriptionMedications.length === 0 && (
                  <p className="text-muted-foreground">Nenhum medicamento adicionado ainda.</p>
                )}
                {currentPrescriptionMedications.map((med, index) => (
                  <PrescriptionMedicationForm
                    key={med.id}
                    medication={med}
                    index={index}
                    onSave={handleSaveMedication}
                    onDelete={handleDeleteMedication}
                    onToggleCollapse={handleToggleMedicationCollapse}
                  />
                ))}
                <Button onClick={handleAddMedication} className="w-full bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
                  <FaPlus className="mr-2 h-4 w-4" /> Adicionar Medicamento
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Observações Gerais da Receita (este campo será preenchido pelo estado de manipulatedPrescriptionData.generalObservations se for manipulada) */}
          {prescriptionType !== 'manipulated' && (
            <Card className="vf-surface-card vf-tone-clinical card-hover rounded-xl border border-border/80">
              <CardHeader>
                <CardTitle>Observações Gerais da Receita</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="prescriptionGeneralObservations"
                  placeholder="Instruções especiais, restrições alimentares, ou outras observações para a receita..."
                  rows={5}
                  value={currentPrescriptionGeneralObservations}
                  onChange={(e) => setCurrentPrescriptionGeneralObservations(e.target.value)}
                  className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                />
              </CardContent>
            </Card>
          )}
 
            </div>
          </div>

          {prescriptionType !== 'manipulated' && (
            <aside className="hidden lg:block lg:w-[35%] lg:pl-2 lg:ml-2">
              <Card className="vf-surface-card vf-tone-clinical card-hover sticky top-2 rounded-xl border border-border/80">
            <CardHeader>
              <CardTitle className="text-sm">Prévia da Receita</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2 p-3">
                  {currentPrescriptionMedications.length === 0 ? (
                    <p>Nenhum medicamento adicionado.</p>
                  ) : (
                    <>
                      {Object.entries(currentPrescriptionMedications.reduce((acc, med) => {
                        const key = med.useType || "OUTROS";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(med);
                        return acc;
                      }, {} as Record<string, typeof currentPrescriptionMedications>)).map(([via, meds]) => (
                        <div key={via} className="mb-3">
                          <p className="font-semibold text-foreground mb-2 border-b border-border pb-2">{via.toUpperCase()}</p>
                          <div className="space-y-3 text-sm">
                            {meds.map((med, idx) => (
                              <div key={med.id}>
                                <div className="flex items-end">
                                  <span className="flex-shrink-0">{idx + 1}) {med.medicationName}{med.concentration ? ` ${med.concentration}` : ""}</span>
                                  <span className="flex-grow border-b border-dotted border-muted-foreground mx-2 h-3"></span>
                                  <span className="flex-shrink-0 text-sm">{med.totalQuantityDisplay || med.totalQuantity || ""}</span>
                                </div>
                                {med.generatedInstructions && <div className="mt-1 text-sm">{med.generatedInstructions}</div>}
                                {med.generalObservations && <div className="mt-1 text-sm">Obs.: {med.generalObservations}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </aside>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 p-4 bg-card/80 backdrop-blur-sm border-t border-border sticky bottom-0 z-10">
        <Button variant="outline" onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/record`)} className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">
          <FaTimes className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button onClick={handleSavePrescription} disabled={isPrintSaveDisabled} className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">
          <FaSave className="mr-2 h-4 w-4" /> Salvar Receita
        </Button>
      </div>

      {/* AlertDialog para Receita Controlada */}
      <AlertDialog open={isControlledMedicationWarningOpen} onOpenChange={setIsControlledMedicationWarningOpen}>
        <AlertDialogContent className="shadow-sm border border-border rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-foreground">Receita Controlada: Múltiplos Medicamentos</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Receitas controladas geralmente permitem apenas um medicamento por formulário. Deseja adicionar mais de um medicamento mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border border-border text-foreground hover:bg-muted rounded-md transition-all duration-200 shadow-sm hover:shadow-md">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddMultipleMedications} className="rounded-md bg-[hsl(var(--vf-clinical))] font-semibold text-white transition-all duration-200 shadow-md hover:bg-[hsl(var(--vf-clinical)/0.9)] hover:shadow-lg">Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default AddPrescriptionPage;