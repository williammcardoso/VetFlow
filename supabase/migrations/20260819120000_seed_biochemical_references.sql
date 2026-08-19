-- Cadastra/atualiza de uma vez as referências bioquímicas (cães/gatos)
-- informadas pelo usuário (fonte externa, lacorst.com.br), em
-- settings.value->'biochemical' (key = 'examReferences').
--
-- Faz merge só na chave "biochemical" (jsonb_set + ||): não mexe em
-- "hemogram" nem em outros analitos bioquímicos já cadastrados que não
-- estejam nesta lista (ex.: algo lançado via "Outro" anteriormente).
-- Os nomes usados abaixo são os mesmos da lista fixa do app
-- (DEFAULT_BIOCHEMICAL_NAMES em src/constants/examReferences.ts) —
-- precisa bater exatamente para o lançamento de exame já vir preenchido.
-- "Globulinas" não está na lista fixa (só existe se lançada via "Outro"),
-- mantida com esse nome para já vir pronta se/quando for usada.

insert into public.settings (key, value, updated_at)
values (
  'examReferences',
  jsonb_build_object(
    'biochemical',
    jsonb_build_object(
      'Ureia',                      jsonb_build_object('unit', 'mg/dL', 'dog', jsonb_build_object('min', 20,  'max', 46),  'cat', jsonb_build_object('min', 25,  'max', 60)),
      'Creatinina',                  jsonb_build_object('unit', 'mg/dL', 'dog', jsonb_build_object('min', 0.5, 'max', 1.5), 'cat', jsonb_build_object('min', 0.8, 'max', 2.4)),
      'ALT (TGP)',                   jsonb_build_object('unit', 'U/L',   'dog', jsonb_build_object('min', 10,  'max', 118), 'cat', jsonb_build_object('min', 12,  'max', 130)),
      'ALP (Fosfatase Alcalina)',    jsonb_build_object('unit', 'U/L',   'dog', jsonb_build_object('min', 20,  'max', 156), 'cat', jsonb_build_object('min', 14,  'max', 111)),
      'AST (TGO)',                   jsonb_build_object('unit', 'U/L',   'dog', jsonb_build_object('min', 10,  'max', 42),  'cat', jsonb_build_object('min', 10,  'max', 38)),
      'GGT',                         jsonb_build_object('unit', 'U/L',   'dog', jsonb_build_object('min', 1,   'max', 12),  'cat', jsonb_build_object('min', 1,   'max', 6)),
      'Proteínas totais',            jsonb_build_object('unit', 'g/dL',  'dog', jsonb_build_object('min', 5.4, 'max', 7.1), 'cat', jsonb_build_object('min', 5.7, 'max', 8.9)),
      'Albumina',                    jsonb_build_object('unit', 'g/dL',  'dog', jsonb_build_object('min', 2.6, 'max', 3.3), 'cat', jsonb_build_object('min', 2.2, 'max', 4.0)),
      'Globulinas',                  jsonb_build_object('unit', 'g/dL',  'dog', jsonb_build_object('min', 2.7, 'max', 4.4), 'cat', jsonb_build_object('min', 2.8, 'max', 5.1)),
      'Glicose',                     jsonb_build_object('unit', 'mg/dL', 'dog', jsonb_build_object('min', 70,  'max', 110), 'cat', jsonb_build_object('min', 70,  'max', 150)),
      'Colesterol',                  jsonb_build_object('unit', 'mg/dL', 'dog', jsonb_build_object('min', 135, 'max', 270), 'cat', jsonb_build_object('min', 75,  'max', 220)),
      'Cálcio',                      jsonb_build_object('unit', 'mg/dL', 'dog', jsonb_build_object('min', 9.0, 'max', 11.5),'cat', jsonb_build_object('min', 8.0, 'max', 11.8)),
      'Fósforo',                     jsonb_build_object('unit', 'mg/dL', 'dog', jsonb_build_object('min', 2.5, 'max', 6.0), 'cat', jsonb_build_object('min', 2.6, 'max', 6.0))
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
