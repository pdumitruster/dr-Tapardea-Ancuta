'use strict';

/* ============================================
   CABINET DR. Țăpârdea Ancuța — Aplicație PWA
   Date: Supabase (bază de date în cloud)
   ============================================ */

// ---- CONFIGURARE SUPABASE ----
// !! Înlocuiește cele două valori de mai jos din panoul tău Supabase
//    Settings → API → Project URL și anon/public key
const SUPABASE_URL = 'https://dneagmuohcxckpozgtku.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZWFnbXVvaGN4Y2twb3pndGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTc4NTcsImV4cCI6MjA5MjA5Mzg1N30.BY7GT7LsKvE1mmaPMXBUHyJPtGCuyLlQ9nYN_kNzRAI';

// Client Supabase (încărcat din CDN în index.html)
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// STRAT DATE — toate operațiunile cu Supabase
// ============================================
const DB = {

  // ---- APPOINTMENTS ----
  async getAppointments() {
    const { data, error } = await sb
      .from('appointments')
      .select('*')
      .order('date')
      .order('time');
    if (error) { console.error('appointments:', error); return []; }
    return data;
  },

  async insertAppointment({ date, time, patient, type }) {
    const { error } = await sb
      .from('appointments')
      .insert({ date, time, patient, type, status: 'confirmed' });
    if (error) console.error('insert appointment:', error);
  },

  // ---- SYMPTOMS ----
  async getSymptoms() {
    const { data, error } = await sb
      .from('symptoms')
      .select('*')
      .order('date', { ascending: false });
    if (error) { console.error('symptoms:', error); return []; }
    return data;
  },

  async insertSymptom({ patient, date, text }) {
    const { error } = await sb
      .from('symptoms')
      .insert({ patient, date, text, status: 'new' });
    if (error) console.error('insert symptom:', error);
  },

  async markSymptomReviewed(id) {
    const { error } = await sb
      .from('symptoms')
      .update({ status: 'reviewed' })
      .eq('id', id);
    if (error) console.error('mark symptom:', error);
  },

  // ---- PRESCRIPTIONS ----
  async getPrescriptions() {
    const { data, error } = await sb
      .from('prescriptions')
      .select('*')
      .order('date', { ascending: false });
    if (error) { console.error('prescriptions:', error); return []; }
    return data;
  },

  async insertPrescription({ patient, date, med }) {
    const { error } = await sb
      .from('prescriptions')
      .insert({ patient, date, med, status: 'pending' });
    if (error) console.error('insert prescription:', error);
  },

  async updatePrescriptionStatus(id, status) {
    const { error } = await sb
      .from('prescriptions')
      .update({ status })
      .eq('id', id);
    if (error) console.error('update prescription:', error);
  },

  // ---- NOTIFICATIONS ----
  async getNotifications(target) {
    // target = 'doctor' sau 'patient'
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('target', target)
      .order('created_at', { ascending: false });
    if (error) { console.error('notifications:', error); return []; }
    return data;
  },

  async insertNotification({ target, text }) {
    const { error } = await sb
      .from('notifications')
      .insert({ target, text, read: false });
    if (error) console.error('insert notification:', error);
  },

  async markAllNotificationsRead(target) {
    const { error } = await sb
      .from('notifications')
      .update({ read: true })
      .eq('target', target)
      .eq('read', false);
    if (error) console.error('mark all read:', error);
  },
};

// ---- CONSTANTE ----
const TODAY    = new Date().toISOString().split('T')[0]; // data reală curentă
const PAT_NAME = 'Maria Popescu'; // va fi înlocuit cu autentificarea reală
const MONTHS   = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
const DAYS_S   = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
const DAYS_L   = ['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'];
const MONTHS_S = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec'];
const SLOTS    = ['08:00','08:20','08:40','09:00','09:20','09:40','10:00','10:20','10:40','11:00','11:20','11:40','13:00','13:20','13:40','14:00','14:20','14:40','15:00','15:20','15:40'];

// ---- STATE ----
const S = {
  role: null,
  tab:  'calendar',
  my:   { y: new Date().getFullYear(), m: new Date().getMonth() },
  sd:   null,   // data selectată în calendar
  bs:   null,   // slotul de oră selectat
  msg:  null,   // mesaj succes temporar

  // Cache local — populat de render() la fiecare apel
  cache: {
    appointments:  [],
    symptoms:      [],
    prescriptions: [],
    notifications: [],
  }
};

