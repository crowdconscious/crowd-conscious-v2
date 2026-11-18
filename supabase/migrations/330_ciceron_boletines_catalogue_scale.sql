-- 330_ciceron_boletines_catalogue_scale.sql
-- APPROVAL REQUIRED — do not apply without CTO sign-off.
-- B6 F1/F3 production demo seed: state-style case files + ~400 fictional catalogue rows.
-- Additive / upsert only. Never contains a real firm catalogue.
-- Agent must NOT apply this migration.

-- Remap legacy federal DEMO- sample case files to state-court labels
UPDATE ciceron.case_files
SET court_name = 'Trigésimo Primero Civil de Proceso Oral',
    file_number = '1001/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000001'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Juzgado Décimo Primero Civil',
    file_number = '220/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000002'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Juzgado Cuarto de lo Mercantil',
    file_number = '331/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000003'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Juzgado Primero Civil de Proceso Oral del Estado de México',
    file_number = '404/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000004'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Juzgado Segundo Mercantil — Ciudad Judicial',
    file_number = '515/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000005'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Juzgado Civil de Cuantía Mayor',
    file_number = '616/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000006'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Juzgado Primero Familiar de Proceso Oral',
    file_number = '717/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000007'::uuid;

UPDATE ciceron.case_files
SET court_name = 'Trigésimo Segundo Civil de Proceso Oral',
    file_number = '808/2026',
    is_sample = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"label":"Datos de demostración","style":"state"}'::jsonb
WHERE id = 'f1000000-0000-4000-8000-000000000008'::uuid;

