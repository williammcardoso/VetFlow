export interface BaseAppointmentDetails {
  queixaPrincipal?: string;
  historicoClinico?: string;
  alimentacao?: string;
  vacinacaoVermifugacaoAtualizadas?: 'sim' | 'nao' | '';
  usoMedicacoes?: string;
  ambiente?: 'interno' | 'externo' | 'misto' | '';
  contatoOutrosAnimais?: 'sim' | 'nao' | '';
  mucosas?: string; // Mantido aqui se for uma observação geral de mucosas, não um valor numérico
  linfonodos?: string; // Mantido aqui se for uma observação geral de linfonodos
  auscultaCardiaca?: string;
  auscultaPulmonar?: string;
  abdomen?: string;
  peleAnexos?: string;
  outrosAchadosClinicos?: string;
  diagnosticoPresuntivo?: string;
  diagnosticoDefinitivo?: string;
  condutaTratamento?: string;
  retornoRecomendadoEmDias?: number;
  // Novos campos adicionados para o atendimento simples
  observacoesOcorrencias?: string;
  examesSolicitados?: string;
  suspeitaDiagnostica?: string;
  diagnosticoDiferencial?: string;
  procedimentoRealizadoConsulta?: string;
  proximosPassos?: string; // Movido para o simples
}

export interface ConsultationDetails extends BaseAppointmentDetails {
  // --- Novo padrão (Consulta Clínica) ---
  // Obs.: Mantemos campos antigos por compatibilidade com registros existentes.

  // Anamnese (modo simplificado)
  vacinacaoEmDia?: 'sim' | 'nao' | 'nao_informado' | '';

  // Avaliação clínica (resumo)
  estadoGeral?: 'bom' | 'regular' | 'grave' | '';
  mucosasResumo?: 'normal' | 'palida' | 'icterica' | 'hiperemica' | 'cianotica' | '';
  hidratacao?: 'normal' | 'leve' | 'moderada' | 'severa' | '';
  dor?: 'sem' | 'leve' | 'moderada' | 'intensa' | 'escala' | '';
  dorEscala?: number;

  // Exame completo (seções colapsáveis, sem checklists extensos)
  sec_digestorio_status?: 'normal' | 'alterado' | '';
  sec_digestorio_obs?: string;
  sec_respiratorio_status?: 'normal' | 'alterado' | '';
  sec_respiratorio_obs?: string;
  sec_cabeca_pescoco_status?: 'normal' | 'alterado' | '';
  sec_cabeca_pescoco_obs?: string;
  sec_torax_abdomen_status?: 'normal' | 'alterado' | '';
  sec_torax_abdomen_obs?: string;
  sec_linfonodos_pele_status?: 'normal' | 'alterado' | '';
  sec_linfonodos_pele_obs?: string;
  observacoesComplementares?: string;

  // --- Campos antigos (legado) ---
  // Anamnese
  vacinacaoPaciente?: 'sim' | 'nao' | '';
  vacinacaoPacienteObs?: string;
  usoMedicacao?: 'sim' | 'nao' | '';
  usoMedicacaoQuais?: string;
  possibilidadeIntoxicacao?: 'sim' | 'nao' | '';
  possibilidadeIntoxicacaoObs?: string;
  alergiasPaciente?: 'sim' | 'nao' | '';
  alergiasPacienteObs?: string;
  historicoCirurgico?: 'sim' | 'nao' | '';
  historicoCirurgicoQuais?: string;
  alimentacaoTipo?: 'racaoSeca' | 'racaoUmida' | 'mista' | 'alimentacaoCaseira' | '';
  alimentacaoObs?: string;
  apetiteDegluticao?: string[]; // Array de opções selecionadas
  apetiteDegluticaoObs?: string;
  emeseRegurgitacao?: 'sim' | 'nao' | '';
  emeseRegurgitacaoComplementoInicio?: string;
  emeseRegurgitacaoComplementoQuantidade?: string;
  emeseRegurgitacaoComplementoFrequencia?: string;
  emeseRegurgitacaoComplementoAspecto?: string;
  ingestaoAgua?: string[]; // Array de opções selecionadas
  miccaoNormal?: 'sim' | 'nao' | '';
  miccaoFrequencia?: string;
  miccaoAspecto?: string;
  miccaoAlteracoes?: string[]; // Array de opções selecionadas
  fezesDefecacoes?: string[]; // Array de opções selecionadas
  fezesDefecacoesComplemento?: string;
  alteracoesRespiratorias?: 'sim' | 'nao' | '';
  alteracoesRespiratoriasTipos?: string[]; // Array de opções selecionadas
  tosse?: 'sim' | 'nao' | '';
  tossePeriodo?: string;
  tosseFrequencia?: string;
  espirros?: 'sim' | 'nao' | '';
  espirrosPeriodo?: string;
  espirrosFrequencia?: string;
  intoleranciaExercicio?: 'sim' | 'nao' | '';
  intoleranciaExercicioTipos?: string[]; // Array de opções selecionadas
  intoleranciaExercicioObs?: string;

