import React from "react";
import { MedicationData } from "./PrescriptionMedicationForm";
import { FaUser } from "react-icons/fa";
import { mockCompanySettings } from "@/mockData/settings";

interface PrescriptionViewModalProps {
  animalName: string;
  animalId: string;
  /** ID de exibição em 4 dígitos (ex.: 0001). Se não informado, usa animalId. */
  displayId?: string;
  animalSpecies: string;
  tutorName: string;
  tutorAddress: string; // Adicionado para o endereço do tutor
  medications: MedicationData[];
  generalObservations: string;
}

const PrescriptionViewModal: React.FC<PrescriptionViewModalProps> = ({
  animalName,
  animalId,
  displayId,
  animalSpecies,
  tutorName,
  tutorAddress,
  medications,
  generalObservations,
}) => {
  const patientId = displayId ?? animalId;
  // Agrupar medicamentos por tipo de uso
  const groupedMedications = medications.reduce((acc, med) => {
    const useType = med.useType || "Outros";
    if (!acc[useType]) {
      acc[useType] = [];
    }
    acc[useType].push(med);
    return acc;
  }, {} as Record<string, MedicationData[]>);

  return (
    <div className="p-6 bg-card text-card-foreground border border-border rounded-lg">
      {/* Header da Clínica */}
      <div className="flex items-start justify-between mb-8 border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <FaUser className="h-10 w-10 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-bold">{mockCompanySettings.companyName}</h2>
            <p className="text-sm text-muted-foreground">CRMV {mockCompanySettings.crmv}</p>
            <p className="text-sm text-muted-foreground">Registro no MAPA {mockCompanySettings.mapaRegistration}</p>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{mockCompanySettings.address} - {mockCompanySettings.city} - CEP: {mockCompanySettings.zipCode}</p>
          <p>Telefone: {mockCompanySettings.phone}</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">Receita Simples</h1>

      {/* Informações do Animal e Tutor */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Animal</h3>
          <p className="text-sm text-muted-foreground">ID: {patientId}</p>
          <p className="text-sm">Nome: {animalName}</p>
          <p className="text-sm">Espécie: {animalSpecies}</p>
        </div>
        <div className="border border-border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Tutor</h3>
          <p className="text-sm text-muted-foreground">Nome: {tutorName}</p>
          <p className="text-sm text-muted-foreground">Endereço: {tutorAddress || "Não informado"}</p>
        </div>
      </div>

      {/* Lista de Medicamentos Agrupados */}
      {Object.keys(groupedMedications).map((useType) => (
        <div key={useType} className="mb-6">
          <h3 className="text-lg font-bold uppercase mb-3 border-b pb-2">{useType}</h3>
          <ol className="list-decimal list-inside space-y-4">
            {groupedMedications[useType].map((med) => (
              <li key={med.id} className="flex flex-col">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-base flex-shrink-0">
                    {med.medicationName} {med.concentration}
                  </span>
                  <div className="flex-grow border-b border-border mx-2"></div> {/* Esta é a linha */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 text-xs font-medium border border-border rounded-full bg-muted text-muted-foreground">
                      {med.pharmacyType === "Farmácia Veterinária" ? "VET" : "HUMANA"}
                    </span>
                    {med.totalQuantityDisplay && (
                      <span className="px-2 py-0.5 text-xs font-medium border border-border bg-primary/10 text-primary rounded-full">
                        {med.totalQuantityDisplay}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-4">
                  {med.generatedInstructions}
                </p>
                {med.generalObservations && (
                  <p className="text-xs text-muted-foreground ml-4 mt-1 italic">
                    Obs. Medicamento: {med.generalObservations}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {/* Observações Gerais da Receita */}
      {generalObservations && (
        <div className="mt-8 border-t pt-4">
          <h3 className="text-lg font-bold mb-2">Observações Gerais da Receita</h3>
          <p className="text-sm text-muted-foreground">{generalObservations}</p>
        </div>
      )}

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>Data: {new Date().toLocaleDateString()}</p>
        <p>Assinatura do Veterinário: _________________________</p>
      </div>
    </div>
  );
};

export default PrescriptionViewModal;