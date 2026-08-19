-- Continuação de 20260819120000_seed_biochemical_references.sql: mais 7
-- analitos bioquímicos (cães/gatos) informados pelo usuário. Mesma
-- estratégia de merge (só mexe em settings.value->'biochemical', preserva
-- hemogram e os analitos já cadastrados fora desta lista). Nos casos com
-- mais de uma faixa por metodologia, foi usada a faixa principal citada
-- pelo usuário (não a alternativa entre parênteses).

insert into public.settings (key, value, updated_at)
values (
  'examReferences',
  jsonb_build_object(
    'biochemical',
    jsonb_build_object(
      'Amilase',              jsonb_build_object('unit', 'U/L',     'dog', jsonb_build_object('min', 185, 'max', 700), 'cat', jsonb_build_object('min', 185, 'max', 700)),
      'Lipase',                jsonb_build_object('unit', 'U/L',     'dog', jsonb_build_object('min', 25,  'max', 750), 'cat', jsonb_build_object('min', 25,  'max', 375)),
      'Triglicerídeos',        jsonb_build_object('unit', 'mg/dL',   'dog', jsonb_build_object('min', 20,  'max', 112), 'cat', jsonb_build_object('min', 10,  'max', 114)),
      'Bilirrubina total',     jsonb_build_object('unit', 'mg/dL',   'dog', jsonb_build_object('min', 0.10,'max', 0.50),'cat', jsonb_build_object('min', 0.15,'max', 0.60)),
      'Bilirrubina direta',    jsonb_build_object('unit', 'mg/dL',   'dog', jsonb_build_object('min', 0.06,'max', 0.12),'cat', jsonb_build_object('min', 0.00,'max', 0.30)),
      'CK (CPK)',              jsonb_build_object('unit', 'U/L',     'dog', jsonb_build_object('min', 20,  'max', 200), 'cat', jsonb_build_object('min', 50,  'max', 450)),
      'Frutosamina',           jsonb_build_object('unit', 'µmol/L',  'dog', jsonb_build_object('min', 170, 'max', 338), 'cat', jsonb_build_object('min', 219, 'max', 347))
    )
  ),
  now()
)
on conflict (key) do update
set value = jsonb_set(
      coalesce(public.settings.value, '{}'::jsonb),
      '{biochemical}',
      coalesce(public.settings.value->'biochemical', '{}'::jsonb) || (excluded.value->'biochemical')
    ),
    updated_at = now();
