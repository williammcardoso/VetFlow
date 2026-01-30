import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import PatientAppointmentsTab from "@/components/patient/appointments/PatientAppointmentsTab";
import PatientVaccinesTab from "@/components/patient/vaccines/PatientVaccinesTab";

import { formatDateTime } from "@/lib/utils";
import { mockClients, updateAnimalDetails } from "@/mockData/clients";
import { mockAppointments } from "@/mockData/appointments";
import { mockExams } from "@/mockData/exams";
import { mockPrescriptions } from "@/mockData/prescriptions";

import type { Animal, Client, WeightEntry } from "@/types/client";
import type { AppointmentEntry } from "@/types/appointment";
import type { ExamEntry } from "@/types/exam";
import type { PrescriptionEntry } from "@/types/medication";

import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  FileText,
  FlaskConical,
  Stethoscope,
  Syringe,
  Weight as WeightIcon,
} from "lucide-react";

type TimelineType = "Atendimento" | "Exame" | "Receita" | "Peso" | "Observação" | "Documento" | "Vacina";

type TimelineEvent = {
  id: string;
  date: string;
  time?: string;
  type: TimelineType;
  title: string;
  description?: string;
  onView?: () => void;
};

type DocumentEntry = {
  id: string;
  date: string;
  time: string;
  name: string;
  fileUrl: string;
};

type ObservationEntry = {
  id: string;
  date: string;
  time: string;
  text: string;
};

const calcAgeLabel = (birthday?: string) => {
  if (!birthday) return "-";
  const birthDate = new Date(birthday);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  if (age <= 0) return "Menos de 1 ano";
  return age === 1 ? "1 ano" : `${age} anos`;
};

