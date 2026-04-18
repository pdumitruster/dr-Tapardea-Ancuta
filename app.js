'use strict';

/* ============================================
   CABINET DR. Țăpârdea Ancuța — Aplicație PWA
   Date: localStorage (înlocuiește cu Supabase)
   ============================================ */

// ---- DATA LAYER (localStorage → Supabase-ready) ----
const DB = {
  _k: key => 'dr. Țăpârdea Ancuța_' + key,
  get(k)    { try { return JSON.parse(localStorage.getItem(this._k(k))); } catch { return null; } },
  set(k, v) { localStorage.setItem(this._k(k), JSON.stringify(v)); return v; },
  nextId()  { const id = (this.get('_id') || 100) + 1; this.set('_id', id); return id; },

  seed() {
    if (this.get('_seeded')) return;
    const T = TODAY;

    this.set('appointments', [
      { id: 1, date: '2026-04-20', time: '08:00', patient: 'Maria Popescu',   type: 'consultație', status: 'confirmed' },
      { id: 2, date: '2026-04-20', time: '09:00', patient: 'Ion Constantin',  type: 'rețetă',       status: 'confirmed' },
      { id: 3, date: '2026-04-21', time: '13:00', patient: 'Elena Moldovan',  type: 'consultație', status: 'confirmed' },
      { id: 4, date: '2026-04-22', time: '08:40', patient: 'Gheorghe Stancu', type: 'consultație', status: 'confirmed' },
      { id: 5, date: '2026-04-17', time: '08:00', patient: 'Ana Dumitrescu',  type: 'rețetă',       status: 'done'      },
      { id: 6, date: '2026-04-17', time: '09:00', patient: 'Radu Petrescu',   type: 'consultație', status: 'done'      },
      { id: 7, date: '2026-04-17', time: '10:00', patient: 'Maria Popescu',   type: 'urmărire',    status: 'done'      },
      { id: 8, date: '2026-04-23', time: '10:00', patient: 'Maria Popescu',   type: 'consultație', status: 'confirmed' },
      { id: 9, date: '2026-04-24', time: '08:00', patient: 'Ion Constantin',  type: 'consultație', status: 'confirmed' },
      { id:10, date: '2026-04-28', time: '13:00', patient: 'Gheorghe Stancu', type: 'rețetă',       status: 'confirmed' },
    ]);

    this.set('symptoms', [
      { id: 1, patient: 'Ion Constantin', date: '2026-04-16', text: 'Durere de cap persistentă, amețeli, greață de 3 zile.', status: 'new' },
      { id: 2, patient: 'Elena Moldovan', date: '2026-04-15', text: 'Tuse seacă, febră 37.8°C, oboseală pronunțată.',        status: 'reviewed' },
    ]);

    this.set('prescriptions', [
      { id: 1, patient: 'Maria Popescu',   date: '2026-04-16', med: 'Metformin 500mg', status: 'pending'  },
      { id: 2, patient: 'Gheorghe Stancu', date: '2026-04-14', med: 'Enalapril 10mg',  status: 'approved' },
    ]);

    this.set('notifs_doctor', [
      { id: 1, text: 'Ion Constantin a descris simptome noi',           time: 'Azi, 09:15',   read: false },
      { id: 2, text: 'Maria Popescu solicită rețetă — Metformin 500mg', time: 'Ieri, 14:30',  read: false },
      { id: 3, text: 'Confirmare: Gheorghe Stancu — 22 apr, 08:40',     time: 'Ieri, 10:00',  read: true  },
      { id: 4, text: 'Elena Moldovan — consultație efectuată',           time: '15 apr, 16:00',read: true  },
    ]);

    this.set('notifs_patient', [
      { id: 1, text: 'Programarea din 23 apr, 10:00 a fost confirmată', time: 'Azi, 11:00',   read: false },
      { id: 2, text: 'Rețetă Metformin 500mg — în procesare',           time: 'Ieri, 14:35',  read: false },
      { id: 3, text: 'Reminder: programare joi, 23 apr la 10:00',       time: '22 apr, 18:00',read: true  },
    ]);

    this.set('_seeded', true);
  }
};