  // Exame Físico
  exameFisicoRealizado?: 'sim' | 'nao' | '';
  exameFisicoObs?: string;
  usoContencao?: 'sim' | 'nao' | '';
  usoContencaoQual?: string;
  secrecaoNasal?: 'sim' | 'nao' | '';
  secrecaoNasalComplementoInicio?: string;
  secrecaoNasalComplementoAspectoQuantidade?: string;
  secrecaoOcular?: 'sim' | 'nao' | '';
  secrecaoOcularComplementoInicio?: string;
  secrecaoOcularComplementoAspectoQuantidade?: string;
  olhosEstado?: string; // Opção única selecionada
  olhosObs?: string;
  orelhasAlteracoes?: string[]; // Array de opções selecionadas
  bocaAnexos?: 'sim' | 'nao' | '';
  bocaAnexosDescricao?: string;
  doencaPeriodontal?: 'sim' | 'nao' | '';
  doencaPeriodontalGrau?: '1' | '2' | '3' | '4' | '';
  peleAnexosAlteracoes?: string[]; // Array de opções selecionadas
  peleAnexosDescricao?: string;
  pescocoColuna?: 'sim' | 'nao' | '';
  pescocoColunaDescricao?: string;
  desconfortoAbdominal?: 'sim' | 'nao' | '';
  desconfortoAbdominalRegiaoSensibilidade?: string;
  desconfortoAbdominalNivelDor?: string;
  aumentoVolumeAbdominal?: 'sim' | 'nao' | '';
  aumentoVolumeAbdominalRegiao?: string;
  mucosasEstado?: string[]; // Array de opções selecionadas
  frequenciaRespiratoriaObsAusculta?: string;
  sopro?: 'sim' | 'nao' | '';
  padraoRespiratorio?: string[]; // Array de opções selecionadas
  frequenciaCardiacaObsAusculta?: string;
  linfonodosEstado?: 'normal' | 'infartado' | '';
  linfonodosAlteracaoQualObs?: string;
}

export interface VaccinationDetails {
  tipoVacina?: string; // Ex: Polivalente, Antirrábica
  nomeComercial?: string;
  lote?: string;
  fabricante?: string;
  dataFabricacao?: string;
  dataValidade?: string;
  doseAplicada?: number;
  viaAdministracao?: 'SC' | 'IM' | 'VO' | 'IN' | '';
  localAplicacao?: string;
  reacaoAdversaObservada?: string;
  profissionalAplicou?: string; // Pré-preenchido com o veterinário logado
  proximaDose?: string; // Data ISO (opcional)
}

export interface SurgerySutureItem {
  id: string;
  tipo: 'Nylon' | 'PGA' | 'Vicryl' | 'Monocryl' | 'Prolene' | 'Outros' | '';
  calibre?: string;
  plano?: string;
  padrao?: string;
  quantidade?: number;
  usoLocal?: string;
}

