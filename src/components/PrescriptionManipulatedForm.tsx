"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaPlus, FaFlask, FaPills, FaVial, FaFileMedical, FaInfoCircle, FaSave } from "react-icons/fa";
import {
  ManipulatedFormulaComponent,
  ManipulatedVehicleExcipient,
  ManipulatedPosology,
  ManipulatedPosologyAutomatic,
  ManipulatedPosologyFreeText,
  ManipulatedProductDetails,
  ManipulatedPrescriptionData,
} from "@/types/medication";
import ManipulatedFormulaComponentForm from "./ManipulatedFormulaComponentForm";
import { toast } from "sonner";

interface PrescriptionManipulatedFormProps {
  initialData?: ManipulatedPrescriptionData;
  onSave: (data: ManipulatedPrescriptionData) => void;
}

const mockVehicleTypes = ["bastão(s)", "cápsula(s)", "comprimido(s)", "creme(s)", "drágea(s)", "gel(es)", "gotas", "líquido(s)", "pó(s)", "dose(s)", "outro(s)"];
const mockVehicleUnits = ["%", "grama(s) (g)", "miligrama(s) (mg)", "mililitro(s) (mL)", "micrograma(s) (mcg)", "ufc", "ufc/g", "ufc/kg", "unidade(s)"];

const mockPosologyMeasures = ["Comprimido", "Cápsula", "Líquido (ml)", "Gotas", "Aplicação", "Spray", "Pomada", "Outro"];
const mockPosologyFrequencies = ["1", "2", "3", "4", "6", "8", "12", "24", "Outro"]; // Valores numéricos
const mockPosologyFrequencyUnits = ["Hora(s)", "Dia(s)", "Outro"];
const mockPosologyDurations = ["1", "3", "5", "7", "10", "14", "21", "30", "Outro"]; // Valores numéricos
const mockPosologyDurationUnits = ["Dia(s)", "Mês(es)", "Outro"];

const mockProductRoutes = ["Oral", "Tópica", "Injetável", "Oftálmica", "Auricular", "Outra"];

// Helper para abreviar unidades para a prévia
const getShortUnitAbbreviation = (unit: string): string => {
  switch (unit) {
    case "Grama (g)": return "g";
    case "Miligrama (mg)": return "mg";
    case "Mililitro (mL)": return "mL";
    case "Micrograma (mcg)": return "mcg";
    case "Unidade(s)": return "un";
    case "%": return "%";
    case "UFC": return "UFC";
    case "UFC/g": return "UFC/g";
    case "UFC/kg": return "UFC/kg";
    default: return unit;
  }
};