// ---- CONSTANTE ----
const TODAY     = '2026-04-18';
const PAT_NAME  = 'Maria Popescu';
const MONTHS    = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
const DAYS_S    = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
const DAYS_L    = ['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'];
const MONTHS_S  = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec'];
const SLOTS     = ['08:00','08:20','08:40','09:00','09:20','09:40','10:00','10:20','10:40','11:00','11:20','11:40','13:00','13:20','13:40','14:00','14:20','14:40','15:00','15:20','15:40'];

// ---- STATE ----
const S = {
  role: null,
  tab:  'calendar',
  my:   { y: 2026, m: 3 },  // aprilie (0-indexed)
  sd:   null,                // data selectată
  bs:   null,                // slot selectat
  msg:  null,                // mesaj succes
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

  const appts   = DB.get('appointments') || [];
  const hasAppt = new Set(
    appts
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
      ds === TODAY   ? 'today'    : '',
      ds === S.sd    ? 'selected' : '',
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
// DOCTOR VIEWS
// ============================================
function viewDoctorCalendar() {
  const appts    = DB.get('appointments') || [];
  const confirmed = appts.filter(a => a.date.startsWith('2026-04') && a.status === 'confirmed').length;
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
  const appts    = DB.get('appointments') || [];
  const upcoming = appts.filter(a => a.date >= TODAY && a.status === 'confirmed')
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
  const syms = DB.get('symptoms')     || [];
  const rxs  = DB.get('prescriptions') || [];

  return `
    <div class="section-title">Rapoarte simptome (${syms.filter(s => s.status === 'new').length} noi)</div>
    <div style="margin-top:10px">
      ${syms.map(s => `
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
          ${s.status === 'new' ? `<button class="btn-secondary" data-action="mark-sym" data-id="${s.id}" style="margin-top:12px;font-size:13px">Marchează revizuit</button>` : ''}
        </div>`).join('')}
    </div>
    <div class="section-title" style="margin-top:10px">Cereri rețete</div>
    <div style="margin-top:10px">
      ${rxs.map(r => `
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
        </div>`).join('')}
    </div>`;
}

function viewDoctorSchedule() {
  const working  = ['Luni','Marți','Miercuri','Joi','Vineri'];
  const weekend  = ['Sâmbătă','Duminică'];
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
    </div>
    <div style="margin-top:16px;padding:13px;background:var(--bg-surface);border-radius:var(--radius-md);font-size:13px;color:var(--text-muted);line-height:1.5">
      <strong>Pasul următor:</strong> Conectează Supabase pentru a edita programul și a sincroniza în timp real.
    </div>`;
}

// ============================================
// PATIENT VIEWS
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

    const booked  = (DB.get('appointments') || []).filter(a => a.date === S.sd).map(a => a.time);
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
  const appts    = DB.get('appointments') || [];
  const mine     = appts.filter(a => a.patient === PAT_NAME)
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
        <option>Azi</option>
        <option>1–2 zile</option>
        <option>3–7 zile</option>
        <option>Peste o săptămână</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Descrieți simptomele</label>
      <textarea id="sym-text" placeholder="Ex: durere de cap, febră 38°C, tuse seacă..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Intensitate simptome</label>
      <select id="severity">
        <option>1 — Ușoară (deranjant dar gestionabil)</option>
        <option>2 — Moderată</option>
        <option selected>3 — Medie</option>
        <option>4 — Semnificativă (afectează activitățile zilnice)</option>
        <option>5 — Severă (necesită atenție urgentă)</option>
      </select>
    </div>
    <button class="btn-primary" data-action="submit-sym">Trimite raport medicului</button>`;
}

function viewPatientRx() {
  const mine = (DB.get('prescriptions') || []).filter(r => r.patient === PAT_NAME);

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
  const key    = isDoctor ? 'notifs_doctor' : 'notifs_patient';
  const notifs = DB.get(key) || [];
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
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${n.time}</div>
            </div>
          </div>`).join('')
      : '<div class="empty-state">Nicio notificare</div>'
    }`;
}

// ============================================
// ICONS (SVG inline)
// ============================================
const ico = (path, extra='') =>
  `<div class="tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" ${extra}>${path}</svg></div>`;

const ICONS = {
  calendar: () => ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  list:     () => ico('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  people:   () => ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
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

      <p style="font-size:12px;color:var(--text-hint);text-align:center;max-width:260px;line-height:1.5">
        Versiune demo · Datele sunt salvate local pe dispozitiv
      </p>
    </div>`;
}

// ============================================
// RENDER PRINCIPAL
// ============================================
function render() {
  const app = document.getElementById('app');
  if (!S.role) { app.innerHTML = renderLogin(); return; }

  const isDoctor    = S.role === 'doctor';
  const notifKey    = isDoctor ? 'notifs_doctor' : 'notifs_patient';
  const unreadCount = (DB.get(notifKey) || []).filter(n => !n.read).length;

  const doctorTabs = [
    { id: 'calendar',     label: 'Calendar', icon: ICONS.calendar() },
    { id: 'appointments', label: 'Program',  icon: ICONS.list() },
    { id: 'patients',     label: 'Pacienți', icon: ICONS.people() },
    { id: 'schedule',     label: 'Orar',     icon: ICONS.clock() },
    { id: 'notifs',       label: 'Alerte',   icon: ICONS.bell(unreadCount) },
  ];

  const patientTabs = [
    { id: 'book',    label: 'Programare', icon: ICONS.plus() },
    { id: 'myappts', label: 'Ale mele',   icon: ICONS.list() },
    { id: 'symptoms',label: 'Simptome',   icon: ICONS.heart() },
    { id: 'rx',      label: 'Rețete',     icon: ICONS.rx() },
    { id: 'notifs',  label: 'Alerte',     icon: ICONS.bell(unreadCount) },
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
        <div style="font-size:15px;font-weight:700">${isDoctor ? 'Dr. Țăpârdea Ancuța' : PAT_NAME}</div>
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
          ${t.icon}
          <span>${t.label}</span>
        </button>`).join('')}
    </nav>`;
}

// ============================================
// EVENT HANDLER CENTRAL
// ============================================
document.getElementById('app').addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  S.msg = null; // șterge mesajul anterior la orice acțiune

  switch (action) {
    case 'login-doctor':
      S.role = 'doctor'; S.tab = 'calendar'; S.sd = TODAY; render(); break;

    case 'login-patient':
      S.role = 'patient'; S.tab = 'book'; S.sd = null; render(); break;

    case 'logout':
      S.role = null; S.sd = null; S.bs = null; render(); break;

    case 'tab':
      S.tab = el.dataset.tab; render(); break;

    case 'prev-month': {
      let { y, m } = S.my; m--; if (m < 0) { m = 11; y--; } S.my = { y, m }; render(); break;
    }
    case 'next-month': {
      let { y, m } = S.my; m++; if (m > 11) { m = 0; y++; } S.my = { y, m }; render(); break;
    }
    case 'seldate':
      S.sd = el.dataset.date; S.bs = null; render(); break;

    case 'selslot':
      S.bs = el.dataset.slot; render(); break;

    case 'book-confirm': {
      if (!S.sd || !S.bs) return;
      const type  = document.getElementById('appt-type')?.value || 'Consultație generală';
      const appts = DB.get('appointments') || [];
      appts.push({ id: DB.nextId(), date: S.sd, time: S.bs, patient: PAT_NAME, type, status: 'confirmed' });
      DB.set('appointments', appts);
      // notificare pacient
      const pN = DB.get('notifs_patient') || [];
      pN.unshift({ id: DB.nextId(), text: `Programare confirmată: ${fmtDate(S.sd)}, ora ${S.bs}`, time: 'Acum', read: false });
      DB.set('notifs_patient', pN);
      // notificare medic
      const dN = DB.get('notifs_doctor') || [];
      dN.unshift({ id: DB.nextId(), text: `${PAT_NAME} — programare nouă: ${fmtDate(S.sd)}, ${S.bs}`, time: 'Acum', read: false });
      DB.set('notifs_doctor', dN);
      S.msg = `✓ Programare confirmată pentru ${fmtDate(S.sd)} la ora ${S.bs}`;
      S.bs = null; S.sd = null; S.tab = 'myappts';
      render(); break;
    }
    case 'submit-sym': {
      const text = document.getElementById('sym-text')?.value?.trim();
      if (!text) { alert('Te rugăm să descrii simptomele.'); return; }
      const syms = DB.get('symptoms') || [];
      syms.unshift({ id: DB.nextId(), patient: PAT_NAME, date: TODAY, text, status: 'new' });
      DB.set('symptoms', syms);
      const dN = DB.get('notifs_doctor') || [];
      dN.unshift({ id: DB.nextId(), text: `${PAT_NAME} a descris simptome noi`, time: 'Acum', read: false });
      DB.set('notifs_doctor', dN);
      S.msg = '✓ Raportul a fost trimis. Medicul va fi notificat în curând.';
      render(); break;
    }
    case 'submit-rx': {
      const med = document.getElementById('rx-med')?.value?.trim();
      if (!med) { alert('Te rugăm să introduci numele medicamentului.'); return; }
      const rxs = DB.get('prescriptions') || [];
      rxs.unshift({ id: DB.nextId(), patient: PAT_NAME, date: TODAY, med, status: 'pending' });
      DB.set('prescriptions', rxs);
      const dN = DB.get('notifs_doctor') || [];
      dN.unshift({ id: DB.nextId(), text: `${PAT_NAME} solicită rețetă — ${med}`, time: 'Acum', read: false });
      DB.set('notifs_doctor', dN);
      S.msg = '✓ Cererea a fost trimisă. Medicul o va procesa în curând.';
      render(); break;
    }
    case 'mark-sym': {
      const syms = DB.get('symptoms') || [];
      const s    = syms.find(x => x.id === Number(el.dataset.id));
      if (s) s.status = 'reviewed';
      DB.set('symptoms', syms);
      render(); break;
    }
    case 'approve-rx': {
      const rxs = DB.get('prescriptions') || [];
      const r   = rxs.find(x => x.id === Number(el.dataset.id));
      if (r) {
        r.status = 'approved';
        const pN = DB.get('notifs_patient') || [];
        pN.unshift({ id: DB.nextId(), text: `Rețetă ${r.med} a fost aprobată de medic`, time: 'Acum', read: false });
        DB.set('notifs_patient', pN);
      }
      DB.set('prescriptions', rxs);
      render(); break;
    }
    case 'reject-rx': {
      const rxs = DB.get('prescriptions') || [];
      const r   = rxs.find(x => x.id === Number(el.dataset.id));
      if (r) r.status = 'rejected';
      DB.set('prescriptions', rxs);
      render(); break;
    }
    case 'read-all': {
      const key    = S.role === 'doctor' ? 'notifs_doctor' : 'notifs_patient';
      const notifs = DB.get(key) || [];
      notifs.forEach(n => n.read = true);
      DB.set(key, notifs);
      render(); break;
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
// SERVICE WORKER REGISTRATION
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service Worker activ:', reg.scope))
      .catch(err => console.warn('[PWA] SW error:', err));
  });
}

// ============================================
// NOTIFICĂRI PUSH — Cerere permisiune
// ============================================
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ============================================
// PORNIRE APLICAȚIE
// ============================================
DB.seed();
render();
requestNotificationPermission();