export interface SurgeryDetails {
  // --- Novo padrão (Cirurgia) ---
  horaInicio?: string;
  horaTermino?: string;
  anestesista?: string;
  instrumentador?: string;

  // Pré-operatório
  mucosas?: 'normal' | 'palida' | 'icterica' | 'hiperemica' | 'cianotica' | '';
  tpcSeg?: number;
  estadoGeral?: 'bom' | 'regular' | 'grave' | '';
  jejumAdequado?: boolean;
  examesPreOperatoriosAvaliados?: boolean;
  observacoesPreOperatorias?: string;

  // Procedimento
  procedimentoRealizado?: string;
  diagnostico?: string;
  tecnicaCirurgica?: string;
  protocoloAnestesico?: string;
  intercorrenciaIntraOperatoria?: boolean;
  intercorrenciaDescricao?: string;

  // Materiais
  suturas?: SurgerySutureItem[];

  // Pós-operatório
  condicaoFinal?: string;
  prescricaoPosOperatoria?: string;
  orientacoesTutor?: string;
  complicacoesImediatas?: boolean;
  observacoesPosOperatorias?: string;

  // --- Campos antigos (legado) ---
  tipoCirurgia?: string; // Ex: Castração, Piometra
  tempoJejumHoras?: number;
  medicacaoPreAnestesica?: string;
  anestesicoUtilizado?: string;
  achadosIntraoperatorios?: string;
  complicacoesIntraoperatorias?: string;
  tempoCirurgicoMin?: number;
  responsavelAnestesia?: string;
  responsavelCirurgia?: string;
  medicamentosPosOperatorios?: string;
}

export interface ReturnDetails {
  atendimentoOrigemId?: string; // ID do atendimento anterior
  motivoRetorno?: string;
  evolucaoObservada?: string;
  novoDiagnosticoConduta?: string;
}

export interface EmergencyDetails {
  horaChegada?: string; // Ex: "HH:mm"
  condicaoGeral?: 'alerta' | 'deprimido' | 'inconsciente' | 'choque' | 'dispneia' | 'sangramento' | 'convulsao' | 'outros' | '';
  manobrasSuporteRealizadas?: string;
  medicamentosAdministrados?: string;
  encaminhamento?: 'internacao' | 'alta' | 'obito' | '';
}

export interface CheckupDetails {
  ultimaVacinacao?: string; // Data
  ultimaVermifugacao?: string; // Data
  avaliacaoDentaria?: string;
  avaliacaoNutricional?: string;
  avaliacaoCorporalEscala?: number; // Escala 1-9
  recomendacoesPreventivas?: string;
}

export type AppointmentSpecificDetails =
  | { type: 'Consulta', details: ConsultationDetails }
  | { type: 'Consulta (Modelo Antigo)', details: ConsultationDetails }
  | { type: 'Vacina', details: VaccinationDetails }
  | { type: 'Retorno', details: ReturnDetails }
  | { type: 'Cirurgia', details: SurgeryDetails }
  | { type: 'Emergência', details: EmergencyDetails }
  | { type: 'Check-up', details: CheckupDetails }
  | { type: 'Outros', details: BaseAppointmentDetails };

export interface AppointmentEntry {
  id: string;
  animalId: string;
  date: string; // Data do atendimento (ISO: YYYY-MM-DD)
  time: string; // Hora do atendimento
  type:
    | 'Consulta'
    | 'Consulta (Modelo Antigo)'
    | 'Vacina'
    | 'Retorno'
    | 'Cirurgia'
    | 'Emergência'
    | 'Check-up'
    | 'Outros'
    | '';
  vet: string; // Veterinário responsável
  pesoAtual?: number;
  temperaturaCorporal?: number;
  frequenciaCardiaca?: number;
  frequenciaRespiratoria?: number;
  observacoesGerais?: string;
  details: AppointmentSpecificDetails['details'];
  attachments?: { name: string; url: string }[];
}