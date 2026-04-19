-- ============================================
-- MIGRARE SUPABASE — Cabinet Dr. Ionescu
-- Rulează în Supabase → SQL Editor → New query
-- ============================================

-- 1. Tabela pacienți (nouă)
create table if not exists patients (
  id         bigint generated always as identity primary key,
  name       text not null,
  phone      text not null unique,
  created_at timestamptz default now()
);

-- 2. Adaugă coloanele noi în appointments
alter table appointments
  add column if not exists patient_name  text,
  add column if not exists patient_phone text;

-- 3. Adaugă coloanele noi în symptoms
alter table symptoms
  add column if not exists patient_name  text,
  add column if not exists patient_phone text;

-- 4. Adaugă coloanele noi în prescriptions
alter table prescriptions
  add column if not exists patient_name  text,
  add column if not exists patient_phone text;

-- 5. Dezactivează RLS pe toate tabelele
alter table patients       disable row level security;
alter table appointments   disable row level security;
alter table symptoms       disable row level security;
alter table prescriptions  disable row level security;
alter table notifications  disable row level security;

-- 6. (Opțional) Șterge datele vechi de test cu coloane incompatibile
-- ATENȚIE: decomentează doar dacă vrei să ștergi datele vechi!
-- truncate table appointments restart identity cascade;
-- truncate table symptoms     restart identity cascade;
-- truncate table prescriptions restart identity cascade;
-- truncate table notifications restart identity cascade;
