// Dicas do "?" na emissão dos modelos oficiais: o que preencher em cada
// campo. Escritas a partir dos 30 modelos da biblioteca
// (docs/documentos/vetflow-modelos-documentos.md) e casadas pelo RÓTULO do
// campo (ex.: "Classificação ASA"), não pela posição — então continuam
// valendo se o texto do modelo for editado, desde que o rótulo fique.
//
// Ordem importa: a primeira regra que casar ganha (as com seção vêm antes
// das genéricas de mesmo rótulo, ex.: "Nome" da vacina × "Nome" de testemunha).

interface HintRule {
  /** Testado contra o rótulo normalizado (minúsculas, sem acento/pontuação). */
  label: RegExp;
  /** Opcional: só vale nesta seção (título normalizado). */
  section?: RegExp;
  hint: string;
}

export function normalizeHintKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, " ")
    .trim();
}

const LINE_RULES: HintRule[] = [
  // ── Óbito (A2) ──
  { label: /^causa basica/, hint: "Doença ou lesão que iniciou o processo que levou à morte (ex.: doença renal crônica)." },
  { label: /^causa intermediaria/, hint: "Complicação entre a causa básica e a imediata (ex.: uremia). Deixe em branco se não houver." },
  { label: /^causa imediata/, hint: "O que causou diretamente a morte (ex.: parada cardiorrespiratória secundária à hipercalemia)." },
  { label: /^diagnostico estabelecido por/, hint: "Como a causa da morte foi definida. \"Presuntivo\" = sem confirmação por exame." },
  { label: /^houve eutanasia/, hint: "Se sim, informe o método/fármaco empregado." },
  { label: /notificacao obrigatoria|^notificado/, hint: "Ex.: raiva, leishmaniose, mormo. Se sim, informe o órgão notificado (vigilância sanitária, defesa agropecuária) e a data." },

  // ── Atestado de saúde (A3) ──
  { label: /^temperatura retal/, hint: "Parâmetros do exame clínico: temperatura (°C), frequência cardíaca (batimentos/min) e respiratória (movimentos/min)." },
  { label: /^mucosas/, hint: "Cor e umidade das mucosas (ex.: normocoradas e úmidas, hipocoradas, ictéricas)." },
  { label: /^linfonodos/, hint: "Ex.: sem alterações; submandibulares aumentados." },
  { label: /^estado nutricional|^ecc/, hint: "Escore de condição corporal de 1 a 9 (5 = ideal)." },
  { label: /^antirrabica/, hint: "Data da última dose, lote e fabricante — estão na carteira de vacinação." },
  { label: /^multipla|polivalente/, hint: "Vacina múltipla (ex.: V8/V10 em cães, V4/V5 em gatos): data e lote da última dose." },
  { label: /^situacao de vermifugacao/, hint: "Produto e data do último vermífugo." },
  { label: /^exames complementares realizados/, hint: "Exames feitos para emitir o atestado (ex.: hemograma, sorologia). Deixe em branco se não houve." },
  { label: /^validade deste atestado/, hint: "Por quantos dias o atestado vale. Confira a exigência do destino (companhia aérea, evento, outro país)." },
  { label: /^obrigatoria$/, hint: "Há sinal de doença infectocontagiosa de notificação obrigatória?" },

  // ── Vacinação (A4) ──
  { section: /vacinacao/, label: /^nome$/, hint: "Nome comercial da vacina (ex.: Nobivac DHPPi+L, Defensor)." },
  { label: /^fabricante|^fab$/, hint: "Laboratório fabricante — está no frasco ou na etiqueta." },
  { section: /vacinacao/, label: /^lote/, hint: "Número do lote da etiqueta da vacina." },
  { section: /vacinacao/, label: /^validade/, hint: "Data de validade do frasco." },
  { label: /^via de aplicacao/, hint: "Ex.: subcutânea (SC), intramuscular (IM), intranasal." },
  { label: /^local de aplicacao/, hint: "Ex.: região escapular direita." },
  { label: /^data de aplicacao/, hint: "Dia em que a vacina foi aplicada." },
  { label: /^revacinacao prevista/, hint: "Data da próxima dose (reforço anual ou a próxima do protocolo de filhote)." },
  { label: /^orientacoes pos vacinais/, hint: "Ex.: possíveis reações (febre, apatia, inchaço no local) e quando procurar a clínica." },

  // ── Encaminhamento e solicitações (A5, A6, A7) ──
  { label: /^ao a colega/, hint: "Nome do(a) colega ou serviço que vai receber o paciente." },
  { label: /^especialidade/, hint: "Ex.: cardiologia, dermatologia, oncologia." },
  { label: /servico de diagnostico por imagem/, hint: "Nome da clínica ou serviço que vai fazer o exame." },
  { label: /^a c do a medico/, hint: "Veterinário(a) que vai realizar o exame, se souber, e o CRMV." },
  { label: /^carater/, hint: "Eletivo = pode ser agendado; prioritário = nos próximos dias; urgência/emergência = imediato." },
  { section: /exame solicitado/, label: /^modalidade/, hint: "Marque o tipo de exame de imagem." },
  { label: /^regiao anatomica/, hint: "Ex.: tórax em 3 projeções, abdômen total, coluna toracolombar." },
  { label: /^contraste/, hint: "Se for usar contraste, informe tipo e via (ex.: iodado IV, bário VO)." },
  { label: /^exames previos/, hint: "Exames anteriores importantes e o que mostraram (ex.: RX de 10/09 com efusão pleural)." },
  { label: /^necessita sedacao/, hint: "\"A critério\" = o serviço de imagem decide na hora, conforme o comportamento do paciente." },
  { label: /^classificacao asa/, hint: "Risco anestésico: I saudável; II doença leve; III doença sistêmica moderada; IV doença grave com risco de vida; V moribundo. Marque também \"E\" se for emergência." },
  { label: /^creatinina/, hint: "Últimos valores e data do exame — importante se for usar contraste iodado (risco renal)." },
  { label: /^alergias/, hint: "Alergias conhecidas a medicamentos, contrastes ou alimentos. Escreva \"nenhuma conhecida\" se for o caso." },
  { label: /^jejum orientado/, hint: "Horas de jejum de comida e de água orientadas ao responsável (ex.: 8 h de comida, 2 h de água)." },
  { label: /^prazo desejado/, hint: "Ex.: no mesmo dia, até 48 h." },
  { label: /^ao laboratorio/, hint: "Nome do laboratório que vai receber a amostra." },
  { section: /material enviado/, label: /^tipo$/, hint: "Marque o tipo de amostra enviada." },
  { label: /^n de frascos|^no de frascos/, hint: "Quantos frascos/potes vão e qual fixador foi usado." },
  { label: /^proporcao fixador/, hint: "O formol deve ter 10 vezes o volume do tecido (10:1). Informe também a data da fixação." },
  { label: /^identificacao das amostras/, hint: "Como cada frasco está identificado (ex.: F1 = nódulo no flanco direito)." },
  { label: /^marcacao de margens/, hint: "Se marcou as margens com tinta ou fio, explique o código (ex.: fio longo = margem cranial)." },
  { label: /^duracao da evolucao/, hint: "Há quanto tempo a lesão existe ou o quadro evolui." },
  { label: /^localizacao anatomica exata/, hint: "Ex.: 3ª mama abdominal esquerda." },
  { label: /^dimensoes/, hint: "Comprimento × largura × altura, em cm." },
  { label: /^aspecto/, hint: "Marque o aspecto da lesão e informe a consistência (ex.: firme, macia, flutuante)." },
  { label: /^aderencia/, hint: "A lesão está presa aos tecidos de baixo (não se movimenta)?" },
  { label: /^crescimento/, hint: "Velocidade de crescimento relatada e há quanto tempo a lesão existe." },
  { label: /^tipo de excisao/, hint: "Incisional = só um fragmento; excisional = lesão inteira. Informe as margens estimadas em cm." },

  // ── Cirurgia e anestesia (B1, B2, B3) ──
  { section: /procedimento cirurgico/, label: /^objetivo/, hint: "Curativo = resolver; paliativo = aliviar; diagnóstico = biópsia/exploração; estético/funcional." },
  { label: /^anestesista/, hint: "Veterinário(a) responsável pela anestesia e o CRMV." },
  { label: /^auxiliares/, hint: "Nomes de quem vai auxiliar na cirurgia." },
  { label: /^exames realizados/, hint: "Exames pré-anestésicos feitos (ex.: hemograma, bioquímico, ECG)." },
  { label: /^itens inclusos/, hint: "O que está incluído no valor (ex.: anestesia, 1 dia de internação, medicação pós-operatória)." },
  { label: /^itens nao inclusos/, hint: "O que será cobrado à parte (ex.: exames extras, histopatológico, retornos)." },
  { label: /^servirao empregados|^serao empregados/, hint: "Marque os recursos de monitoração que serão usados durante a anestesia." },

  // ── Terapia de risco (B4) ──
  { section: /terapia proposta/, label: /^modalidade/, hint: "Marque o tipo de terapia indicada." },
  { label: /^farmacos produtos/, hint: "Medicamentos ou produtos do protocolo (ex.: doxorrubicina, concentrado de hemácias)." },
  { label: /^doses$/, hint: "Dose de cada fármaco (ex.: 30 mg/m² IV)." },
  { label: /^numero de sessoes/, hint: "Quantas sessões ou aplicações estão previstas." },
  { label: /^intervalo entre sessoes/, hint: "Ex.: a cada 21 dias." },
  { label: /^duracao estimada/, hint: "Tempo total previsto do tratamento." },
  { label: /^exames de controle/, hint: "Exames para acompanhar efeitos colaterais (ex.: hemograma antes de cada sessão)." },
  { label: /^periodicidade/, hint: "De quanto em quanto tempo." },
  { label: /^valor estimado por sessao|^valor total estimado/, hint: "Valor em reais — use o mesmo do orçamento passado ao responsável." },

  // ── Internação (B5) ──
  { label: /^estimativa/, hint: "Número estimado de dias de internação." },
  { label: /^horario de visitas/, hint: "Ex.: todos os dias, das 14h às 16h." },
  { label: /^contato para informacoes/, hint: "Telefone ou WhatsApp da clínica para o responsável pedir notícias." },
  { label: /^frequencia de atualizacoes/, hint: "Ex.: 2 boletins por dia, às 10h e às 18h." },
  { label: /^valor da diaria/, hint: "Valor de cada dia." },
  { label: /^limite de gastos/, hint: "Até quanto a equipe pode gastar sem ligar antes para o responsável." },

  // ── Eutanásia (B6) ──
  { label: /^sedacao anestesia previa/, hint: "Fármaco e dose da sedação/anestesia antes do agente eutanásico — obrigatória pela Res. CFMV nº 1.000/2012." },
  { label: /^agente eutanasico$/, hint: "Ex.: cloreto de potássio IV após anestesia geral; pentobarbital." },
  { label: /^via de administracao/, hint: "Ex.: intravenosa." },
  { label: /^metodo classificado como/, hint: "Conforme o Guia Brasileiro de Boas Práticas em Eutanásia em Animais (CFMV)." },
  { label: /^acompanhantes autorizados/, hint: "Nomes de quem pode acompanhar o procedimento." },
  { label: /^valor do procedimento|^valor da destinacao/, hint: "Valor em reais." },
  { label: /^medico veterinario executor/, hint: "Quem vai realizar o procedimento e o CRMV." },
  { label: /^medico veterinario supervisor/, hint: "Preencha só se outro veterinário supervisionar." },
  { section: /apos o ato/, label: /^data$/, hint: "Registro do procedimento: data e horários de início e do óbito." },
  { label: /^sedacao anestesia farmaco|^agente eutanasico farmaco/, hint: "Fármaco, dose e via efetivamente usados." },
  { label: /^confirmacao de obito/, hint: "Marque os sinais usados para confirmar o óbito." },
  { label: /^intercorrencias/, hint: "Qualquer ocorrência durante o procedimento. Escreva \"nenhuma\" se não houve." },
  { label: /^destinacao do corpo executada/, hint: "O que foi feito com o corpo (ex.: entregue ao responsável; cremação individual pela empresa X)." },

  // ── Retirada de corpo, doação, retirada sem alta (B7, B8, B9) ──
  { label: /^data e hora da retirada/, hint: "Quando o animal (ou o corpo) saiu da clínica." },
  { section: /instituicao destinataria/, label: /^nome$/, hint: "Nome da instituição de ensino ou pesquisa que vai receber o corpo." },
  { label: /^responsavel pelo recebimento/, hint: "Pessoa da instituição que vai receber o corpo." },
  { label: /^protocolo ceua/, hint: "Número do protocolo aprovado na Comissão de Ética no Uso de Animais, quando o uso for em pesquisa." },
  { label: /^recebimento pela instituicao/, hint: "Quem recebeu o corpo na instituição e em que data." },
  { section: /quadro clinico atual/, label: /^estado geral/, hint: "Estado do paciente no momento da saída." },
  { label: /^parametros no momento/, hint: "Frequência cardíaca, frequência respiratória e temperatura na hora da saída." },
  { label: /^pa$/, hint: "Pressão arterial (mmHg), tempo de preenchimento capilar (s) e cor das mucosas." },
  { label: /^tratamentos em curso/, hint: "O que será interrompido com a saída (ex.: fluidoterapia IV, antibiótico IV)." },
  { label: /^exames pendentes/, hint: "Exames que ainda faltavam fazer ou receber." },
  { label: /^previsao de permanencia/, hint: "Quantos dias mais de internação seriam necessários." },
  { label: /^medicacoes e cuidados domiciliares/, hint: "O que foi orientado para fazer em casa (remédios, doses, horários, cuidados)." },
  { label: /^sinais de alerta/, hint: "Sinais que exigem voltar na hora (ex.: não urinar, vômitos, apatia, dificuldade para respirar)." },
  { label: /^servicos? de emergencia 24h/, hint: "Nome e telefone de hospitais 24h próximos." },
  { label: /^relatorio medico/, hint: "O responsável recebeu relatório e cópia do prontuário?" },
  { label: /^motivo declarado/, hint: "Motivo dito pelo responsável, com as palavras dele. É opcional." },

  // ── Pesquisa clínica (B10) ──
  { label: /^titulo do projeto/, hint: "Título do projeto como aprovado na CEUA." },
  { label: /^pesquisador responsavel/, hint: "Coordenador(a) da pesquisa e o CRMV." },
  { label: /^instituicao executora/, hint: "Universidade ou instituição que conduz o estudo." },
  { label: /^patrocinador/, hint: "Quem financia o estudo. Escreva \"não há\" se for o caso." },
  { label: /^duracao da participacao/, hint: "Quanto tempo o animal fica no estudo." },
  { label: /^numero de retornos/, hint: "Quantas visitas o responsável precisará fazer." },
  { label: /^grau de invasividade/, hint: "Classificação do CONCEA (graus 1 a 4), conforme o projeto aprovado." },
  { label: /^para o paciente/, hint: "Benefício esperado para o próprio animal." },
  { label: /^para a coletividade/, hint: "O que o estudo pode trazer para outros animais e para a ciência." },
  { label: /^tratamento convencional/, hint: "O tratamento padrão que o animal receberia fora do estudo." },
  { label: /^custos cobertos|^custos a cargo|^previsao de ressarcimento/, hint: "Deixe claro o que é pago pelo estudo e o que fica com o responsável." },
  { section: /contatos/, label: /^pesquisador|^ceua/, hint: "Telefone e e-mail para o responsável tirar dúvidas ou fazer denúncias." },

  // ── Recusas (C1–C5) ──
  { section: /exames indicados e recusados/, label: /^finalidade/, hint: "Para que serve o exame (ex.: avaliar a função renal antes da anestesia)." },
  { label: /^recusa$/, hint: "Marque se o responsável recusou este exame." },
  { section: /exames indicados e recusados/, label: /^outros/, hint: "Outro exame indicado e recusado." },
  { label: /^foi indicada internacao/, hint: "Marque o regime indicado e informe o prazo estimado em dias." },
  { section: /plano domiciliar/, label: /^medicacoes/, hint: "Medicamentos, doses e horários para casa." },
  { section: /plano domiciliar/, label: /^cuidados/, hint: "Cuidados em casa (ex.: repouso, colar elizabetano, curativo)." },
  { label: /^retorno agendado/, hint: "Data e hora do retorno." },
  { label: /^descricao do sofrimento/, hint: "Sinais de dor ou sofrimento observados (ex.: dispneia, dor não controlada, anorexia)." },
  { label: /^escala de dor/, hint: "Escala usada (ex.: Glasgow, UNESP-Botucatu, Colorado) e o escore obtido." },
  { label: /^analgesia/, hint: "Analgésicos, doses e frequência." },
  { label: /^prognostico/, hint: "Marque o prognóstico estimado." },
  { label: /^suporte nutricional/, hint: "Como oferecer comida e água (ex.: alimento pastoso, sonda)." },
  { label: /^higiene/, hint: "Ex.: mudar de posição a cada 4 h, cama macia, limpeza frequente." },
  { label: /^manejo ambiental|^adequacoes ambientais/, hint: "Ex.: local aquecido e silencioso, água e comida de fácil acesso." },
  { label: /^reavaliacao obrigatoria|^reavaliacoes em/, hint: "Data(s) da próxima reavaliação." },

  // ── Prognóstico e paliativos (D1) ──
  { label: /^expectativa de sobrevida/, hint: "Ex.: semanas a poucos meses — deixe claro ao responsável que é uma estimativa." },
  { label: /^controle de nausea/, hint: "Antieméticos e cuidados com a alimentação." },
  { label: /^hidratacao/, hint: "Ex.: fluido subcutâneo em casa, água sempre disponível." },
  { label: /^manejo respiratorio/, hint: "Ex.: oxigênio, evitar estresse e calor." },
  { label: /^escala aplicada/, hint: "Escala de qualidade de vida usada (ex.: HHHHHMM, de Villalobos)." },

  // ── Orçamento (D2) ──
  { section: /orcamento/, label: /^descricao/, hint: "Serviço ou produto." },
  { section: /orcamento/, label: /^quantidade/, hint: "Quantidade do item." },
  { label: /^valor unitario|^subtotal/, hint: "Valor em reais." },
  { label: /^total\b/, hint: "Soma de todos os itens." },
  { label: /^condicoes de pagamento/, hint: "Ex.: 50% na aprovação e 50% na alta; cartão em até 3x." },

  // ── Imagem, LGPD, hospedagem (D3, D4, D5) ──
  { section: /abrangencia/, label: /^prazo/, hint: "Por quanto tempo a autorização vale." },
  { label: /^periodo/, hint: "Data de entrada e data de saída prevista." },
  { label: /^vacinacao em dia/, hint: "Confira na carteira e informe a data da última antirrábica." },
  { label: /^vermifugacao/, hint: "Data do último vermífugo e do último antipulgas/carrapatos." },
  { label: /^exame clinico de admissao/, hint: "O animal foi examinado na entrada?" },
  { label: /^alteracoes constatadas/, hint: "Ex.: otite leve, ferida na pata — registrar evita discussão na saída." },
  { label: /^peso na admissao/, hint: "Peso em kg na entrada." },
  { label: /^alimentacao/, hint: "Marca da ração, quantidade e quantas vezes ao dia." },
  { label: /^medicacoes em uso/, hint: "Nome, dose e horários." },
  { label: /^comorbidades/, hint: "Doenças que o animal já tem (ex.: cardiopatia, diabetes)." },
  { label: /^temperamento/, hint: "Ex.: dócil, medroso, já mordeu — ajuda a equipe a manejar com segurança." },
  { label: /^itens entregues/, hint: "Ex.: coleira, guia, caminha, ração, medicamentos." },

  // ── Maus-tratos (D6) ──
  { section: /identificacao do animal/, label: /^especie|^pelagem/, hint: "Preencha se o animal não tiver cadastro completo." },
  { section: /quem apresentou/, label: /^nome$/, hint: "Quem trouxe o animal (pode não ser o tutor)." },
  { label: /^relacao declarada/, hint: "Ex.: tutor, vizinho, protetor." },
  { label: /^incompatibilidade/, hint: "O relato de quem trouxe o animal combina com o que você encontrou no exame?" },
  { label: /^justificativa/, hint: "Explique por que o relato não combina com os achados." },
  { label: /^sinais de trauma/, hint: "Lesões encontradas: tipo, local, tamanho e há quanto tempo parecem existir." },
  { label: /^sinais de privacao|^sinais de contencao|^dor e sofrimento/, hint: "Descreva o que foi observado no exame." },
  { label: /^fundamentacao/, hint: "Com base nos achados, por que chegou a essa conclusão." },

  // ── Atendimento externo, abandono (D7, D8) ──
  { label: /^local de realizacao/, hint: "Endereço onde o atendimento ou a cirurgia será feito." },
  { label: /^estabelecimento contratante/, hint: "Clínica ou empresa que contratou o serviço, se houver." },
  { label: /^responsavel tecnico do local/, hint: "Veterinário responsável técnico do local e o CRMV." },
  { label: /^recursos disponiveis/, hint: "Ex.: oxigênio, monitor multiparamétrico, foco cirúrgico." },
  { label: /^recursos nao disponiveis/, hint: "Ex.: UTI, banco de sangue, raio-X." },
  { label: /^profissional responsavel pelo acompanhamento/, hint: "Quem vai acompanhar o pós-operatório." },
  { label: /^local do pos operatorio/, hint: "Onde o animal vai se recuperar." },
  { label: /^recebido em/, hint: "Data em que a notificação foi entregue e quem recebeu." },

  // ── Genéricos (por último) ──
  { label: /^\d+ nome/, hint: "Testemunha maior de idade, de preferência sem vínculo com a clínica: nome completo e CPF. A assinatura é feita no papel." },
  { label: /^nome$/, hint: "Nome completo." },
  { label: /^cpf/, hint: "CPF da pessoa." },
  { label: /^cnpj/, hint: "CNPJ da empresa ou instituição." },
  { label: /^endereco/, hint: "Endereço completo." },
  { label: /^telefone/, hint: "Telefone com DDD." },
  { label: /^estado geral/, hint: "Impressão geral do exame clínico (ex.: bom, regular, ruim)." },
  { label: /^outras?$|^outros?$/, hint: "Descreva o que não está nas opções." },
];

const SECTION_RULES: HintRule[] = [
  { label: /tipo de anestesia/, hint: "Marque a(s) técnica(s) prevista(s). \"Combinada\" = mais de uma (ex.: geral + bloqueio)." },
  { label: /avaliacao pre (anestesica|operatoria)/, hint: "Marque os exames e avaliações feitos antes do procedimento. Se o responsável dispensou exames, marque \"Dispensada\" e justifique." },
  { label: /^5 monitoracao|^monitoracao/, hint: "Marque os recursos de monitoração que serão usados durante a anestesia." },
  { label: /manobras de reanimacao|ordem de nao reanimar/, hint: "Marque UMA opção, conforme a decisão do responsável. Em \"limitadas\"/\"parcial\", escreva o que é permitido." },
  { label: /autorizacoes especificas/, hint: "Marque só o que o responsável autoriza durante a internação. O que ficar desmarcado vai precisar de nova autorização." },
  { label: /fundamentacao da indicacao/, hint: "Marque o(s) motivo(s) que justificam a eutanásia, conforme o art. 3º da Res. CFMV nº 1.000/2012." },
  { label: /alternativas apresentadas/, hint: "Registre as alternativas oferecidas ao responsável antes da decisão." },
  { label: /presenca durante o procedimento/, hint: "Marque UMA opção, conforme o desejo do responsável." },
  { label: /destinacao do corpo/, hint: "Marque o destino escolhido pelo responsável. Retirada pelo responsável usa o termo B7; doação, o B8." },
  { label: /risco sanitario/, hint: "Se houver suspeita de doença transmissível (ex.: raiva, leptospirose), marque e informe qual — o transporte e a destinação exigem cuidados." },
  { label: /^4 necropsia|^necropsia/, hint: "Registre se a necropsia foi oferecida e o que o responsável decidiu." },
  { label: /finalidade da doacao/, hint: "Marque para que o corpo será usado pela instituição." },
  { label: /autorizacao para registro|sigilo e dados/, hint: "O responsável autoriza fotos e vídeos do paciente?" },
  { label: /tratamento indicado e recusado/, hint: "Marque cada tratamento que foi indicado e recusado e descreva ao lado o que foi indicado." },
  { label: /medidas minimas aceitas/, hint: "Marque o que o responsável aceitou fazer, mesmo recusando o tratamento completo." },
  { label: /exames indicados e recusados/, hint: "Para cada exame indicado, escreva a finalidade e marque \"Recusa\" se o responsável não autorizou." },
  { label: /terapias que nao poderao/, hint: "Marque o que deixará de ser feito por causa da recusa da internação." },
  { label: /plano de cuidados paliativos|plano domiciliar/, hint: "Descreva o plano combinado: medicamentos e doses, alimentação, cuidados e quando reavaliar." },
  { label: /prognostico$/, hint: "Marque o prognóstico estimado." },
  { label: /objetivo do cuidado/, hint: "Marque o objetivo do tratamento a partir de agora e explique abaixo, se precisar." },
  { label: /diretivas antecipadas/, hint: "O que o responsável deseja se o quadro piorar: até onde ir com o suporte e se deve ou não reanimar." },
  { label: /abrangencia/, hint: "Marque o que pode aparecer nas imagens e se os nomes podem ser citados." },
  { label: /uso de imagem/, hint: "Marque onde as imagens podem ser usadas." },
  { label: /^2 finalidades|^finalidades/, hint: "As duas primeiras não dependem de consentimento (obrigação legal). Marque as de \"CONSENTIMENTO\" só se o responsável concordar." },
  { label: /canais de comunicacao/, hint: "Por quais canais o responsável aceita ser contatado." },
  { label: /documentacao anexa/, hint: "Marque os documentos anexados à notificação." },
  { label: /conclusao tecnica/, hint: "Conclusão a partir dos achados — a Res. CFMV nº 1.236/2018 define maus-tratos, crueldade e abuso." },
  { label: /perguntas ao patologista/, hint: "Marque o que você quer que o laudo responda." },
  { label: /material enviado/, hint: "Marque o tipo de amostra e informe como foi acondicionada." },
  { label: /descricao macroscopica/, hint: "Descreva a lesão como foi vista: local, tamanho, aspecto e como foi retirada." },
  { label: /entrega do resultado/, hint: "Como você quer receber o resultado." },
  { label: /regime de internacao/, hint: "Marque o regime indicado e informe horários e contatos combinados." },
  { label: /preparo previo/, hint: "Marque o preparo que o responsável deve fazer antes do exame e as horas de jejum." },
  { label: /sedacao ou anestesia/, hint: "Se o exame precisar de sedação, marque \"Sim\" — o termo de anestesia (B3) também deve ser assinado." },
  { label: /material biologico/, hint: "O que fazer com o material retirado: exame (custo à parte), descarte ou uso em ensino." },
  { label: /condutas nao previstas/, hint: "Se durante a cirurgia surgir algo não previsto, a equipe pode agir sem falar antes com o responsável?" },
  { label: /eutanasia intraoperatoria/, hint: "O que fazer se, durante a cirurgia, for encontrada uma condição incompatível com a vida." },
  { label: /tricotomia/, hint: "Tricotomia é a raspagem dos pelos no local. Recusar inviabiliza o procedimento." },
  { label: /testemunhas/, hint: "Testemunhas maiores de idade, de preferência sem vínculo com a clínica. Preencha nome e CPF; a assinatura é feita no papel." },
  { label: /quadro clinico atual/, hint: "Registre como o paciente está no momento da saída." },
  { label: /recusa de assinatura/, hint: "Marque o que aconteceu e descreva abaixo a situação (o que foi explicado e como o responsável reagiu)." },
  { label: /suspeita de maus tratos/, hint: "Marque a quem a notificação será enviada." },
  { label: /declaracao( final)?$/, hint: "Marque a decisão (e, se quiser, o motivo) do responsável. Testemunhas: nome e CPF — a assinatura é feita no papel." },
  { label: /atendimento de urgencia/, hint: "Valor máximo que a clínica pode gastar numa urgência sem falar antes com o responsável." },
  { label: /apos o ato/, hint: "Preencha depois do procedimento, com o que foi realmente feito." },
  { label: /atestado de obito/, hint: "Informe a causa da morte em três níveis (básica → intermediária → imediata) e como ela foi estabelecida." },
  { label: /atestado de saude/, hint: "Marque o que se aplica ao animal no exame de hoje e preencha os parâmetros clínicos e a situação vacinal." },
  { label: /exame solicitado/, hint: "Marque o tipo de exame e informe a região anatômica e se haverá contraste." },
  { label: /historico clinico$/, hint: "Resumo do caso: há quanto tempo, como evoluiu e tratamentos já feitos." },
  { label: /terapia proposta/, hint: "Marque a terapia indicada; em \"Outro\", descreva." },
  { label: /^3 finalidade$/, hint: "Curativa = eliminar a doença; controle = manter estável; paliativa = qualidade de vida." },
  { label: /objetivo da pesquisa/, hint: "Objetivo do estudo, em linguagem simples para o responsável." },
  { label: /procedimentos a que o animal/, hint: "O que será feito com o animal no estudo (coletas, medicações, exames, retornos)." },
  { label: /riscos e desconfortos/, hint: "Riscos e desconfortos previstos, mesmo os pequenos." },
  { label: /quadro clinico e indicacao/, hint: "Marque o regime de internação indicado e o prazo estimado." },
  { label: /monitoramento de qualidade de vida/, hint: "Como a qualidade de vida será acompanhada: escala usada e datas das reavaliações." },
  { label: /orcamento de servicos/, hint: "Liste os serviços e valores — use os mesmos do orçamento combinado com o responsável." },
  { label: /quem apresentou/, hint: "Dados de quem trouxe o animal." },
  { label: /historico relatado/, hint: "O que a pessoa contou sobre o que aconteceu, com as palavras dela." },
  { label: /achados clinicos objetivos/, hint: "Descreva o que foi encontrado no exame, de forma objetiva, sem conclusões." },
  { label: /exames complementares realizados/, hint: "Exames feitos e resultados que sustentam a notificação." },
  { label: /conduta adotada/, hint: "O que foi feito: tratamento, internação, comunicação às autoridades." },
  { label: /notificacao extrajudicial/, hint: "Datas de entrada e de alta, datas das tentativas de contato e o valor já acumulado com a guarda." },
];

