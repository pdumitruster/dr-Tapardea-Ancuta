# Cabinet Dr. Ionescu — PWA

Aplicație web progresivă (PWA) pentru gestionarea programărilor unui cabinet de medicină de familie.

## Structura fișierelor

```
dr-ionescu-pwa/
├── index.html          ← Punct de intrare principal
├── manifest.json       ← Configurație PWA (nume, iconiță, culori)
├── sw.js               ← Service Worker (offline, cache)
├── style.css           ← Stiluri (mobile-first, dark mode)
├── app.js              ← Logica aplicației
├── generate-icons.html ← Generator iconițe (rulează o dată)
└── icons/
    ├── icon-192.png    ← Iconiță PWA (generată din generate-icons.html)
    └── icon-512.png    ← Iconiță PWA mare
```

## Funcționalități

### Medic
- ✅ Calendar programări cu vizualizare lunară
- ✅ Listă programări viitoare și efectuate
- ✅ Vizualizare și procesare rapoarte simptome pacienți
- ✅ Aprobare / respingere cereri rețete
- ✅ Program de lucru
- ✅ Notificări în timp real

### Pacient
- ✅ Programare online cu calendar și sloturi disponibile
- ✅ Istoricul programărilor personale
- ✅ Raportare simptome direct la medic
- ✅ Solicitare reînnoire rețetă
- ✅ Notificări (confirmări, aprobări)

### PWA
- ✅ Funcționează offline (cache Service Worker)
- ✅ Instalabilă pe telefon (Android + iOS)
- ✅ Dark mode automat
- ✅ Responsive, optimizată pentru mobile

---

## Deployment GRATUIT (Vercel — recomandat)

### Pasul 1 — Creează cont Vercel
1. Mergi pe [vercel.com](https://vercel.com)
2. Înregistrează-te cu GitHub (gratuit)

### Pasul 2 — Generează iconițele
1. Deschide `generate-icons.html` în browser
2. Descarcă `icon-192.png` și `icon-512.png`
3. Pune-le în folderul `icons/`

### Pasul 3 — Urcă pe GitHub
```bash
git init
git add .
git commit -m "Cabinet Dr. Ionescu PWA"
git remote add origin https://github.com/USERUL_TAU/dr-ionescu.git
git push -u origin main
```

### Pasul 4 — Deploy pe Vercel
1. În Vercel, apasă **"New Project"**
2. Importă repository-ul de pe GitHub
3. Apasă **Deploy**
4. Vercel îți dă un URL gratuit: `https://dr-ionescu.vercel.app`

### Pasul 5 — Domeniu propriu (opțional)
1. Cumpără `dr-ionescu.ro` de la [rotld.ro](https://www.rotld.ro) (~40 lei/an)
2. În Vercel → Settings → Domains → adaugă domeniul tău

---

## Instalare pe telefon

### Android (Chrome)
1. Deschide aplicația în Chrome
2. Apare automat bannerul "Instalează aplicația"
3. Sau: meniu (⋮) → "Adaugă pe ecranul principal"

### iPhone (Safari)
1. Deschide aplicația în Safari
2. Apasă butonul Share (pătrat cu săgeată)
3. → "Adaugă pe ecranul principal"

---

## Pasul următor — Supabase (bază de date reală)

Momentan, datele sunt salvate local pe dispozitiv (localStorage).
Pentru date reale, sincronizate între medic și pacienți:

### 1. Creează cont Supabase
- Mergi pe [supabase.com](https://supabase.com) — gratuit
- Creează un proiect nou

### 2. Creează tabelele (SQL)
```sql
-- Programări
CREATE TABLE appointments (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  time        TEXT NOT NULL,
  patient     TEXT NOT NULL,
  type        TEXT DEFAULT 'consultație',
  status      TEXT DEFAULT 'confirmed',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Simptome
CREATE TABLE symptoms (
  id         SERIAL PRIMARY KEY,
  patient    TEXT NOT NULL,
  date       DATE NOT NULL,
  text       TEXT NOT NULL,
  status     TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rețete
CREATE TABLE prescriptions (
  id         SERIAL PRIMARY KEY,
  patient    TEXT NOT NULL,
  date       DATE NOT NULL,
  med        TEXT NOT NULL,
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notificări
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  target     TEXT NOT NULL, -- 'doctor' sau 'patient'
  text       TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Înlocuiește DB în app.js
Înlocuiește funcțiile `DB.get()` și `DB.set()` cu apeluri la API-ul Supabase:
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient('URL_TĂU', 'ANON_KEY_TĂU')
```

---

## Notificări push (opțional)

Folosește [web-push](https://www.npmjs.com/package/web-push) sau serviciul
gratuit [OneSignal](https://onesignal.com) pentru notificări automate:
- Reminder cu 24h înainte de programare
- Alertă când medicul aprobă rețeta
- Confirmare programare nouă

---

## Contact & Suport

Aplicație construită cu Claude (Anthropic) — versiune demo.
Personalizare și extindere disponibile la cerere.