// ---- HELPERS ----
function mkDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  let w = new Date(y, m - 1, d).getDay();
  w = w === 0 ? 6 : w - 1;
  return `${DAYS_L[w]}, ${d} ${MONTHS_S[m - 1]}`;
}

function fmtTime(isoString) {
  // Convertește câmpul created_at din Supabase în text lizibil
  if (!isoString) return '';
  const d = new Date(isoString);
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const hm = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString())     return `Azi, ${hm}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ieri, ${hm}`;
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]}, ${hm}`;
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function badge(status) {
  const map = {
    confirmed: ['badge-success', 'confirmat'],
    done:      ['badge-neutral', 'efectuat'],
    pending:   ['badge-warning', 'în așteptare'],
    approved:  ['badge-success', 'aprobat'],
    rejected:  ['badge-danger',  'respins'],
    new:       ['badge-danger',  'nou'],
    reviewed:  ['badge-neutral', 'revizuit'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function showLoading() {
  const main = document.querySelector('.page-content');
  if (main) main.innerHTML = '<div class="empty-state" style="padding:3rem">Se încarcă...</div>';
}

// ---- CALENDAR COMPONENT ----
function calNav() {
  const { y, m } = S.my;
  return `
    <div class="cal-nav">
      <button class="btn-secondary" data-action="prev-month" style="padding:6px 14px;font-size:18px;line-height:1">‹</button>
      <span class="cal-title">${MONTHS[m]} ${y}</span>
      <button class="btn-secondary" data-action="next-month" style="padding:6px 14px;font-size:18px;line-height:1">›</button>
    </div>`;
}

function calGrid(isDoctor) {
  const { y, m } = S.my;
  const dim = new Date(y, m + 1, 0).getDate();
  let fd = new Date(y, m, 1).getDay();
  fd = fd === 0 ? 6 : fd - 1;

  // Citim din cache — deja fetch-uit de render()
  const hasAppt = new Set(
    S.cache.appointments
      .filter(a => {
        const [ay, am] = a.date.split('-').map(Number);
        return ay === y && am === m + 1 && (isDoctor || a.patient === PAT_NAME);
      })
      .map(a => a.date)
  );

  let html = DAYS_S.map(d => `<div class="cal-day-label">${d}</div>`).join('');
  for (let i = 0; i < fd; i++) html += '<div></div>';

  for (let d = 1; d <= dim; d++) {
    const ds  = mkDate(y, m, d);
    const wd  = new Date(y, m, d).getDay();
    const cls = [
      'cal-day',
      ds === TODAY ? 'today'    : '',
      ds === S.sd  ? 'selected' : '',
      wd === 0 || wd === 6 ? 'weekend' : ''
    ].filter(Boolean).join(' ');

    html += `
      <div class="${cls}" data-action="seldate" data-date="${ds}">
        <span class="cal-day-num">${d}</span>
        ${hasAppt.has(ds) ? '<div class="cal-dots"><div class="cal-dot"></div></div>' : ''}
      </div>`;
  }

  return `<div class="cal-grid">${html}</div>`;
}

// ============================================
// DOCTOR VIEWS — citesc din S.cache
// ============================================
function viewDoctorCalendar() {
  const appts   = S.cache.appointments;
  const month   = `${S.my.y}-${String(S.my.m + 1).padStart(2,'0')}`;
  const confirmed = appts.filter(a => a.date.startsWith(month) && a.status === 'confirmed').length;
  const todayCnt  = appts.filter(a => a.date === TODAY).length;
  const future    = appts.filter(a => a.date > TODAY && a.status === 'confirmed').length;

  const dayAppts = S.sd
    ? appts.filter(a => a.date === S.sd).sort((a, b) => a.time.localeCompare(b.time))
    : [];

  const daySection = S.sd ? `
    <div style="margin-top:18px">
      <div class="section-title" style="margin-bottom:12px">${fmtDate(S.sd)}</div>
      ${dayAppts.length
        ? `<div class="card">${dayAppts.map(a => `
            <div class="appt-item">
              <span class="appt-time">${a.time}</span>
              <div style="flex:1"><div class="appt-name">${a.patient}</div><div class="appt-type">${a.type}</div></div>
              ${badge(a.status)}
            </div>`).join('')}</div>`
        : '<div class="empty-state">Nicio programare în această zi</div>'
      }
    </div>` : '';

  return `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${confirmed}</div><div class="stat-label">luna aceasta</div></div>
      <div class="stat-card"><div class="stat-value">${todayCnt}</div><div class="stat-label">azi</div></div>
      <div class="stat-card"><div class="stat-value">${future}</div><div class="stat-label">viitoare</div></div>
    </div>
    ${calNav()}
    ${calGrid(true)}
    ${daySection}`;
}

function viewDoctorAppts() {
  const appts    = S.cache.appointments;
  const upcoming = appts
    .filter(a => a.date >= TODAY && a.status === 'confirmed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const done = appts.filter(a => a.status === 'done');

  const row = (a, faded) => `
    <div class="appt-item" style="${faded ? 'opacity:0.55' : ''}">
      <div style="min-width:104px">
        <div style="font-size:11px;color:var(--text-muted)">${fmtDate(a.date)}</div>
        <div class="appt-time">${a.time}</div>
      </div>
      <div style="flex:1"><div class="appt-name">${a.patient}</div><div class="appt-type">${a.type}</div></div>
      ${badge(a.status)}
    </div>`;

  return `
    <div class="section-title">Viitoare (${upcoming.length})</div>
    <div class="card" style="margin-top:10px">
      ${upcoming.length ? upcoming.map(a => row(a, false)).join('') : '<div class="empty-state">Nicio programare viitoare</div>'}
    </div>
    <div class="section-title" style="margin-top:10px">Efectuate (${done.length})</div>
    <div class="card" style="margin-top:10px">
      ${done.length ? done.map(a => row(a, true)).join('') : '<div class="empty-state">—</div>'}
    </div>`;
}

function viewDoctorPatients() {
  const syms = S.cache.symptoms;
  const rxs  = S.cache.prescriptions;

  return `
    <div class="section-title">Rapoarte simptome (${syms.filter(s => s.status === 'new').length} noi)</div>
    <div style="margin-top:10px">
      ${syms.length ? syms.map(s => `
        <div class="card">
          <div class="card-row" style="margin-bottom:10px">
            <div class="avatar" style="background:var(--info-bg);color:var(--info-text)">${initials(s.patient)}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600">${s.patient}</div>
              <div style="font-size:12px;color:var(--text-muted)">${s.date}</div>
            </div>
            ${badge(s.status)}
          </div>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.5">${s.text}</p>
          ${s.status === 'new'
            ? `<button class="btn-secondary" data-action="mark-sym" data-id="${s.id}" style="margin-top:12px;font-size:13px">Marchează revizuit</button>`
            : ''}
        </div>`).join('')
      : '<div class="empty-state">Nicio raportare de simptome</div>'}
    </div>
    <div class="section-title" style="margin-top:10px">Cereri rețete</div>
    <div style="margin-top:10px">
      ${rxs.length ? rxs.map(r => `
        <div class="card">
          <div class="card-row" style="margin-bottom:8px">
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600">${r.patient}</div>
              <div style="font-size:12px;color:var(--text-muted)">${r.date}</div>
            </div>
            ${badge(r.status)}
          </div>
          <p style="font-size:13px;color:var(--text-muted)">Medicament: <strong>${r.med}</strong></p>
          ${r.status === 'pending' ? `
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn-primary" data-action="approve-rx" data-id="${r.id}" style="font-size:13px;padding:10px">Aprobă</button>
              <button class="btn-secondary" data-action="reject-rx" data-id="${r.id}" style="font-size:13px">Respinge</button>
            </div>` : ''}
        </div>`).join('')
      : '<div class="empty-state">Nicio cerere de rețetă</div>'}
    </div>`;
}

function viewDoctorSchedule() {
  const working = ['Luni','Marți','Miercuri','Joi','Vineri'];
  const weekend = ['Sâmbătă','Duminică'];
  return `
    <div class="section-title">Program de lucru</div>
    <div class="section-sub">Sloturi de 20 minute — 21 consultații disponibile pe zi</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${working.map(day => `
        <div class="card card-row">
          <div style="min-width:80px;font-weight:600">${day}</div>
          <div style="flex:1;font-size:13px;color:var(--text-muted)">08:00–12:00 · 13:00–16:00</div>
          <span class="badge badge-success">activ</span>
        </div>`).join('')}
      ${weekend.map(day => `
        <div class="card card-row" style="opacity:0.45">
          <div style="min-width:80px;font-weight:600">${day}</div>
          <div style="flex:1;font-size:13px;color:var(--text-muted)">—</div>
          <span class="badge badge-neutral">închis</span>
        </div>`).join('')}
    </div>`;
}

// ============================================
// PATIENT VIEWS — citesc din S.cache
// ============================================
function viewPatientBook() {
  const slotSection = S.sd ? (() => {
    const wd = new Date(S.sd + 'T00:00:00').getDay();
    if (wd === 0 || wd === 6) return `
      <div style="margin-top:16px">
        <div class="section-title" style="margin-bottom:8px">${fmtDate(S.sd)}</div>
        <div class="empty-state">Nu există consultații în weekend</div>
      </div>`;
    if (S.sd < TODAY) return `
      <div style="margin-top:16px">
        <div class="section-title" style="margin-bottom:8px">${fmtDate(S.sd)}</div>
        <div class="empty-state">Data este în trecut</div>
      </div>`;

    const booked  = S.cache.appointments.filter(a => a.date === S.sd).map(a => a.time);
    const confirm = S.bs && !booked.includes(S.bs) ? `
      <div class="confirm-box">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px">Confirmare programare</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">${fmtDate(S.sd)}, ora ${S.bs}</div>
        <div class="form-group">
          <label class="form-label">Motivul consultației</label>
          <select id="appt-type">
            <option>Consultație generală</option>
            <option>Rețetă</option>
            <option>Urmărire tratament</option>
            <option>Rezultate analize</option>
          </select>
        </div>
        <button class="btn-primary" data-action="book-confirm">Confirmă programarea</button>
      </div>` : '';

    return `
      <div style="margin-top:16px">
        <div class="section-title" style="margin-bottom:10px">${fmtDate(S.sd)} — ore disponibile</div>
        <div class="slots-grid">
          ${SLOTS.map(t => `
            <button class="slot-btn ${booked.includes(t) ? 'taken' : S.bs === t ? 'selected' : 'available'}"
              ${booked.includes(t) ? 'disabled' : ''}
              data-action="selslot" data-slot="${t}">${t}</button>`).join('')}
        </div>
        ${confirm}
      </div>`;
  })() : '';

  return `
    ${S.msg ? `<div class="alert-success">${S.msg}</div>` : ''}
    <div class="section-title">Programare nouă</div>
    <div class="section-sub">Selectați o dată disponibilă (luni–vineri)</div>
    ${calNav()}
    ${calGrid(false)}
    ${slotSection}`;
}

function viewPatientMyAppts() {
  const mine = S.cache.appointments
    .filter(a => a.patient === PAT_NAME)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const upcoming = mine.filter(a => a.date >= TODAY && a.status !== 'done');
  const history  = mine.filter(a => a.date < TODAY  || a.status === 'done');

  const row = (a, faded) => `
    <div class="appt-item" style="${faded ? 'opacity:0.55' : ''}">
      <div style="min-width:104px">
        <div style="font-size:11px;color:var(--text-muted)">${fmtDate(a.date)}</div>
        <div class="appt-time">${a.time}</div>
      </div>
      <div style="flex:1"><div class="appt-name">Dr. Țăpârdea Ancuța</div><div class="appt-type">${a.type}</div></div>
      ${badge(a.status)}
    </div>`;

  return `
    <div class="section-title">Viitoare (${upcoming.length})</div>
    <div class="card" style="margin-top:10px">
      ${upcoming.length ? upcoming.map(a => row(a, false)).join('') : '<div class="empty-state">Nicio programare viitoare</div>'}
    </div>
    <div class="section-title" style="margin-top:10px">Istoricul meu</div>
    <div class="card" style="margin-top:10px">
      ${history.length ? history.map(a => row(a, true)).join('') : '<div class="empty-state">Nicio consultație anterioară</div>'}
    </div>`;
}

function viewPatientSymptoms() {
  return `
    ${S.msg ? `<div class="alert-success">${S.msg}</div>` : ''}
    <div class="section-title">Descrie simptomele</div>
    <div class="section-sub">Medicul va fi notificat și vă va contacta dacă este necesar</div>
    <div class="form-group">
      <label class="form-label">De când aveți simptomele?</label>
      <select id="since">
        <option>Azi</option><option>1–2 zile</option>
        <option>3–7 zile</option><option>Peste o săptămână</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Descrieți simptomele</label>
      <textarea id="sym-text" placeholder="Ex: durere de cap, febră 38°C, tuse seacă..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Intensitate simptome</label>
      <select id="severity">
        <option>1 — Ușoară</option><option>2 — Moderată</option>
        <option selected>3 — Medie</option><option>4 — Semnificativă</option>
        <option>5 — Severă</option>
      </select>
    </div>
    <button class="btn-primary" data-action="submit-sym">Trimite raport medicului</button>`;
}

function viewPatientRx() {
  const mine = S.cache.prescriptions.filter(r => r.patient === PAT_NAME);
  return `
    ${S.msg ? `<div class="alert-success">${S.msg}</div>` : ''}
    <div class="section-title">Rețetele mele</div>
    <div style="margin-top:10px;margin-bottom:6px">
      ${mine.length
        ? mine.map(r => `
          <div class="card" style="margin-bottom:8px">
            <div class="card-row">
              <div style="flex:1">
                <div style="font-weight:600;font-size:14px">${r.med}</div>
                <div style="font-size:12px;color:var(--text-muted)">Solicitată: ${r.date}</div>
              </div>
              ${badge(r.status)}
            </div>
          </div>`).join('')
        : '<div class="empty-state" style="padding:1rem 0">Nicio rețetă solicitată încă</div>'
      }
    </div>
    <div class="divider"></div>
    <div class="section-title">Solicită reînnoire rețetă</div>
    <div style="margin-top:14px">
      <div class="form-group">
        <label class="form-label">Medicament</label>
        <input type="text" id="rx-med" placeholder="Ex: Metformin 500mg, Enalapril 10mg...">
      </div>
      <div class="form-group">
        <label class="form-label">Observații (opțional)</label>
        <textarea id="rx-note" placeholder="Orice informație relevantă pentru medic..." style="min-height:70px"></textarea>
      </div>
      <button class="btn-primary" data-action="submit-rx">Solicită rețetă</button>
    </div>`;
}

function viewNotifications(isDoctor) {
  const notifs = S.cache.notifications;
  const unread = notifs.filter(n => !n.read).length;

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="section-title">Notificări ${unread ? `<span class="badge badge-danger" style="font-size:11px;margin-left:6px">${unread}</span>` : ''}</div>
      ${unread ? `<button class="btn-ghost" data-action="read-all">Toate citite</button>` : ''}
    </div>
    ${notifs.length
      ? notifs.map(n => `
          <div class="notif-item">
            <div class="notif-dot ${n.read ? 'read' : 'unread'}"></div>
            <div>
              <div style="font-size:14px;line-height:1.4">${n.text}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${fmtTime(n.created_at)}</div>
            </div>
          </div>`).join('')
      : '<div class="empty-state">Nicio notificare</div>'
    }`;
}