-- Fictional bulletin matter catalogue (399 rows)
INSERT INTO ciceron.bulletin_matter_catalogue (
  id, firm_id, matter_id, case_file_id, state_code, state_name,
  court_name, expediente_number, party_name_variants, is_active, is_demo, notes
) VALUES
  (
    'b7500000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'AGS', 'Aguascalientes',
    'Juzgado Primero Civil Aguascalientes', '117/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'BC', 'Baja California',
    'Juzgado Primero Civil Tijuana', '134/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'BCS', 'Baja California Sur',
    'Juzgado Primero Civil La Paz', '151/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CHIS', 'Chiapas',
    'Juzgado Primero Civil Tuxtla', '168/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000005'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CHIS', 'Chiapas',
    'Juzgado Primero Civil Tuxtla', '185/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000006'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CHIS', 'Chiapas',
    'Juzgado Primero Civil Tuxtla', '202/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000007'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CHIS', 'Chiapas',
    'Juzgado Primero Civil Tuxtla', '219/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000008'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CHIS', 'Chiapas',
    'Juzgado Primero Civil Tuxtla', '236/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000009'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '253/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000000a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '270/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000000b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '287/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000000c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '304/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000000d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '321/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000000e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '338/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000000f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '355/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000010'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '372/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000011'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '389/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000012'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '406/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000013'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CHIH', 'Chihuahua',
    'Juzgado Primero Civil Chihuahua', '423/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000014'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil de Proceso Oral', '440/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000015'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil', '457/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000016'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Mercantil', '474/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000017'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil de Proceso Oral', '491/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000018'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil', '508/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000019'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Mercantil', '525/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000001a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil de Proceso Oral', '542/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000001b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil', '559/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000001c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Mercantil', '576/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000001d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil de Proceso Oral', '593/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000001e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil', '610/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000001f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Mercantil', '627/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000020'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil de Proceso Oral', '644/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000021'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil', '661/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000022'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Mercantil', '678/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000023'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil de Proceso Oral', '695/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000024'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil', '712/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000025'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Mercantil', '729/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000026'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil de Proceso Oral', '746/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000027'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil', '763/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000028'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Mercantil', '780/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000029'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil de Proceso Oral', '797/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000002a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil', '814/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000002b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Mercantil', '831/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000002c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil de Proceso Oral', '848/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000002d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil', '865/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000002e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Mercantil', '882/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000002f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil de Proceso Oral', '899/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000030'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil', '916/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000031'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Mercantil', '933/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000032'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil de Proceso Oral', '950/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000033'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil', '967/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000034'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Mercantil', '984/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000035'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil de Proceso Oral', '101/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000036'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil', '118/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000037'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Mercantil', '135/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000038'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil de Proceso Oral', '152/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000039'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil', '169/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000003a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Mercantil', '186/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000003b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil de Proceso Oral', '203/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000003c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil', '220/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000003d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Mercantil', '237/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000003e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil de Proceso Oral', '254/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000003f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil', '271/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000040'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Mercantil', '288/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000041'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil de Proceso Oral', '305/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000042'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil', '322/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000043'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Mercantil', '339/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000044'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil de Proceso Oral', '356/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000045'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil', '373/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000046'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Mercantil', '390/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000047'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil de Proceso Oral', '407/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000048'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil', '424/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000049'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Mercantil', '441/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000004a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil de Proceso Oral', '458/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000004b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil', '475/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000004c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Mercantil', '492/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000004d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil de Proceso Oral', '509/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000004e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil', '526/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000004f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Mercantil', '543/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000050'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil de Proceso Oral', '560/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000051'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil', '577/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000052'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Mercantil', '594/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000053'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil de Proceso Oral', '611/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000054'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil', '628/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000055'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Mercantil', '645/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000056'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil de Proceso Oral', '662/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000057'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil', '679/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000058'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Mercantil', '696/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000059'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil de Proceso Oral', '713/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000005a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil', '730/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000005b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Mercantil', '747/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000005c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil de Proceso Oral', '764/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000005d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil', '781/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000005e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Mercantil', '798/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000005f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil de Proceso Oral', '815/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000060'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil', '832/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000061'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Mercantil', '849/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000062'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil de Proceso Oral', '866/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000063'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil', '883/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000064'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Mercantil', '900/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000065'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil de Proceso Oral', '917/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000066'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil', '934/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000067'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Mercantil', '951/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000068'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil de Proceso Oral', '968/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000069'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil', '985/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000006a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Mercantil', '102/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000006b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil de Proceso Oral', '119/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000006c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil', '136/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000006d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Mercantil', '153/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000006e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil de Proceso Oral', '170/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000006f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil', '187/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000070'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Mercantil', '204/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000071'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil de Proceso Oral', '221/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000072'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil', '238/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000073'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Mercantil', '255/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000074'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil de Proceso Oral', '272/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000075'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil', '289/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000076'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Mercantil', '306/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000077'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil de Proceso Oral', '323/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000078'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil', '340/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000079'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Mercantil', '357/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000007a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil de Proceso Oral', '374/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000007b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil', '391/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000007c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Mercantil', '408/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000007d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil de Proceso Oral', '425/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000007e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil', '442/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000007f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Mercantil', '459/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000080'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil de Proceso Oral', '476/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000081'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil', '493/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000082'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Mercantil', '510/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000083'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil de Proceso Oral', '527/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000084'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil', '544/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000085'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Mercantil', '561/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000086'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil de Proceso Oral', '578/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000087'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil', '595/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000088'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Mercantil', '612/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000089'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil de Proceso Oral', '629/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000008a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil', '646/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000008b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Mercantil', '663/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000008c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil de Proceso Oral', '680/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000008d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil', '697/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000008e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Mercantil', '714/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000008f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil de Proceso Oral', '731/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000090'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil', '748/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000091'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Mercantil', '765/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000092'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil de Proceso Oral', '782/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000093'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil', '799/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000094'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Mercantil', '816/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000095'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil de Proceso Oral', '833/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000096'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil', '850/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000097'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Mercantil', '867/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000098'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil de Proceso Oral', '884/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000099'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil', '901/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000009a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Mercantil', '918/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000009b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil de Proceso Oral', '935/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000009c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil', '952/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000009d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Mercantil', '969/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000009e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil de Proceso Oral', '986/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000009f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil', '103/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a0'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Mercantil', '120/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a1'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil de Proceso Oral', '137/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a2'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil', '154/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a3'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Mercantil', '171/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a4'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil de Proceso Oral', '188/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a5'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil', '205/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a6'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Mercantil', '222/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a7'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil de Proceso Oral', '239/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a8'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil', '256/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000a9'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Mercantil', '273/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000aa'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil de Proceso Oral', '290/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ab'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil', '307/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ac'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Mercantil', '324/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ad'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil de Proceso Oral', '341/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ae'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil', '358/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000af'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Mercantil', '375/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b0'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil de Proceso Oral', '392/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b1'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil', '409/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b2'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Mercantil', '426/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b3'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil de Proceso Oral', '443/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b4'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil', '460/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b5'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Mercantil', '477/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b6'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil de Proceso Oral', '494/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b7'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil', '511/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b8'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Mercantil', '528/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000b9'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil de Proceso Oral', '545/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ba'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil', '562/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000bb'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Mercantil', '579/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000bc'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil de Proceso Oral', '596/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000bd'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil', '613/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000be'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Mercantil', '630/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000bf'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil de Proceso Oral', '647/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c0'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil', '664/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c1'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Mercantil', '681/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c2'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil de Proceso Oral', '698/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c3'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil', '715/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c4'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Mercantil', '732/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c5'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil de Proceso Oral', '749/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c6'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil', '766/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c7'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Mercantil', '783/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c8'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil de Proceso Oral', '800/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000c9'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil', '817/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ca'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Mercantil', '834/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000cb'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil de Proceso Oral', '851/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000cc'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil', '868/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000cd'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Mercantil', '885/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ce'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil de Proceso Oral', '902/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000cf'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil', '919/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d0'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Mercantil', '936/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d1'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil de Proceso Oral', '953/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d2'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil', '970/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d3'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Mercantil', '987/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d4'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil de Proceso Oral', '104/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d5'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil', '121/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d6'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Mercantil', '138/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d7'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil de Proceso Oral', '155/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d8'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil', '172/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000d9'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Mercantil', '189/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000da'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil de Proceso Oral', '206/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000db'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil', '223/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000dc'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Mercantil', '240/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000dd'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil de Proceso Oral', '257/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000de'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil', '274/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000df'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Mercantil', '291/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e0'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil de Proceso Oral', '308/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e1'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil', '325/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e2'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Mercantil', '342/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e3'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil de Proceso Oral', '359/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e4'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Civil', '376/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e5'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Mercantil', '393/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e6'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil de Proceso Oral', '410/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e7'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Civil', '427/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e8'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Mercantil', '444/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000e9'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil de Proceso Oral', '461/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ea'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Civil', '478/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000eb'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Mercantil', '495/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ec'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil de Proceso Oral', '512/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ed'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Civil', '529/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ee'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Mercantil', '546/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ef'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil de Proceso Oral', '563/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f0'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Civil', '580/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f1'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Mercantil', '597/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f2'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil de Proceso Oral', '614/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f3'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Civil', '631/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f4'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Mercantil', '648/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f5'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil de Proceso Oral', '665/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f6'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Civil', '682/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f7'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Mercantil', '699/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f8'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Noveno Civil de Proceso Oral', '716/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000f9'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Civil', '733/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000fa'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Primero Mercantil', '750/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000fb'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Segundo Civil de Proceso Oral', '767/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000fc'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Tercero Civil', '784/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000fd'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Cuarto Mercantil', '801/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000fe'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Décimo Quinto Civil de Proceso Oral', '818/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-0000000000ff'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Civil', '835/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000100'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Vigésimo Primero Mercantil', '852/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000101'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Civil de Proceso Oral', '869/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000102'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Primero Civil', '886/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000103'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Trigésimo Segundo Mercantil', '903/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000104'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuadragésimo Civil de Proceso Oral', '920/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000105'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quincuagésimo Civil', '937/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000106'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Primero Mercantil', '954/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000107'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Segundo Civil de Proceso Oral', '971/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000108'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Tercero Civil', '988/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000109'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Cuarto Mercantil', '105/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000010a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Quinto Civil de Proceso Oral', '122/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000010b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Sexto Civil', '139/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000010c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Séptimo Mercantil', '156/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000010d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'CDMX', 'Ciudad de México',
    'Juzgado Octavo Civil de Proceso Oral', '173/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000010e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'COAH', 'Coahuila',
    'Juzgado Primero Civil Saltillo', '190/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000010f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'COAH', 'Coahuila',
    'Juzgado Primero Civil Saltillo', '207/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000110'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'COAH', 'Coahuila',
    'Juzgado Primero Civil Saltillo', '224/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000111'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'COAH', 'Coahuila',
    'Juzgado Primero Civil Saltillo', '241/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000112'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'COAH', 'Coahuila',
    'Juzgado Primero Civil Saltillo', '258/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000113'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'COAH', 'Coahuila',
    'Juzgado Primero Civil Saltillo', '275/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000114'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'DGO', 'Durango',
    'Juzgado Primero Civil Durango', '292/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000115'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'DGO', 'Durango',
    'Juzgado Primero Civil Durango', '309/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000116'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '326/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000117'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '343/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000118'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '360/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000119'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '377/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000011a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '394/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000011b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '411/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000011c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '428/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000011d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '445/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000011e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '462/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000011f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '479/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000120'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '496/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000121'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '513/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000122'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '530/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000123'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '547/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000124'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '564/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000125'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '581/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000126'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '598/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000127'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '615/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000128'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '632/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000129'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '649/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000012a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '666/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000012b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '683/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000012c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '700/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000012d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '717/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000012e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '734/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000012f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '751/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000130'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '768/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000131'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '785/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000132'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '802/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000133'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '819/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000134'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '836/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000135'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '853/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000136'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '870/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000137'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '887/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000138'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '904/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000139'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '921/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000013a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '938/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000013b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '955/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000013c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '972/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000013d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '989/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000013e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '106/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000013f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '123/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000140'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '140/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000141'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '157/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000142'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '174/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000143'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '191/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000144'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '208/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000145'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '225/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000146'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '242/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000147'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '259/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000148'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '276/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000149'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'GRO', 'Guerrero',
    'Juzgado Primero Civil Acapulco', '293/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000014a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'HGO', 'Hidalgo',
    'Juzgado Primero Civil Pachuca', '310/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000014b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'HGO', 'Hidalgo',
    'Juzgado Primero Civil Pachuca', '327/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000014c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'HGO', 'Hidalgo',
    'Juzgado Primero Civil Pachuca', '344/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000014d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '361/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000014e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '378/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000014f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '395/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000150'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '412/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000151'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '429/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000152'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '446/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000153'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '463/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000154'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '480/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000155'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '497/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000156'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '514/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000157'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'MICH', 'Michoacán',
    'Juzgado Primero Civil Morelia', '531/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000158'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'MICH', 'Michoacán',
    'Juzgado Primero Civil Morelia', '548/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000159'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'MOR', 'Morelos',
    'Juzgado Primero Civil Cuernavaca', '565/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000015a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'MOR', 'Morelos',
    'Juzgado Primero Civil Cuernavaca', '582/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000015b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '599/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000015c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '616/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000015d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '633/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000015e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '650/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000015f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '667/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000160'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '684/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000161'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '701/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000162'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '718/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000163'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'NL', 'Nuevo León',
    'Juzgado Primero Civil Monterrey', '735/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000164'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'OAX', 'Oaxaca',
    'Juzgado Primero Civil Oaxaca', '752/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000165'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'PUE', 'Puebla',
    'Juzgado Primero Civil Puebla', '769/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000166'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'PUE', 'Puebla',
    'Juzgado Primero Civil Puebla', '786/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000167'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'PUE', 'Puebla',
    'Juzgado Primero Civil Puebla', '803/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000168'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'PUE', 'Puebla',
    'Juzgado Primero Civil Puebla', '820/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000169'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'PUE', 'Puebla',
    'Juzgado Primero Civil Puebla', '837/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000016a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '854/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000016b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '871/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000016c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '888/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000016d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '905/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000016e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '922/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000016f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '939/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000170'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '956/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000171'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '973/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000172'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '990/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000173'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '107/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000174'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '124/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000175'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '141/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000176'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '158/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000177'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '175/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000178'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'QROO', 'Quintana Roo',
    'Juzgado Primero Civil Cancún', '192/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000179'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'QROO', 'Quintana Roo',
    'Juzgado Primero Civil Cancún', '209/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000017a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'QROO', 'Quintana Roo',
    'Juzgado Primero Civil Cancún', '226/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000017b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'QROO', 'Quintana Roo',
    'Juzgado Primero Civil Cancún', '243/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000017c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'QROO', 'Quintana Roo',
    'Juzgado Primero Civil Cancún', '260/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000017d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'QROO', 'Quintana Roo',
    'Juzgado Primero Civil Cancún', '277/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000017e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'SON', 'Sonora',
    'Juzgado Primero Civil Hermosillo', '294/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000017f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'SON', 'Sonora',
    'Juzgado Primero Civil Hermosillo', '311/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000180'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'SON', 'Sonora',
    'Juzgado Primero Civil Hermosillo', '328/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000181'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'SON', 'Sonora',
    'Juzgado Primero Civil Hermosillo', '345/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000182'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'SON', 'Sonora',
    'Juzgado Primero Civil Hermosillo', '362/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000183'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'TAB', 'Tabasco',
    'Juzgado Primero Civil Villahermosa', '379/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000184'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'TAB', 'Tabasco',
    'Juzgado Primero Civil Villahermosa', '396/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000185'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'TAB', 'Tabasco',
    'Juzgado Primero Civil Villahermosa', '413/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000186'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'TAB', 'Tabasco',
    'Juzgado Primero Civil Villahermosa', '430/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000187'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'TAB', 'Tabasco',
    'Juzgado Primero Civil Villahermosa', '447/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000188'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'TAB', 'Tabasco',
    'Juzgado Primero Civil Villahermosa', '464/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-000000000189'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'TAMPS', 'Tamaulipas',
    'Juzgado Primero Civil Tampico', '481/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000018a'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'TAMPS', 'Tamaulipas',
    'Juzgado Primero Civil Tampico', '498/2025',
    ARRAY['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000018b'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    NULL,
    'TAMPS', 'Tamaulipas',
    'Juzgado Primero Civil Tampico', '515/2026',
    ARRAY['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000018c'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    NULL,
    'TAMPS', 'Tamaulipas',
    'Juzgado Primero Civil Tampico', '532/2024',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000018d'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'TAMPS', 'Tamaulipas',
    'Juzgado Primero Civil Tampico', '549/2025',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000018e'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'YUC', 'Yucatán',
    'Juzgado Primero Civil Mérida', '566/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  ),
  (
    'b7500000-0000-4000-8000-00000000018f'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'YUC', 'Yucatán',
    'Juzgado Primero Civil Mérida', '583/2024',
    ARRAY['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
    true, true, 'Datos de demostración — catálogo ficticio B6 F3'
  )
ON CONFLICT (id) DO UPDATE
  SET matter_id = EXCLUDED.matter_id,
      state_code = EXCLUDED.state_code,
      state_name = EXCLUDED.state_name,
      court_name = EXCLUDED.court_name,
      expediente_number = EXCLUDED.expediente_number,
      party_name_variants = EXCLUDED.party_name_variants,
      notes = EXCLUDED.notes,
      is_active = true,
      is_demo = true;