const PrescriptionManipulatedForm: React.FC<PrescriptionManipulatedFormProps> = ({
  initialData,
  onSave,
}) => {
  const [formulaComponents, setFormulaComponents] = useState<ManipulatedFormulaComponent[]>(
    initialData?.formulaComponents || [{ id: `comp-${Date.now()}`, name: "", dosageQuantity: "", dosageUnit: "" }]
  );
  const [lastAddedComponentId, setLastAddedComponentId] = useState<string | null>(null); // Estado para focar o último componente adicionado

  const [vehicleExcipient, setVehicleExcipient] = useState<ManipulatedVehicleExcipient>(
    initialData?.vehicleExcipient || { type: "Excipiente", quantity: "", unit: "" }
  );
  const [customVehicleType, setCustomVehicleType] = useState<string>(
    initialData?.vehicleExcipient?.type === "Outro" ? initialData.vehicleExcipient.customType || "" : ""
  );

  const [posologyType, setPosologyType] = useState<'automatic' | 'freeText'>(
    initialData?.posology.type || 'automatic'
  );
  const [posologyAutomatic, setPosologyAutomatic] = useState<ManipulatedPosologyAutomatic>(
    (initialData?.posology.type === 'automatic' ? initialData.posology.data : {
      dosage: "", measure: "", frequencyValue: "", frequencyUnit: "", durationValue: "", durationUnit: "", finalDescription: ""
    })
  );
  const [customPosologyMeasure, setCustomPosologyMeasure] = useState<string>(
    initialData?.posology.type === 'automatic' && initialData.posology.data.measure === "Outro" ? initialData.posology.data.customMeasure || "" : ""
  );
  const [customPosologyFrequencyValue, setCustomPosologyFrequencyValue] = useState<string>(
    initialData?.posology.type === 'automatic' && initialData.posology.data.frequencyValue === "Outro" ? initialData.posology.data.customFrequencyValue || "" : ""
  );
  const [customPosologyFrequencyUnit, setCustomPosologyFrequencyUnit] = useState<string>(
    initialData?.posology.type === 'automatic' && initialData.posology.data.frequencyUnit === "Outro" ? initialData.posology.data.customFrequencyUnit || "" : ""
  );
  const [customPosologyDurationValue, setCustomPosologyDurationValue] = useState<string>(
    initialData?.posology.type === 'automatic' && initialData.posology.data.durationValue === "Outro" ? initialData.posology.data.customDurationValue || "" : ""
  );
  const [customPosologyDurationUnit, setCustomPosologyDurationUnit] = useState<string>(
    initialData?.posology.type === 'automatic' && initialData.posology.data.durationUnit === "Outro" ? initialData.posology.data.customDurationUnit || "" : ""
  );

  const [posologyFreeText, setPosologyFreeText] = useState<ManipulatedPosologyFreeText>(
    (initialData?.posology.type === 'freeText' ? initialData.posology.data : { finalDescription: "" })
  );
  const [productDetails, setProductDetails] = useState<ManipulatedProductDetails>(
    initialData?.productDetails || { productType: "", quantity: "", pharmacy: "", route: "" }
  );
  const [customProductRoute, setCustomProductRoute] = useState<string>(
    initialData?.productDetails?.route === "Outra" ? initialData.productDetails.customRoute || "" : ""
  );
  const [generalObservations, setGeneralObservations] = useState<string>(initialData?.generalObservations || "");

  // Refs para os campos de input personalizados
  const customVehicleTypeInputRef = useRef<HTMLInputElement>(null);
  const customPosologyMeasureInputRef = useRef<HTMLInputElement>(null);
  const customPosologyFrequencyValueInputRef = useRef<HTMLInputElement>(null);
  const customPosologyFrequencyUnitInputRef = useRef<HTMLInputElement>(null);
  const customPosologyDurationValueInputRef = useRef<HTMLInputElement>(null);
  const customPosologyDurationUnitInputRef = useRef<HTMLInputElement>(null);
  const customProductRouteInputRef = useRef<HTMLInputElement>(null);

  // Efeito para focar o último componente adicionado
  useEffect(() => {
    if (lastAddedComponentId) {
      // O foco real é acionado no componente filho via `shouldFocus` prop.
      // Limpamos o estado aqui para que o foco só ocorra uma vez por adição.
      setLastAddedComponentId(null);
    }
  }, [formulaComponents, lastAddedComponentId]);

  // Efeitos para focar os campos personalizados quando "Outro" é selecionado
  useEffect(() => {
    if (vehicleExcipient.type === "Outro" && customVehicleTypeInputRef.current) {
      setTimeout(() => customVehicleTypeInputRef.current?.focus(), 0);
    }
  }, [vehicleExcipient.type]);

  useEffect(() => {
    if (posologyAutomatic.measure === "Outro" && customPosologyMeasureInputRef.current) {
      setTimeout(() => customPosologyMeasureInputRef.current?.focus(), 0);
    }
  }, [posologyAutomatic.measure]);

  useEffect(() => {
    if (posologyAutomatic.frequencyValue === "Outro" && customPosologyFrequencyValueInputRef.current) {
      setTimeout(() => customPosologyFrequencyValueInputRef.current?.focus(), 0);
    }
  }, [posologyAutomatic.frequencyValue]);

  useEffect(() => {
    if (posologyAutomatic.frequencyUnit === "Outro" && customPosologyFrequencyUnitInputRef.current) {
      setTimeout(() => customPosologyFrequencyUnitInputRef.current?.focus(), 0);
    }
  }, [posologyAutomatic.frequencyUnit]);

  useEffect(() => {
    if (posologyAutomatic.durationValue === "Outro" && customPosologyDurationValueInputRef.current) {
      setTimeout(() => customPosologyDurationValueInputRef.current?.focus(), 0);
    }
  }, [posologyAutomatic.durationValue]);

  useEffect(() => {
    if (posologyAutomatic.durationUnit === "Outro" && customPosologyDurationUnitInputRef.current) {
      setTimeout(() => customPosologyDurationUnitInputRef.current?.focus(), 0);
    }
  }, [posologyAutomatic.durationUnit]);

  useEffect(() => {
    if (productDetails.route === "Outra" && customProductRouteInputRef.current) {
      setTimeout(() => customProductRouteInputRef.current?.focus(), 0);
    }
  }, [productDetails.route]);


  // Sincronizar customVehicleType quando vehicleExcipient.type muda
  useEffect(() => {
    if (vehicleExcipient.type !== "Outro") {
      setCustomVehicleType("");
    } else if (initialData?.vehicleExcipient?.type === "Outro" && initialData.vehicleExcipient.customType) {
      setCustomVehicleType(initialData.vehicleExcipient.customType);
    }
  }, [vehicleExcipient.type, initialData]);

  // Sincronizar customPosologyMeasure quando posologyAutomatic.measure muda
  useEffect(() => {
    if (posologyAutomatic.measure !== "Outro") {
      setCustomPosologyMeasure("");
    } else if (initialData?.posology.type === 'automatic' && initialData.posology.data.measure === "Outro" && initialData.posology.data.customMeasure) {
      setCustomPosologyMeasure(initialData.posology.data.customMeasure);
    }
  }, [posologyAutomatic.measure, initialData]);

  // Sincronizar customPosologyFrequencyValue quando posologyAutomatic.frequencyValue muda
  useEffect(() => {
    if (posologyAutomatic.frequencyValue !== "Outro") {
      setCustomPosologyFrequencyValue("");
    } else if (initialData?.posology.type === 'automatic' && initialData.posology.data.frequencyValue === "Outro" && initialData.posology.data.customFrequencyValue) {
      setCustomPosologyFrequencyValue(initialData.posology.data.customFrequencyValue);
    }
  }, [posologyAutomatic.frequencyValue, initialData]);

  // Sincronizar customPosologyFrequencyUnit quando posologyAutomatic.frequencyUnit muda
  useEffect(() => {
    if (posologyAutomatic.frequencyUnit !== "Outro") {
      setCustomPosologyFrequencyUnit("");
    } else if (initialData?.posology.type === 'automatic' && initialData.posology.data.frequencyUnit === "Outro" && initialData.posology.data.customFrequencyUnit) {
      setCustomPosologyFrequencyUnit(initialData.posology.data.customFrequencyUnit);
    }
  }, [posologyAutomatic.frequencyUnit, initialData]);

  // Sincronizar customPosologyDurationValue quando posologyAutomatic.durationValue muda
  useEffect(() => {
    if (posologyAutomatic.durationValue !== "Outro") {
      setCustomPosologyDurationValue("");
    } else if (initialData?.posology.type === 'automatic' && initialData.posology.data.durationValue === "Outro" && initialData.posology.data.customDurationValue) {
      setCustomPosologyDurationValue(initialData.posology.data.customDurationValue);
    }
  }, [posologyAutomatic.durationValue, initialData]);

  // Sincronizar customPosologyDurationUnit quando posologyAutomatic.durationUnit muda
  useEffect(() => {
    if (posologyAutomatic.durationUnit !== "Outro") {
      setCustomPosologyDurationUnit("");
    } else if (initialData?.posology.type === 'automatic' && initialData.posology.data.durationUnit === "Outro" && initialData.posology.data.customDurationUnit) {
      setCustomPosologyDurationUnit(initialData.posology.data.customDurationUnit);
    }
  }, [posologyAutomatic.durationUnit, initialData]);

  // Sincronizar customProductRoute quando productDetails.route muda
  useEffect(() => {
    if (productDetails.route !== "Outra") {
      setCustomProductRoute("");
    } else if (initialData?.productDetails?.route === "Outra" && initialData.productDetails.customRoute) {
      setCustomProductRoute(initialData.productDetails.customRoute);
    }
  }, [productDetails.route, initialData]);


  // Auto-generate final description for automatic posology
  useEffect(() => {
    const { dosage, measure, frequencyValue, frequencyUnit, durationValue, durationUnit } = posologyAutomatic;

    const finalMeasure = measure === "Outro" ? customPosologyMeasure.trim() : measure.trim();
    const finalFrequencyValue = frequencyValue === "Outro" ? customPosologyFrequencyValue.trim() : frequencyValue.trim();
    const finalFrequencyUnit = frequencyUnit === "Outro" ? customPosologyFrequencyUnit.trim() : frequencyUnit.trim();
    const finalDurationValue = durationValue === "Outro" ? customPosologyDurationValue.trim() : durationValue.trim();
    const finalDurationUnit = durationUnit === "Outro" ? customPosologyDurationUnit.trim() : durationUnit.trim();

    let description = "";

    const doseText = dosage.trim();
    const measureText = finalMeasure.toLowerCase();
    const freqVal = finalFrequencyValue;
    const freqUnit = finalFrequencyUnit.toLowerCase();
    const durVal = finalDurationValue;
    const durUnit = finalDurationUnit.toLowerCase();

    if (doseText && measureText && freqVal && freqUnit && durVal && durUnit) {
      description = `Dar ${doseText} ${measureText}(s) a cada ${freqVal} ${freqUnit}, durante ${durVal} ${durUnit}.`;
    } else if (doseText && measureText && freqVal && freqUnit) {
      description = `Dar ${doseText} ${measureText}(s) a cada ${freqVal} ${freqUnit}.`;
    } else if (doseText && measureText) {
      description = `Dar ${doseText} ${measureText}(s).`;
    } else if (doseText) {
      description = `Dar ${doseText}.`;
    }
    setPosologyAutomatic(prev => ({ ...prev, finalDescription: description }));
  }, [
    posologyAutomatic.dosage, posologyAutomatic.measure, customPosologyMeasure,
    posologyAutomatic.frequencyValue, customPosologyFrequencyValue, posologyAutomatic.frequencyUnit, customPosologyFrequencyUnit,
    posologyAutomatic.durationValue, customPosologyDurationValue, posologyAutomatic.durationUnit, customPosologyDurationUnit
  ]);


  const handleAddComponent = () => {
    const newId = `comp-${Date.now()}`;
    setFormulaComponents((prev) => [
      ...prev,
      { id: newId, name: "", dosageQuantity: "", dosageUnit: "" },
    ]);
    setLastAddedComponentId(newId); // Define o ID do novo componente para focar
  };

  const handleUpdateComponent = (id: string, updatedComponent: Partial<ManipulatedFormulaComponent>) => {
    setFormulaComponents((prev) =>
      prev.map((comp) => (comp.id === id ? { ...comp, ...updatedComponent } : comp))
    );
  };

  const handleDeleteComponent = (id: string) => {
    setFormulaComponents((prev) => prev.filter((comp) => comp.id !== id));
  };

  const handleSave = () => {
    // Basic validation
    if (formulaComponents.some(comp => !comp.name.trim() || !comp.dosageQuantity.trim() || !comp.dosageUnit.trim())) {
      toast.error("Por favor, preencha todos os campos obrigatórios dos componentes da fórmula.");
      return;
    }
    
    const finalVehicleType = "Excipiente";
    if (!vehicleExcipient.quantity.trim() || !vehicleExcipient.unit.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios do veículo/excipiente.");
      return;
    }

    if (posologyType === 'automatic') {
      const finalMeasure = posologyAutomatic.measure === "Outro" ? customPosologyMeasure.trim() : posologyAutomatic.measure.trim();
      const finalFrequencyValue = posologyAutomatic.frequencyValue === "Outro" ? customPosologyFrequencyValue.trim() : posologyAutomatic.frequencyValue.trim();
      const finalFrequencyUnit = posologyAutomatic.frequencyUnit === "Outro" ? customPosologyFrequencyUnit.trim() : posologyAutomatic.frequencyUnit.trim();
      const finalDurationValue = posologyAutomatic.durationValue === "Outro" ? customPosologyDurationValue.trim() : posologyAutomatic.durationValue.trim();
      const finalDurationUnit = posologyAutomatic.durationUnit === "Outro" ? customPosologyDurationUnit.trim() : posologyAutomatic.durationUnit.trim();

      if (!posologyAutomatic.dosage.trim() || !finalMeasure || !finalFrequencyValue || !finalFrequencyUnit || !finalDurationValue || !finalDurationUnit) {
        toast.error("Por favor, preencha todos os campos obrigatórios da posologia automática.");
        return;
      }
    }
    if (posologyType === 'freeText' && !posologyFreeText.finalDescription.trim()) {
      toast.error("Por favor, preencha a descrição final da posologia em texto livre.");
      return;
    }
    
    const finalProductRoute = productDetails.route === "Outra" ? customProductRoute.trim() : productDetails.route.trim();
    if (!finalProductRoute) {
      toast.error("Por favor, preencha o campo 'Via' dos detalhes do produto.");
      return;
    }

    const dataToSave: ManipulatedPrescriptionData = {
      formulaComponents,
      vehicleExcipient: {
        type: "Excipiente",
        customType: undefined,
        quantity: vehicleExcipient.quantity,
        unit: vehicleExcipient.unit,
      },
      posology: posologyType === 'automatic' ? {
        type: 'automatic',
        data: {
          ...posologyAutomatic,
          customMeasure: posologyAutomatic.measure === "Outro" ? customPosologyMeasure.trim() : undefined,
          customFrequencyValue: posologyAutomatic.frequencyValue === "Outro" ? customPosologyFrequencyValue.trim() : undefined,
          customFrequencyUnit: posologyAutomatic.frequencyUnit === "Outro" ? customPosologyFrequencyUnit.trim() : undefined,
          customDurationValue: posologyAutomatic.durationValue === "Outro" ? customPosologyDurationValue.trim() : undefined,
          customDurationUnit: posologyAutomatic.durationUnit === "Outro" ? customPosologyDurationUnit.trim() : undefined,
        }
      } : { type: 'freeText', data: posologyFreeText },
      productDetails: {
        productType: "Manipulado", // Definido como fixo, pois é uma receita manipulada
        quantity: "1 unidade", // Definido como fixo, pois não há campo para isso
        pharmacy: "Farmácia de Manipulação", // Definido como fixo
        route: productDetails.route,
        customRoute: productDetails.route === "Outra" ? customProductRoute.trim() : undefined,
      },
      generalObservations,
    };
    onSave(dataToSave);
  };

  const displayVehicleType = "Excipiente";
  const displayPosologyMeasure = posologyAutomatic.measure === "Outro" ? customPosologyMeasure : posologyAutomatic.measure;
  const displayPosologyFrequencyValue = posologyAutomatic.frequencyValue === "Outro" ? customPosologyFrequencyValue : posologyAutomatic.frequencyValue;
  const displayPosologyFrequencyUnit = posologyAutomatic.frequencyUnit === "Outro" ? customPosologyFrequencyUnit : posologyAutomatic.frequencyUnit;
  const displayPosologyDurationValue = posologyAutomatic.durationValue === "Outro" ? customPosologyDurationValue : posologyAutomatic.durationValue;
  const displayPosologyDurationUnit = posologyAutomatic.durationUnit === "Outro" ? customPosologyDurationUnit : posologyAutomatic.durationUnit;
  const displayProductRoute = productDetails.route === "Outra" ? customProductRoute : productDetails.route;


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-1 lg:col-span-2 space-y-6">
        {/* Composição da Fórmula */}
        <Card className="vf-surface-card vf-tone-clinical rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaFlask className="h-5 w-5 text-primary" /> Composição da Fórmula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formulaComponents.map((comp, index) => (
              <ManipulatedFormulaComponentForm
                key={comp.id}
                component={comp}
                index={index}
                onUpdate={handleUpdateComponent}
                onDelete={handleDeleteComponent}
                shouldFocus={comp.id === lastAddedComponentId} // Passa a prop para o componente filho
              />
            ))}
            <Button onClick={handleAddComponent} variant="outline" className="w-full bg-card border border-border text-foreground hover:bg-muted transition-colors duration-200 shadow-sm hover:shadow-md">
              <FaPlus className="mr-2 h-4 w-4" /> Adicionar Componente
            </Button>
          </CardContent>
        </Card>

        {/* Veículo / Excipiente */}
        <Card className="vf-surface-card vf-tone-clinical rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaVial className="h-5 w-5 text-primary" /> Veículo / Excipiente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Tipo*</Label>
              <Input
                id="vehicle-type"
                value={"Excipiente"}
                readOnly
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-quantity">Quantidade / q.s.p*</Label>
              <Input
                id="vehicle-quantity"
                placeholder="Ex: 30"
                value={vehicleExcipient.quantity}
                onChange={(e) => setVehicleExcipient(prev => ({ ...prev, quantity: e.target.value }))}
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-unit">Unidade*</Label>
              <Select onValueChange={(value) => setVehicleExcipient(prev => ({ ...prev, unit: value }))} value={vehicleExcipient.unit}>
                <SelectTrigger
                  id="vehicle-unit"
                  className={`bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left`}
                >
                  <SelectValue placeholder="Ex: Comprimido" />
                </SelectTrigger>
                <SelectContent>
                  {mockVehicleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Posologia */}
        <Card className="vf-surface-card vf-tone-clinical rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaPills className="h-5 w-5 text-primary" /> Posologia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={posologyType} onValueChange={(value) => setPosologyType(value as 'automatic' | 'freeText')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted rounded-md p-1 mb-4">
                <TabsTrigger value="automatic" className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground">Automática</TabsTrigger>
                <TabsTrigger value="freeText" className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-200 text-muted-foreground">Texto Livre</TabsTrigger>
              </TabsList>
              <TabsContent value="automatic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="posology-dosage">Dosagem*</Label>
                    <Input
                      id="posology-dosage"
                      placeholder="Ex: 1"
                      value={posologyAutomatic.dosage}
                      onChange={(e) => setPosologyAutomatic(prev => ({ ...prev, dosage: e.target.value }))}
                      className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="posology-measure">Medida*</Label>
                    <Select onValueChange={(value) => setPosologyAutomatic(prev => ({ ...prev, measure: value }))} value={posologyAutomatic.measure}>
                      <SelectTrigger
                        id="posology-measure"
                        className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left"
                      >
                        <SelectValue placeholder="Ex: Comprimido" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockPosologyMeasures.map((measure) => (
                          <SelectItem key={measure} value={measure}>
                            {measure}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {posologyAutomatic.measure === "Outro" && (
                      <Input
                        ref={customPosologyMeasureInputRef} // Aplicar o ref aqui
                        placeholder="Digite a medida personalizada"
                        value={customPosologyMeasure}
                        onChange={(e) => setCustomPosologyMeasure(e.target.value)}
                        className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    )}
                  </div>
                  <div className="space-y-2 col-span-full md:col-span-1 lg:col-span-2"> {/* Ajustado para ocupar mais espaço */}
                    <Label htmlFor="posology-frequency-value">Frequência*</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => setPosologyAutomatic(prev => ({ ...prev, frequencyValue: value }))} value={posologyAutomatic.frequencyValue}>
                        <SelectTrigger
                          id="posology-frequency-value"
                          className="w-1/2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left"
                        >
                          <SelectValue placeholder="Ex: 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockPosologyFrequencies.map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {freq}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(value) => setPosologyAutomatic(prev => ({ ...prev, frequencyUnit: value }))} value={posologyAutomatic.frequencyUnit}>
                      <SelectTrigger
                        id="posology-frequency-unit"
                        className="w-1/2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left"
                      >
                        <SelectValue placeholder="Ex: Dia" />
                      </SelectTrigger>
                        <SelectContent>
                          {mockPosologyFrequencyUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {posologyAutomatic.frequencyValue === "Outro" && (
                      <Input
                        ref={customPosologyFrequencyValueInputRef} // Aplicar o ref aqui
                        placeholder="Digite o valor da frequência personalizada"
                        value={customPosologyFrequencyValue}
                        onChange={(e) => setCustomPosologyFrequencyValue(e.target.value)}
                        className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    )}
                    {posologyAutomatic.frequencyUnit === "Outro" && (
                      <Input
                        ref={customPosologyFrequencyUnitInputRef} // Aplicar o ref aqui
                        placeholder="Digite a unidade da frequência personalizada"
                        value={customPosologyFrequencyUnit}
                        onChange={(e) => setCustomPosologyFrequencyUnit(e.target.value)}
                        className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    )}
                  </div>
                  <div className="space-y-2 col-span-full md:col-span-1 lg:col-span-2"> {/* Ajustado para ocupar mais espaço */}
                    <Label htmlFor="posology-duration-value">Duração*</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => setPosologyAutomatic(prev => ({ ...prev, durationValue: value }))} value={posologyAutomatic.durationValue}>
                      <SelectTrigger
                        id="posology-duration-value"
                        className="w-1/2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left"
                      >
                        <SelectValue placeholder="Ex: 5" />
                      </SelectTrigger>
                        <SelectContent>
                          {mockPosologyDurations.map((duration) => (
                            <SelectItem key={duration} value={duration}>
                              {duration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(value) => setPosologyAutomatic(prev => ({ ...prev, durationUnit: value }))} value={posologyAutomatic.durationUnit}>
                        <SelectTrigger
                          id="posology-duration-unit"
                          className="w-1/2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left"
                        >
                          <SelectValue placeholder="Ex: Dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockPosologyDurationUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {posologyAutomatic.durationValue === "Outro" && (
                      <Input
                        ref={customPosologyDurationValueInputRef} // Aplicar o ref aqui
                        placeholder="Digite o valor da duração personalizada"
                        value={customPosologyDurationValue}
                        onChange={(e) => setCustomPosologyDurationValue(e.target.value)}
                        className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    )}
                    {posologyAutomatic.durationUnit === "Outro" && (
                      <Input
                        ref={customPosologyDurationUnitInputRef} // Aplicar o ref aqui
                        placeholder="Digite a unidade da duração personalizada"
                        value={customPosologyDurationUnit}
                        onChange={(e) => setCustomPosologyDurationUnit(e.target.value)}
                        className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                      />
                    )}
                  </div>
                </div>
                <div className="bg-muted/50 border border-border text-foreground p-3 rounded-md text-sm mt-4">
                  <p className="font-semibold mb-1">Descrição Final:</p>
                  <p>{posologyAutomatic.finalDescription || "Preencha os campos para gerar a descrição."}</p>
                </div>
              </TabsContent>
              <TabsContent value="freeText" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="posology-free-text">Descrição Final*</Label>
                  <Textarea
                    id="posology-free-text"
                    placeholder="Digite a posologia em texto livre..."
                    rows={5}
                    value={posologyFreeText.finalDescription}
                    onChange={(e) => setPosologyFreeText(prev => ({ ...prev, finalDescription: e.target.value }))}
                    className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Detalhes do Produto (apenas 'Via' agora) */}
        <Card className="vf-surface-card vf-tone-clinical rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaFileMedical className="h-5 w-5 text-primary" /> Detalhes do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-route">Via*</Label>
              <Select onValueChange={(value) => setProductDetails(prev => ({ ...prev, route: value }))} value={productDetails.route}>
              <SelectTrigger
                id="product-route"
                className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring transition-all duration-200 text-left"
              >
                <SelectValue placeholder="Selecione a via" />
              </SelectTrigger>
                <SelectContent>
                  {mockProductRoutes.map((route) => (
                    <SelectItem key={route} value={route}>
                      {route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productDetails.route === "Outra" && (
                <Input
                  ref={customProductRouteInputRef} // Aplicar o ref aqui
                  placeholder="Digite a via personalizada"
                  value={customProductRoute}
                  onChange={(e) => setCustomProductRoute(e.target.value)}
                  className="mt-2 bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
                />
              )}
            </div>
            {/* Campos removidos: Tipo de Produto, Quantidade, Farmácia */}
          </CardContent>
        </Card>

        {/* Observações Gerais da Receita Manipulada */}
        <Card className="vf-surface-card vf-tone-clinical rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FaInfoCircle className="h-5 w-5 text-muted-foreground" /> Observações Gerais da Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="manipulated-general-observations"
              placeholder="Adicione observações gerais para a receita manipulada..."
              rows={5}
              value={generalObservations}
              onChange={(e) => setGeneralObservations(e.target.value)}
              className="bg-input rounded-md border-border focus:ring-2 focus:ring-ring placeholder-muted-foreground transition-all duration-200"
            />
          </CardContent>
        </Card>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
            <FaSave className="h-4 w-4 mr-2" /> Salvar Dados da Receita
          </Button>
        </div>
      </div>

      {/* Prévia da Fórmula (Sidebar) */}
      <div className="col-span-1 lg:col-span-1">
        <Card className="sticky top-2 vf-surface-card vf-tone-clinical rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm">Prévia da Fórmula</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2 p-3">
            {displayProductRoute && (
              <div className="pb-2">
                <p className="font-semibold text-foreground mb-2 border-b border-border pb-2">VIA {displayProductRoute.toUpperCase()}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-foreground mb-2">Composição:</h4>
              {formulaComponents.length > 0 ? (
                <div className="space-y-1">
                  {formulaComponents.map((comp) => (
                    <div key={comp.id} className="flex items-end">
                      <span className="flex-shrink-0">{comp.name}</span>
                      <span className="flex-grow border-b border-dotted border-muted-foreground mx-1 h-3"></span>
                      <span className="flex-shrink-0">{comp.dosageQuantity} {getShortUnitAbbreviation(comp.dosageUnit)}</span>
                    </div>
                  ))}
                  {vehicleExcipient.quantity && vehicleExcipient.unit && (
                    <div className="flex items-end">
                      <span className="flex-shrink-0">{displayVehicleType} q.s.p.</span>
                      <span className="flex-grow border-b border-dotted border-muted-foreground mx-1 h-3"></span>
                      <span className="flex-shrink-0">{vehicleExcipient.quantity} {vehicleExcipient.unit}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p>Nenhum componente adicionado.</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Posologia:</h4>
              {posologyType === 'automatic' ? (
                <p>{posologyAutomatic.finalDescription || "Preencha a posologia automática."}</p>
              ) : (
                <p>{posologyFreeText.finalDescription || "Preencha a posologia em texto livre."}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrescriptionManipulatedForm;