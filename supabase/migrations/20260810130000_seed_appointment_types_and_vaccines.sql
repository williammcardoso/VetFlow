-- Tipos de Atendimento e Vacinas viviam só como lista fixa no código
-- (AppointmentForm.tsx), então Cadastros > Tipos de Atendimento / Vacinas
-- aparecia vazio mesmo sendo consumido de verdade no formulário de
-- agendamento. Migra os valores fixos pra dentro do registry, marcados como
-- "protected" — RegistryManager.tsx trava nome/remoção desses (travam
-- comportamento em várias partes do app: qual sub-formulário renderiza,
-- validação, PDF, alertas do Dashboard); tudo que não é "protected" continua
-- 100% editável/removível normalmente.

insert into public.registry (id, key, name, extra)
select gen_random_uuid()::text, 'appointmentTypes', v.name, jsonb_build_object('protected', true)
from (values
  ('Consulta'),
  ('Consulta (Modelo Antigo)'),
  ('Cirurgia'),
  ('Retorno'),
  ('Vacina'),
  ('Emergência')
) as v(name)
where not exists (
  select 1 from public.registry r where r.key = 'appointmentTypes' and r.name = v.name
);

insert into public.registry (id, key, name, extra)
select gen_random_uuid()::text, 'vaccines', v.name, v.extra
from (values
  ('V8 (Óctupla)', '{}'::jsonb),
  ('V10 (Déctupla)', '{}'::jsonb),
  ('Antirrábica', '{}'::jsonb),
  ('Gripe Canina (Tosse dos Canis)', '{}'::jsonb),
  ('Giardia', '{}'::jsonb),
  ('Leishmaniose', '{}'::jsonb),
  ('V3 Felina (Tríplice)', '{}'::jsonb),
  ('V4 Felina (Quadrúpla)', '{}'::jsonb),
  ('V5 Felina (Quíntupla)', '{}'::jsonb),
  ('FeLV (Leucemia Felina)', '{}'::jsonb),
  ('Outra', jsonb_build_object('protected', true))
) as v(name, extra)
where not exists (
  select 1 from public.registry r where r.key = 'vaccines' and r.name = v.name
);