// ============================================
// ICONS
// ============================================
const ico = path =>
  `<div class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">${path}</svg></div>`;

const ICONS = {
  calendar: () => ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  list:     () => ico('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  people:   () => ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  clock:    () => ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  plus:     () => ico('<path d="M12 5v14M5 12h14"/>'),
  heart:    () => ico('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'),
  rx:       () => ico('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v4M17 4v4M3 10h18M9 15h6m-3-3v6"/>'),
  bell: (count) => {
    const dot = count ? `<span class="tab-badge">${count > 9 ? '9+' : count}</span>` : '';
    return `<div class="tab-icon">${dot}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" width="22" height="22"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>`;
  }
};

// ============================================
// LOGIN PAGE
// ============================================
function renderLogin() {
  return `
    <div class="login-page">
      <div style="text-align:center">
        <div class="login-logo">
          <svg width="36" height="36" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"/>
          </svg>
        </div>
        <h1 style="font-size:24px;font-weight:700;margin-top:16px;margin-bottom:6px">Cabinet Dr. Țăpârdea Ancuța</h1>
        <p style="font-size:14px;color:var(--text-muted)">Medicină de familie · Craiova</p>
      </div>
      <div class="role-grid">
        <div class="role-card" data-action="login-doctor">
          <div class="role-icon" style="background:var(--success-bg)">
            <svg width="26" height="26" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24">
              <path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">Sunt medic</div>
          <div style="font-size:12px;color:var(--text-muted)">Gestionează programările</div>
        </div>
        <div class="role-card" data-action="login-patient">
          <div class="role-icon" style="background:var(--info-bg)">
            <svg width="26" height="26" fill="none" stroke="var(--info-text)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">Sunt pacient</div>
          <div style="font-size:12px;color:var(--text-muted)">Programează consultație</div>
        </div>
      </div>
    </div>`;
}

// ============================================
// RENDER PRINCIPAL — async (fetch + draw)
// ============================================
async function render() {
  const app = document.getElementById('app');
  if (!S.role) { app.innerHTML = renderLogin(); return; }

  const isDoctor    = S.role === 'doctor';
  const notifTarget = isDoctor ? 'doctor' : 'patient';

  // Fetch toate datele în paralel din Supabase
  showLoading();
  const [appointments, symptoms, prescriptions, notifications] = await Promise.all([
    DB.getAppointments(),
    DB.getSymptoms(),
    DB.getPrescriptions(),
    DB.getNotifications(notifTarget),
  ]);

  // Actualizează cache-ul local
  S.cache.appointments  = appointments;
  S.cache.symptoms      = symptoms;
  S.cache.prescriptions = prescriptions;
  S.cache.notifications = notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  const doctorTabs = [
    { id: 'calendar',     label: 'Calendar', icon: ICONS.calendar() },
    { id: 'appointments', label: 'Program',  icon: ICONS.list() },
    { id: 'patients',     label: 'Pacienți', icon: ICONS.people() },
    { id: 'schedule',     label: 'Orar',     icon: ICONS.clock() },
    { id: 'notifs',       label: 'Alerte',   icon: ICONS.bell(unreadCount) },
  ];

  const patientTabs = [
    { id: 'book',     label: 'Programare', icon: ICONS.plus() },
    { id: 'myappts',  label: 'Ale mele',   icon: ICONS.list() },
    { id: 'symptoms', label: 'Simptome',   icon: ICONS.heart() },
    { id: 'rx',       label: 'Rețete',     icon: ICONS.rx() },
    { id: 'notifs',   label: 'Alerte',     icon: ICONS.bell(unreadCount) },
  ];

  const tabs = isDoctor ? doctorTabs : patientTabs;

  let content = '';
  if (isDoctor) {
    if      (S.tab === 'calendar')     content = viewDoctorCalendar();
    else if (S.tab === 'appointments') content = viewDoctorAppts();
    else if (S.tab === 'patients')     content = viewDoctorPatients();
    else if (S.tab === 'schedule')     content = viewDoctorSchedule();
    else if (S.tab === 'notifs')       content = viewNotifications(true);
  } else {
    if      (S.tab === 'book')         content = viewPatientBook();
    else if (S.tab === 'myappts')      content = viewPatientMyAppts();
    else if (S.tab === 'symptoms')     content = viewPatientSymptoms();
    else if (S.tab === 'rx')           content = viewPatientRx();
    else if (S.tab === 'notifs')       content = viewNotifications(false);
  }

  app.innerHTML = `
    <header class="app-header">
      <div>
        <div style="font-size:15px;font-weight:700">${isDoctor ? 'Dr. Maria Țăpârdea Ancuța' : PAT_NAME}</div>
        <div style="font-size:12px;color:var(--text-muted)">Cabinet medicină de familie</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${isDoctor ? 'badge-success' : 'badge-info'}">${isDoctor ? 'Medic' : 'Pacient'}</span>
        <button class="btn-secondary" data-action="logout" style="font-size:12px;padding:6px 12px">Ieșire</button>
      </div>
    </header>
    <main class="page-content">${content}</main>
    <nav class="tab-bar">
      ${tabs.map(t => `
        <button class="tab-item ${S.tab === t.id ? 'active' : ''}" data-action="tab" data-tab="${t.id}" aria-label="${t.label}">
          ${t.icon}<span>${t.label}</span>
        </button>`).join('')}
    </nav>`;
}

// ============================================
// EVENT HANDLER CENTRAL — async
// ============================================
document.getElementById('app').addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  S.msg = null;

  switch (action) {

    case 'login-doctor':
      S.role = 'doctor'; S.tab = 'calendar'; S.sd = TODAY; await render(); break;

    case 'login-patient':
      S.role = 'patient'; S.tab = 'book'; S.sd = null; await render(); break;

    case 'logout':
      S.role = null; S.sd = null; S.bs = null; await render(); break;

    case 'tab':
      S.tab = el.dataset.tab; await render(); break;

    case 'prev-month': {
      let { y, m } = S.my; m--; if (m < 0) { m = 11; y--; } S.my = { y, m }; await render(); break;
    }
    case 'next-month': {
      let { y, m } = S.my; m++; if (m > 11) { m = 0; y++; } S.my = { y, m }; await render(); break;
    }

    case 'seldate':
      S.sd = el.dataset.date; S.bs = null; await render(); break;

    case 'selslot':
      S.bs = el.dataset.slot; await render(); break;

    case 'book-confirm': {
      if (!S.sd || !S.bs) return;
      const type = document.getElementById('appt-type')?.value || 'Consultație generală';
      // 1. Salvează programarea în Supabase
      await DB.insertAppointment({ date: S.sd, time: S.bs, patient: PAT_NAME, type });
      // 2. Notificare pentru pacient
      await DB.insertNotification({ target: 'patient', text: `Programare confirmată: ${fmtDate(S.sd)}, ora ${S.bs}` });
      // 3. Notificare pentru medic
      await DB.insertNotification({ target: 'doctor',  text: `${PAT_NAME} — programare nouă: ${fmtDate(S.sd)}, ${S.bs}` });
      S.msg = `✓ Programare confirmată pentru ${fmtDate(S.sd)} la ora ${S.bs}`;
      S.bs = null; S.sd = null; S.tab = 'myappts';
      await render(); break;
    }

    case 'submit-sym': {
      const text = document.getElementById('sym-text')?.value?.trim();
      if (!text) { alert('Te rugăm să descrii simptomele.'); return; }
      // 1. Salvează simptomele în Supabase
      await DB.insertSymptom({ patient: PAT_NAME, date: TODAY, text });
      // 2. Notificare pentru medic
      await DB.insertNotification({ target: 'doctor', text: `${PAT_NAME} a descris simptome noi` });
      S.msg = '✓ Raportul a fost trimis. Medicul va fi notificat în curând.';
      await render(); break;
    }

    case 'submit-rx': {
      const med = document.getElementById('rx-med')?.value?.trim();
      if (!med) { alert('Te rugăm să introduci numele medicamentului.'); return; }
      // 1. Salvează cererea de rețetă în Supabase
      await DB.insertPrescription({ patient: PAT_NAME, date: TODAY, med });
      // 2. Notificare pentru medic
      await DB.insertNotification({ target: 'doctor', text: `${PAT_NAME} solicită rețetă — ${med}` });
      S.msg = '✓ Cererea a fost trimisă. Medicul o va procesa în curând.';
      await render(); break;
    }

    case 'mark-sym': {
      // Actualizează status simptom în Supabase
      await DB.markSymptomReviewed(Number(el.dataset.id));
      await render(); break;
    }

    case 'approve-rx': {
      const id = Number(el.dataset.id);
      const rx = S.cache.prescriptions.find(r => r.id === id);
      // 1. Actualizează statusul rețetei în Supabase
      await DB.updatePrescriptionStatus(id, 'approved');
      // 2. Notificare pentru pacient
      if (rx) await DB.insertNotification({ target: 'patient', text: `Rețetă ${rx.med} a fost aprobată de medic` });
      await render(); break;
    }

    case 'reject-rx': {
      // Actualizează statusul rețetei în Supabase
      await DB.updatePrescriptionStatus(Number(el.dataset.id), 'rejected');
      await render(); break;
    }

    case 'read-all': {
      const target = S.role === 'doctor' ? 'doctor' : 'patient';
      // Marchează toate notificările ca citite în Supabase
      await DB.markAllNotificationsRead(target);
      await render(); break;
    }
  }
});

// ============================================
// PWA — INSTALL PROMPT
// ============================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'flex';
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('install-banner').style.display = 'none';
});

document.getElementById('install-dismiss')?.addEventListener('click', () => {
  document.getElementById('install-banner').style.display = 'none';
});

// ============================================
// SERVICE WORKER
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service Worker activ:', reg.scope))
      .catch(err => console.warn('[PWA] SW error:', err));
  });
}

// ============================================
// NOTIFICĂRI PUSH
// ============================================
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ============================================
// PORNIRE APLICAȚIE
// ============================================
render();
requestNotificationPermission();