function findRule(rules: HintRule[], label: string, section: string): string | undefined {
  const l = normalizeHintKey(label);
  const s = normalizeHintKey(section);
  return rules.find((r) => (!r.section || r.section.test(s)) && r.label.test(l))?.hint;
}

/** Dica de uma linha do formulário, pelo rótulo (texto antes do primeiro campo). */
export function hintForLine(label: string, section: string): string | undefined {
  if (!label.trim()) return undefined;
  return findRule(LINE_RULES, label, section);
}

/** Dica de uma seção inteira (opções sem rótulo próprio, ex.: "( ) Oxigenoterapia"). */
export function hintForSection(section: string): string | undefined {
  if (!section.trim()) return undefined;
  return findRule(SECTION_RULES, section, "");
}

// Variáveis {{escopo.campo}} que não vêm de cadastro nenhum (etapa
// "Complete os dados que faltam").
const VARIABLE_HINTS: Record<string, string> = {
  "atend.procedimento": "Nome do procedimento (ex.: ovariohisterectomia eletiva, profilaxia dentária com extrações).",
  "atend.protocolo_anestesico": "Fármacos e doses previstos (ex.: MPA com metadona; indução com propofol; manutenção com isoflurano).",
  "atend.comorbidades": "Doenças associadas que aumentam o risco (ex.: cardiopatia, doença renal). Escreva \"nenhuma\" se não houver.",
  "atend.diagnostico": "Diagnóstico definitivo ou o mais provável no momento.",
  "atend.diagnostico_presuntivo": "Suspeita clínica que motivou o exame.",
  "atend.anamnese": "Resumo do histórico: queixa, há quanto tempo, evolução e tratamentos já feitos.",
  "atend.exame_fisico": "Principais achados do exame físico.",
  "atend.exames": "Exames realizados e principais resultados.",
  "atend.medicamentos": "Medicações em uso, com dose e frequência.",
  "atend.tratamento": "Tratamento realizado ou indicado.",
  "atend.tratamento_indicado": "O tratamento que você indicou e o responsável recusou.",
  "atend.motivo_encaminhamento": "Por que o paciente está sendo encaminhado e o que você espera do colega.",
  "atend.observacoes": "Informações adicionais que devem constar no documento. Pode deixar em branco.",
  "atend.causa_mortis": "Causa da morte (ou a suspeita, se não confirmada).",
  "atend.conduta_recomendada": "O que você recomendou fazer.",
  "atend.consequencias_recusa": "O que pode acontecer por não fazer o que foi indicado (piora, dor, risco de morte). Uma consequência por linha.",
  "atend.descricao_cirurgia": "Como a cirurgia será feita, em linguagem que o responsável entenda.",
  "atend.descricao_exame": "Como o exame é feito, em linguagem simples.",
  "atend.exames_indicados": "Exames que serão feitos. Um por linha.",
  "atend.justificativa": "Por que o procedimento é necessário para este paciente.",
  "atend.justificativa_eutanasia": "Quadro clínico e motivos técnicos que indicam a eutanásia.",
  "atend.prazo_resultado": "Quando o resultado deve ficar pronto (ex.: 3 dias úteis).",
  "atend.prognostico": "Prognóstico esperado (favorável, reservado, desfavorável) e por quê.",
  "atend.quadro_atual": "Como o paciente está agora.",
  "atend.riscos_especificos": "Riscos próprios deste paciente/procedimento, além dos que o termo já lista. Um por linha.",
  "atend.riscos_exame": "Riscos do exame (ex.: hematoma no local da coleta).",
  "atend.riscos_funcao": "Riscos ligados ao estado do paciente (ex.: idoso, cardiopata).",
  "atend.alternativas": "Outras opções que existem além da indicada.",
  "atend.valor": "Valor estimado em reais.",
  "atend.hora": "Hora do atendimento (ex.: 14:30).",
  "atend.hora_entrada": "Hora em que o responsável chegou.",
  "atend.hora_saida": "Hora em que o responsável saiu.",
  "exame.descricao": "Exame solicitado (ex.: ultrassonografia abdominal total).",
  "exame.requisitos": "Exigências técnicas do exame. Uma por linha (ex.: projeções obrigatórias, fases, espessura de corte).",
  "exame.objetivos": "Perguntas que o exame deve responder. Uma por linha.",
  "exame.observacoes": "Cuidados especiais (ex.: animal agressivo, cardiopata).",
  "exame.lista": "Exames solicitados ao laboratório. Um por linha.",
  "doc.validade": "Até quando o documento vale (ex.: 10 dias).",
  "doc.local_obito": "Onde o animal morreu (ex.: na clínica, em casa).",
  "doc.acondicionamento": "Como o corpo foi entregue (ex.: saco plástico duplo, caixa).",
  "doc.destinacao": "Para onde o corpo vai (ex.: cremação, sepultamento em cemitério licenciado).",
  "doc.numero": "Número do orçamento.",
  "vet.telefone": "Seu telefone de contato — dá para salvar no seu perfil para não digitar sempre.",
  "vet.email": "Seu e-mail — dá para salvar no seu perfil para não digitar sempre.",
};

/** Dica de um campo da etapa "Complete os dados que faltam" ({{escopo.campo}}). */
export function hintForVariable(path: string): string | undefined {
  if (VARIABLE_HINTS[path]) return VARIABLE_HINTS[path];
  const scope = path.split(".")[0];
  if (scope === "pac" || scope === "paciente" || scope === "animal") {
    return "Vem do cadastro do paciente — completando o cadastro, não precisa digitar de novo nos próximos documentos.";
  }
  if (scope === "resp") {
    return "Vem do cadastro do responsável — completando o cadastro, não precisa digitar de novo nos próximos documentos.";
  }
  if (scope === "estab" || scope === "clinica") {
    return "Vem das configurações da clínica — preenchendo lá, sai em todos os documentos.";
  }
  return undefined;
}
