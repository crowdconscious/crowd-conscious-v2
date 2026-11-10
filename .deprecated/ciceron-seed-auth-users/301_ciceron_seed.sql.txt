-- 301_ciceron_seed.sql
-- Idempotent fictional seed for the Cicéron demo. All names invented.
-- Label: Datos de demostración. Do NOT use real companies, people, or case numbers.
-- Depends on 298–300. Creates auth.users for branch/demo only.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Demo auth users (email .invalid; password is disposable for branch testing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Insert only when missing (idempotent across re-runs).

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b1000000-0000-4000-8000-000000000001'::uuid) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1000000-0000-4000-8000-000000000001'::uuid,
      'authenticated',
      'authenticated',
      'socio.demo@ciceron.demo.invalid',
      extensions.crypt('ciceron-demo-only', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Datos de demostración — Socia Demo Rivera","ciceron_demo":true}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b1000000-0000-4000-8000-000000000002'::uuid) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1000000-0000-4000-8000-000000000002'::uuid,
      'authenticated',
      'authenticated',
      'asociado.demo@ciceron.demo.invalid',
      extensions.crypt('ciceron-demo-only', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Datos de demostración — Asociado Demo Herrera","ciceron_demo":true}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b1000000-0000-4000-8000-000000000003'::uuid) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1000000-0000-4000-8000-000000000003'::uuid,
      'authenticated',
      'authenticated',
      'pasante.demo@ciceron.demo.invalid',
      extensions.crypt('ciceron-demo-only', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Datos de demostración — Pasante Demo López","ciceron_demo":true}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b1000000-0000-4000-8000-000000000004'::uuid) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1000000-0000-4000-8000-000000000004'::uuid,
      'authenticated',
      'authenticated',
      'admin.demo@ciceron.demo.invalid',
      extensions.crypt('ciceron-demo-only', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Datos de demostración — Admin Demo Ortega","ciceron_demo":true}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b1000000-0000-4000-8000-000000000005'::uuid) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1000000-0000-4000-8000-000000000005'::uuid,
      'authenticated',
      'authenticated',
      'asociado2.demo@ciceron.demo.invalid',
      extensions.crypt('ciceron-demo-only', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Datos de demostración — Asociada Demo Méndez","ciceron_demo":true}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b1000000-0000-4000-8000-000000000011'::uuid) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'b1000000-0000-4000-8000-000000000011'::uuid,
      'authenticated',
      'authenticated',
      'contraste.demo@ciceron.demo.invalid',
      extensions.crypt('ciceron-demo-only', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Datos de demostración — Abogado Contraste Núñez","ciceron_demo":true}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;
END $$;

-- Identities (best-effort; column sets differ across Supabase versions)
DO $$
BEGIN
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT u.id, u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email', u.id::text, now(), now(), now()
  FROM auth.users u
  WHERE u.id IN (
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000002'::uuid,
    'b1000000-0000-4000-8000-000000000003'::uuid,
    'b1000000-0000-4000-8000-000000000004'::uuid,
    'b1000000-0000-4000-8000-000000000005'::uuid,
    'b1000000-0000-4000-8000-000000000011'::uuid
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );
EXCEPTION
  WHEN undefined_column OR unique_violation OR not_null_violation THEN
    RAISE NOTICE 'auth.identities seed skipped (%)', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Firms
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.firms (id, name, slug, is_demo)
VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'Despacho Demo, S.C.', 'despacho-demo', true),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'Bufete Contraste, S.C.', 'bufete-contraste', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_demo = true;

INSERT INTO ciceron.memberships (firm_id, user_id, role) VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000001'::uuid, 'socio'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000002'::uuid, 'asociado'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000003'::uuid, 'pasante'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000004'::uuid, 'admin'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000005'::uuid, 'asociado'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'b1000000-0000-4000-8000-000000000011'::uuid, 'socio')
ON CONFLICT (firm_id, user_id) DO UPDATE SET role = EXCLUDED.role;
-- Clients (Datos de demostración)
INSERT INTO ciceron.clients (id, firm_id, display_name, external_ref, is_demo) VALUES
  ('c1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Nexora Pagos, S.A.P.I. de C.V.', 'fintech', true),
  ('c1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Distribuidora Farma Sierra, S.A. de C.V.', 'salud', true),
  ('c1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Viento del Istmo Energía, S.A.P.I. de C.V.', 'energia', true),
  ('c1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Agencia Aduanal Delta del Pacífico, S.C.', 'comercio_exterior', true),
  ('c1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Fondo Pedregal Inmuebles, S.A. de C.V.', 'inmobiliario', true),
  ('c1000000-0000-4000-8000-000000000006'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Alimentos del Bajío Integrados, S.A. de C.V.', 'alimentos', true),
  ('c1000000-0000-4000-8000-000000000101'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 'Comercializadora Contraste Demo, S.A. de C.V.', 'aislamiento', true)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, is_demo = true;

INSERT INTO ciceron.matters (id, firm_id, client_id, title, matter_ref, is_demo) VALUES
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000001'::uuid, 'Licencia CNBV y prevención de lavado', 'DEMO-NEXORA_CNBV', true),
  ('d1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000001'::uuid, 'Contratos con instituciones de crédito', 'DEMO-NEXORA_PLD', true),
  ('d1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000002'::uuid, 'Autorizaciones COFEPRIS y cadena de frío', 'DEMO-FARMA_COFEPRIS', true),
  ('d1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000003'::uuid, 'Permisos CRE y evaluación de impacto ambiental', 'DEMO-VIENTO_CRE', true),
  ('d1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000004'::uuid, 'Clasificación arancelaria y auditorías SAT', 'DEMO-ADUANAS_SAT', true),
  ('d1000000-0000-4000-8000-000000000006'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000005'::uuid, 'Portafolio de arrendamiento CDMX', 'DEMO-FONDO_INMUEBLES', true),
  ('d1000000-0000-4000-8000-000000000007'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000006'::uuid, 'Etiquetado frontal y NOM de inocuidad', 'DEMO-ALIM_NOM', true),
  ('d1000000-0000-4000-8000-000000000008'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 'c1000000-0000-4000-8000-000000000101'::uuid, 'Asunto único de aislamiento (demo)', 'DEMO-FIRM_B_UNICO', true)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, is_demo = true;

INSERT INTO ciceron.matter_members (matter_id, user_id, role) VALUES
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000003'::uuid, 'apoyo'),
  ('d1000000-0000-4000-8000-000000000003'::uuid, 'b1000000-0000-4000-8000-000000000003'::uuid, 'apoyo'),
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000002'::uuid, 'responsable'),
  ('d1000000-0000-4000-8000-000000000008'::uuid, 'b1000000-0000-4000-8000-000000000011'::uuid, 'responsable')
ON CONFLICT (matter_id, user_id) DO NOTHING;

INSERT INTO ciceron.watch_profiles (id, client_id, subject_areas, authorities, keywords, norms_of_interest, description, embedding_model, is_demo) VALUES
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000001'::uuid, ARRAY['financiero y fintech','datos personales']::text[], ARRAY['CNBV','Banxico','UIF']::text[], ARRAY['PLD','fintech','SPEI']::text[], ARRAY['LFPIORPI']::text[],
   $$Datos de demostración. Emisora de pagos. Interesa regulación de fondos de pago electrónico, PLD y protección de datos de clientes.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000002'::uuid, 'c1000000-0000-4000-8000-000000000002'::uuid, ARRAY['salud y regulación sanitaria']::text[], ARRAY['COFEPRIS','SSA']::text[], ARRAY['farmacovigilancia','cadena de frío']::text[], ARRAY['LISSA']::text[],
   $$Datos de demostración. Distribuye medicamentos. Vigila registros sanitarios, NOM de almacenamiento y publicidad.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000003'::uuid, 'c1000000-0000-4000-8000-000000000003'::uuid, ARRAY['energía','ambiental']::text[], ARRAY['CRE','SENER','SEMARNAT']::text[], ARRAY['generación eólica','interconexión']::text[], ARRAY['LGEEPA']::text[],
   $$Datos de demostración. Parques eólicos en el Istmo. Vigila permisos de generación, impacto ambiental y CFE.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000004'::uuid, 'c1000000-0000-4000-8000-000000000004'::uuid, ARRAY['comercio exterior y aduanas']::text[], ARRAY['SAT','ANAM']::text[], ARRAY['fracción arancelaria','pedimento']::text[], ARRAY['Ley Aduanera']::text[],
   $$Datos de demostración. Despacho aduanal. Vigila reglas generales de comercio exterior y NOM de producto.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000005'::uuid, 'c1000000-0000-4000-8000-000000000005'::uuid, ARRAY['inmobiliario','financiero y fintech']::text[], ARRAY['CNBV','SEDUVI']::text[], ARRAY['arrendamiento','fideicomiso']::text[], ARRAY['Código Civil']::text[],
   $$Datos de demostración. Fondo de renta. Vigila topes de renta, fiscalidad de fideicomisos y CNBV.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000006'::uuid, 'c1000000-0000-4000-8000-000000000006'::uuid, ARRAY['salud y regulación sanitaria','laboral']::text[], ARRAY['COFEPRIS','STPS']::text[], ARRAY['etiquetado','NOM-051']::text[], ARRAY['LFNS']::text[],
   $$Datos de demostración. Alimentos procesados. Vigila etiquetado frontal, inocuidad y obligaciones laborales.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000007'::uuid, 'c1000000-0000-4000-8000-000000000101'::uuid, ARRAY['corporativo y mercantil']::text[], ARRAY['SE']::text[], ARRAY['aislamiento']::text[], '{}'::text[],
   $$Datos de demostración. Cliente del segundo despacho, solo para pruebas de aislamiento.$$, 'text-embedding-3-small', true)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_demo = true;

INSERT INTO ciceron.case_files (id, firm_id, matter_id, is_sample, court_name, file_number, connector_kind, metadata) VALUES
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, true,
   'TFJA Sala Regional Metropolitana', 'DEMO-TFJA-1001/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000002'::uuid, true,
   'Juzgado Decimo de Distrito en Materia Administrativa', 'DEMO-JDA-220/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000003'::uuid, true,
   'TFJA Sala Especializada', 'DEMO-TFJA-331/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000004'::uuid, true,
   'Juzgado Primero de Distrito en Materia de Amparo', 'DEMO-AMP-404/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000005'::uuid, true,
   'TFJA Sala Regional del Pacífico', 'DEMO-TFJA-515/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000006'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000006'::uuid, true,
   'Juzgado Civil de Cuantía Mayor CDMX', 'DEMO-CIV-616/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000007'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000007'::uuid, true,
   'Juzgado Laboral Federal', 'DEMO-LAB-717/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000008'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, true,
   'SCJN (asunto ficticio de seguimiento)', 'DEMO-SCJN-A-808/2026', 'sample',
   '{ "label": "Datos de demostración" }'::jsonb)
ON CONFLICT (id) DO UPDATE SET is_sample = true, file_number = EXCLUDED.file_number;

-- Sample case events
INSERT INTO ciceron.case_events (case_file_id, event_type, occurred_at, summary, raw_payload)
SELECT * FROM (VALUES
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000002'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000002'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000003'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000003'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000004'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000004'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000005'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000005'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000006'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000006'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000007'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000007'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000008'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb),
  ('f1000000-0000-4000-8000-000000000008'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{ "source": "sample", "label": "Datos de demostración" }'::jsonb)
) AS v(case_file_id, event_type, occurred_at, summary, raw_payload)
WHERE NOT EXISTS (
  SELECT 1 FROM ciceron.case_events e WHERE e.case_file_id = v.case_file_id AND e.event_type = v.event_type AND e.occurred_at = v.occurred_at
);

INSERT INTO ciceron.deadlines (case_file_id, matter_id, status, due_at, basis_text)
SELECT c.id, c.matter_id, 'propuesto', timestamptz '2026-11-14 23:59:00-06',
  'Datos de demostración. Ejemplo: quince días hábiles para contestar demanda (regla de demostración, no norma vigente citada como asesoría).'
FROM ciceron.case_files c
WHERE c.id IN ('f1000000-0000-4000-8000-000000000001'::uuid, 'f1000000-0000-4000-8000-000000000002'::uuid)
AND NOT EXISTS (
  SELECT 1 FROM ciceron.deadlines d WHERE d.case_file_id = c.id AND d.status = 'propuesto'
);

INSERT INTO ciceron.non_working_days (calendar_date, jurisdiction, description) VALUES
  (DATE '2026-01-01', 'MX', 'Año Nuevo'),
  (DATE '2026-02-02', 'MX', 'Día de la Constitución (primer lunes de febrero)'),
  (DATE '2026-03-16', 'MX', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  (DATE '2026-05-01', 'MX', 'Día del Trabajo'),
  (DATE '2026-09-16', 'MX', 'Día de la Independencia'),
  (DATE '2026-11-16', 'MX', 'Revolución Mexicana (tercer lunes de noviembre)'),
  (DATE '2026-12-25', 'MX', 'Navidad'),
  (DATE '2027-01-01', 'MX', 'Año Nuevo'),
  (DATE '2027-02-01', 'MX', 'Día de la Constitución (primer lunes de febrero)'),
  (DATE '2027-03-15', 'MX', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  (DATE '2027-05-01', 'MX', 'Día del Trabajo'),
  (DATE '2027-09-16', 'MX', 'Día de la Independencia'),
  (DATE '2027-11-15', 'MX', 'Revolución Mexicana (tercer lunes de noviembre)'),
  (DATE '2027-12-25', 'MX', 'Navidad')
ON CONFLICT (jurisdiction, calendar_date) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO ciceron.events (name, firm_id, user_id, properties, occurred_at)
SELECT 'seed_completed', 'a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000004'::uuid,
  '{"label":"Datos de demostración","version":1}'::jsonb, now()
WHERE NOT EXISTS (
  SELECT 1 FROM ciceron.events e WHERE e.name = 'seed_completed' AND e.firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
);

COMMENT ON TABLE ciceron.firms IS 'Law firm tenant root. Seed includes Despacho Demo, S.C. and Bufete Contraste, S.C. (Datos de demostración).';