const PatientRecordPage = () => {
  const { clientId, animalId } = useParams<{ clientId: string; animalId: string }>();
  const navigate = useNavigate();

  const [currentClient, setCurrentClient] = useState<Client | undefined>(undefined);
  const [currentAnimal, setCurrentAnimal] = useState<Animal | undefined>(undefined);

  const refreshFromMock = () => {
    const c = mockClients.find((x) => x.id === clientId);
    const a = c?.animals.find((x) => x.id === animalId);
    setCurrentClient(c);
    setCurrentAnimal(a);
  };

  useEffect(() => {
    refreshFromMock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, animalId]);

  const animalAppointments = useMemo<AppointmentEntry[]>(
    () => mockAppointments.filter((a) => a.animalId === animalId),
    [animalId]
  );

  const exams = useMemo<ExamEntry[]>(() => [...mockExams], []);
  const prescriptions = useMemo<PrescriptionEntry[]>(() => [...mockPrescriptions], []);

  const weightHistory = currentAnimal?.weightHistory || [];
  const sortedWeightHistory = useMemo(() => {
    return [...weightHistory].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
  }, [weightHistory]);

  const latestWeight = sortedWeightHistory[0]?.weight ?? currentAnimal?.weight;

  const [activeTab, setActiveTab] = useState<string>("timeline");

  const [newWeightDate, setNewWeightDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newWeight, setNewWeight] = useState<string>("");

  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<WeightEntry | null>(null);

  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);

  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [newObservation, setNewObservation] = useState("");

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    animalAppointments.forEach((a) => {
      events.push({
        id: `app-${a.id}`,
        date: a.date,
        time: a.time,
        type: a.type === "Vacina" ? "Vacina" : "Atendimento",
        title: `${a.type} • ${a.vet}`,
        description: a.observacoesGerais || "",
        onView: () => navigate(`/clients/${clientId}/animals/${animalId}/view-appointment/${a.id}`),
      });
    });

    exams.forEach((e) => {
      events.push({
        id: `exam-${e.id}`,
        date: e.date,
        time: e.time,
        type: "Exame",
        title: e.type,
        description: e.result || e.nota || "",
        onView: () => navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${e.id}`),
      });
    });

    prescriptions.forEach((p) => {
      events.push({
        id: `rx-${p.id}`,
        date: p.date,
        time: p.time,
        type: "Receita",
        title: p.treatmentDescription || p.medicationName || "Receita",
        description: p.instructions,
        onView: () => navigate(`/clients/${clientId}/animals/${animalId}/edit-prescription/${p.id}?type=${p.type}`),
      });
    });

    sortedWeightHistory.forEach((w) => {
      events.push({
        id: `weight-${w.id}`,
        date: w.date,
        time: w.time,
        type: "Peso",
        title: `${w.weight.toFixed(2)} kg`,
        description: w.source,
        onView: () => {
          setSelectedWeight(w);
          setWeightModalOpen(true);
        },
      });
    });

    documents.forEach((d) => {
      events.push({
        id: `doc-${d.id}`,
        date: d.date,
        time: d.time,
        type: "Documento",
        title: d.name,
        onView: () => window.open(d.fileUrl, "_blank"),
      });
    });

    observations.forEach((o) => {
      events.push({
        id: `obs-${o.id}`,
        date: o.date,
        time: o.time,
        type: "Observação",
        title: o.text,
      });
    });

    return events.sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return db - da;
    });
  }, [animalAppointments, animalId, clientId, documents, exams, navigate, observations, prescriptions, sortedWeightHistory]);

  if (!clientId || !animalId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Parâmetros inválidos.</p>
      </div>
    );
  }

  if (!currentClient || !currentAnimal) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Paciente não encontrado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">Não foi possível localizar este cliente/animal.</p>
              <Link to="/clients">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const TabIcon = ({ tab }: { tab: string }) => {
    switch (tab) {
      case "timeline":
        return <ClipboardList className="h-4 w-4 mr-2" />;
      case "appointments":
        return <Stethoscope className="h-4 w-4 mr-2" />;
      case "vaccines":
        return <Syringe className="h-4 w-4 mr-2" />;
      case "weight":
        return <WeightIcon className="h-4 w-4 mr-2" />;
      case "exams":
        return <FlaskConical className="h-4 w-4 mr-2" />;
      case "prescriptions":
        return <FileText className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground truncate">Prontuário</h1>
          <p className="text-sm text-muted-foreground truncate">
            {currentAnimal.name} • Tutor: {currentClient.name}
          </p>
        </div>

        <Link to={`/clients/${currentClient.id}`}>
          <Button variant="outline" className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Espécie</div>
              <div className="font-medium text-foreground">{currentAnimal.species || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Raça</div>
              <div className="font-medium text-foreground">{currentAnimal.breed || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sexo</div>
              <div className="font-medium text-foreground">{currentAnimal.gender || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Idade / Peso</div>
              <div className="font-medium text-foreground">
                {calcAgeLabel(currentAnimal.birthday)} • {latestWeight ? `${latestWeight.toFixed(1)} kg` : "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-1 h-auto">
          <TabsTrigger value="timeline">
            <TabIcon tab="timeline" /> Linha do tempo
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <TabIcon tab="appointments" /> Atendimentos
          </TabsTrigger>
          <TabsTrigger value="vaccines">
            <TabIcon tab="vaccines" /> Vacinas
          </TabsTrigger>
          <TabsTrigger value="weight">
            <TabIcon tab="weight" /> Peso
          </TabsTrigger>
          <TabsTrigger value="exams">
            <TabIcon tab="exams" /> Exames
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <TabIcon tab="prescriptions" /> Receitas
          </TabsTrigger>
          <TabsTrigger value="observations">Observações</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linha do tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento para exibir.</p>
              ) : (
                timelineEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={ev.onView}
                    disabled={!ev.onView}
                    className="w-full text-left rounded-lg border border-border bg-white p-3 hover:bg-muted/30 transition-colors disabled:opacity-100 disabled:hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5">
                            {ev.type}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {formatDateTime(ev.date, ev.time)}
                          </span>
                        </div>
                        <div className="mt-1 font-medium text-foreground line-clamp-2">{ev.title}</div>
                        {ev.description ? (
                          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{ev.description}</div>
                        ) : null}
                      </div>
                      {ev.onView ? <span className="text-xs text-muted-foreground">Ver</span> : null}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <PatientAppointmentsTab
            clientId={clientId}
            animalId={animalId}
            animalAppointments={animalAppointments}
            setAnimalAppointments={() => {
              // PatientAppointmentsTab gerencia mock por conta própria em outras telas.
              // Aqui, só mantemos a página estável.
              refreshFromMock();
            }}
          />
        </TabsContent>

        <TabsContent value="vaccines" className="mt-4">
          <PatientVaccinesTab
            clientId={clientId}
            animalId={animalId}
            animalAppointments={animalAppointments}
            setAnimalAppointments={() => {
              refreshFromMock();
            }}
          />
        </TabsContent>

        <TabsContent value="weight" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de peso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[160px_160px_auto] gap-2 items-end">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={newWeightDate} onChange={(e) => setNewWeightDate(e.target.value)} />
                </div>
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Ex.: 12.5"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      const parsed = Number(newWeight);
                      if (!newWeightDate || !newWeight || Number.isNaN(parsed) || parsed <= 0) {
                        toast.error("Informe data e peso válidos.");
                        return;
                      }

                      const ok = updateAnimalDetails(
                        clientId,
                        animalId,
                        { weight: parsed, lastWeightSource: "Manual" },
                        {
                          date: newWeightDate,
                          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                        }
                      );

                      if (!ok) {
                        toast.error("Não foi possível salvar o peso.");
                        return;
                      }

                      setNewWeight("");
                      setNewWeightDate(new Date().toISOString().split("T")[0]);
                      refreshFromMock();
                      toast.success("Peso adicionado!");
                    }}
                    disabled={!newWeight.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {sortedWeightHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro de peso.</p>
              ) : (
                <div className="space-y-2">
                  {sortedWeightHistory.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setSelectedWeight(w);
                        setWeightModalOpen(true);
                      }}
                      className="w-full text-left rounded-lg border border-border bg-white p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-foreground">{w.weight.toFixed(2)} kg</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTime(w.date, w.time)} • {w.source}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">Ver</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exames</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exams.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum exame registrado.</p>
              ) : (
                exams.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${e.id}`)}
                    className="w-full text-left rounded-lg border border-border bg-white p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="font-medium text-foreground">{e.type}</div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(e.date, e.time)} • {e.vet}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma receita registrada.</p>
              ) : (
                prescriptions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/clients/${clientId}/animals/${animalId}/edit-prescription/${p.id}?type=${p.type}`)}
                    className="w-full text-left rounded-lg border border-border bg-white p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="font-medium text-foreground line-clamp-2">
                      {p.treatmentDescription || p.medicationName || "Receita"}
                    </div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(p.date, p.time)} • {p.type}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Nova observação</Label>
                <Textarea value={newObservation} onChange={(e) => setNewObservation(e.target.value)} />
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      const txt = newObservation.trim();
                      if (!txt) return;
                      const now = new Date();
                      setObservations((prev) => [
                        {
                          id: `obs-${Date.now()}`,
                          date: now.toISOString().split("T")[0],
                          time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                          text: txt,
                        },
                        ...prev,
                      ]);
                      setNewObservation("");
                      toast.success("Observação adicionada!");
                    }}
                    disabled={!newObservation.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {observations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {observations.map((o) => (
                    <div key={o.id} className="rounded-lg border border-border bg-white p-3">
                      <div className="text-sm text-muted-foreground">{formatDateTime(o.date, o.time)}</div>
                      <div className="mt-1 font-medium text-foreground whitespace-pre-wrap">{o.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label>Nome</Label>
                  <Input value={newDocumentName} onChange={(e) => setNewDocumentName(e.target.value)} />
                </div>
                <div>
                  <Label>Arquivo</Label>
                  <Input type="file" onChange={(e) => setNewDocumentFile(e.target.files?.[0] || null)} />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (!newDocumentName.trim() || !newDocumentFile) {
                        toast.error("Informe nome e arquivo.");
                        return;
                      }
                      const now = new Date();
                      const entry: DocumentEntry = {
                        id: `doc-${Date.now()}`,
                        date: now.toISOString().split("T")[0],
                        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                        name: newDocumentName.trim(),
                        fileUrl: URL.createObjectURL(newDocumentFile),
                      };
                      setDocuments((prev) => [entry, ...prev]);
                      setNewDocumentName("");
                      setNewDocumentFile(null);
                      toast.success("Documento adicionado!");
                    }}
                    disabled={!newDocumentName.trim() || !newDocumentFile}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => window.open(d.fileUrl, "_blank")}
                      className="w-full text-left rounded-lg border border-border bg-white p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-medium text-foreground">{d.name}</div>
                      <div className="text-sm text-muted-foreground">{formatDateTime(d.date, d.time)}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={weightModalOpen} onOpenChange={setWeightModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro de peso</DialogTitle>
            <DialogDescription>Detalhes do registro selecionado.</DialogDescription>
          </DialogHeader>

          {selectedWeight ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Peso</span>
                <span className="font-semibold text-foreground">{selectedWeight.weight.toFixed(2)} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium text-foreground">{formatDateTime(selectedWeight.date, selectedWeight.time)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Origem</span>
                <span className="font-medium text-foreground">{selectedWeight.source || "-"}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum registro selecionado.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWeightModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientRecordPage;
