# Backup — Timeline do Prontuário (PatientRecordPage)

Este arquivo é um **backup manual** do trecho da *Linha do Tempo* do prontuário, para facilitar reverter mudanças visuais/comportamentais.

> Origem: `src/pages/PatientRecordPage.tsx` (TabsContent `value="timeline"`)

```tsx
<TabsContent value="timeline" className="mt-4">
  <Card className="premium-card">
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
        <FaClock className="h-4 w-4 text-muted-foreground" /> Linha do Tempo
      </CardTitle>
      <p className="text-sm text-muted-foreground">Eventos clínicos em ordem cronológica (escaneável)</p>
    </CardHeader>
    <CardContent className="pt-0">
      {sortedTimelineEvents.length > 0 ? (
        <div className="relative">
          <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-px bg-border/70" />
          <div className="space-y-5">
            {sortedTimelineEvents.map((event) => {
              const styles = getEventStyle(event.type);
              const iconClass = getEventIconClass(event.type);
              const isAlertObs = event.type === 'Observação' && !!event.isAlert;

              const getRecipeVariantClass = () => {
                const desc = (event.description || "").toLowerCase();
                if (desc.includes("controlada")) return "badge-soft-amber";
                if (desc.includes("manipulada")) return "badge-soft-teal";
                return "badge-soft-green";
              };
              const getRecipeDotClass = () => {
                const desc = (event.description || "").toLowerCase();
                if (desc.includes("controlada")) return "timeline-dot-amber";
                if (desc.includes("manipulada")) return "timeline-dot-teal";
                return "timeline-dot-green";
              };
              const getRecipeIconClass = () => {
                const desc = (event.description || "").toLowerCase();
                if (desc.includes("controlada")) return "icon-soft-amber";
                if (desc.includes("manipulada")) return "icon-soft-teal";
                return "icon-soft-green";
              };

              const getTitle = () => {
                if (event.type === 'Atendimento') {
                  return (event.description || "").split(":")[0]?.trim() || "Atendimento";
                }
                if (event.type === 'Exame') {
                  return (event.description || "").split(":")[0]?.trim() || "Exame";
                }
                if (event.type === 'Vacina') {
                  return (event.description || "").split(".")[0]?.trim() || "Vacina";
                }
                if (event.type === 'Receita') {
                  const after = (event.description || "").split(":").slice(1).join(":").trim();
                  return after || "Receita";
                }
                if (event.type === 'Documento') {
                  return (event.description || "").replace(/^Documento\s*(:)?\s*/i, '').trim() || "Documento";
                }
                if (event.type === 'Observação') {
                  return (event.summary || "").trim() || "Observação";
                }
                return event.type;
              };

              const getSubtitle = () => {
                if (event.type === 'Atendimento') return (event.summary || "").trim();
                if (event.type === 'Exame') return (event.summary || "").trim();
                if (event.type === 'Receita') return (event.summary || "").trim();
                if (event.type === 'Vacina') {
                  const next = (event.description || "").match(/Próxima dose:\s*(.*)$/i)?.[1];
                  return next ? `Próxima dose: ${next}` : (event.summary || "").trim();
                }
                return "";
              };

              const dotClass = isAlertObs
                ? "bg-red-300"
                : (event.type === 'Receita' ? getRecipeDotClass() : styles.dot);

              const badgeClass = isAlertObs
                ? "bg-red-100 text-red-800"
                : (event.type === 'Receita' ? getRecipeVariantClass() : styles.badge);

              const iconColorClass = isAlertObs
                ? "text-red-700"
                : (event.type === 'Receita' ? getRecipeIconClass() : iconClass);

              const meta = `${formatDateTime(event.date, event.time)}${event.author ? ` • ${event.author}` : ""}`;

              const showView = !!event.link || event.type === 'Exame' || event.type === 'Atendimento' || event.type === 'Documento';
              const onView = () => {
                if (event.type === 'Exame') {
                  const examId = (event.id || "").replace(/^exam-/, "");
                  if (examId) navigate(`/clients/${clientId}/animals/${animalId}/edit-exam/${examId}`);
                  return;
                }
                if (event.link) {
                  if (event.link.startsWith("http") || event.link.startsWith("blob:")) window.open(event.link, "_blank");
                  else navigate(event.link);
                }
              };

              const title = getTitle();
              const subtitle = getSubtitle();

              const MarkerIcon = getTimelineMarkerIcon(event);
              const markerColor = getTimelineMarkerColor(dotClass);

              return (
                <div key={event.id} className="relative pl-9 sm:pl-11">
                  <span className="absolute left-2.5 sm:left-3.5 top-4 h-10 w-10 rounded-full bg-white ring-1 ring-border flex items-center justify-center">
                    <MarkerIcon className="h-4 w-4" strokeWidth={1.6} style={{ color: markerColor }} />
                  </span>

                  <Card className="premium-card p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("chip-soft", badgeClass)}>
                            {isAlertObs
                              ? "Alerta"
                              : event.type === 'Receita'
                                ? ((event.description || "").toLowerCase().includes('controlada') ? 'Receita Controlada'
                                  : (event.description || "").toLowerCase().includes('manipulada') ? 'Receita Manipulada'
                                  : 'Receita Simples')
                                : event.type}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">{meta}</span>
                        </div>

                        <div className="mt-2 flex items-start gap-3">
                          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center bg-muted/30", iconColorClass)}>
                            {React.createElement(event.icon, { className: "h-4 w-4" })}
                          </div>

                          <div className="min-w-0">
                            <div className="text-[15px] sm:text-base font-semibold text-foreground leading-snug truncate">
                              {title}
                            </div>
                            {subtitle && (
                              <div className="mt-0.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                {subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {showView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onView}
                          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        >
                          <FaEye className="h-4 w-4" />
                          <span className="sr-only">Ver</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground py-4">Nenhum evento registrado para este paciente.</p>
      )}
    </CardContent>
  </Card>
</TabsContent>
```
