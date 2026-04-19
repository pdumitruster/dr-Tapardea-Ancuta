'use strict';

/* ============================================
   CABINET DR. IONESCU — Aplicație PWA
   Autentificare: pacient (nume+telefon) / medic (parolă)
   Date: Supabase
   ============================================ */

const SUPABASE_URL   = 'https://PROIECTUL_TAU.supabase.co';
const SUPABASE_KEY   = 'ANON_KEY_TAU';
const DOCTOR_PIN = '2026'; // ← schimbă cu un PIN de 4 cifre ales de dr. Țăpârdea

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// STRAT DATE — Supabase
// ============================================
const DB = {

  // ---- PATIENTS ----
  async getPatient(phone) {
    const { data, error } = await sb
      .from('patients')
      .select('*')
      .eq('phone', phone.trim())
      .single();
    if (error) return null;
    return data;
  },

  async upsertPatient({ name, phone }) {
    // Creează pacientul dacă nu există, altfel îl returnează
    const { data, error } = await sb
      .from('patients')
      .upsert({ name: name.trim(), phone: phone.trim() }, { onConflict: 'phone' })
      .select()
      .single();
    if (error) { console.error('upsert patient:', error); return null; }
    return data;
  },

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

  async insertAppointment({ date, time, patient_name, patient_phone, type }) {
    const { error } = await sb
      .from('appointments')
      .insert({ date, time, patient_name, patient_phone, type, status: 'pending' });
    if (error) console.error('insert appointment:', error);
  },

  async updateAppointmentStatus(id, status) {
    const { error } = await sb
      .from('appointments')
      .update({ status })
      .eq('id', id);
    if (error) console.error('update appointment:', error);
  },

  // ---- SYMPTOMS ----
  async getSymptoms() {
    const { data, error } = await sb
      .from('symptoms')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('symptoms:', error); return []; }
    return data;
  },

  async insertSymptom({ patient_name, patient_phone, text }) {
    const { error } = await sb
      .from('symptoms')
      .insert({ patient_name, patient_phone, text, status: 'new' });
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
      .order('created_at', { ascending: false });
    if (error) { console.error('prescriptions:', error); return []; }
    return data;
  },

  async insertPrescription({ patient_name, patient_phone, med }) {
    const { error } = await sb
      .from('prescriptions')
      .insert({ patient_name, patient_phone, med, status: 'pending' });
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
const TODAY    = new Date().toISOString().split('T')[0];
const MONTHS   = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
const DAYS_S   = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
const DAYS_L   = ['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'];
const MONTHS_S = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec'];
const SLOTS    = ['08:00','08:20','08:40','09:00','09:20','09:40','10:00','10:20','10:40','11:00','11:20','11:40','13:00','13:20','13:40','14:00','14:20','14:40','15:00','15:20','15:40'];

// ---- STATE ----
const S = {
  role:      null,
  tab:       'calendar',
  my:        { y: new Date().getFullYear(), m: new Date().getMonth() },
  sd:        null,
  bs:        null,
  msg:       null,
  err:       null,
  loading:   false,
  doctorPin: '',      // PIN introdus cifră cu cifră
  patient:   null,    // { name, phone }
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

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now  = new Date();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const hm   = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString())  return `Azi, ${hm}`;
  if (d.toDateString() === yest.toDateString()) return `Ieri, ${hm}`;
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]}, ${hm}`;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

// ---- CALENDAR ----
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

  const hasAppt = new Set(
    S.cache.appointments
      .filter(a => {
        const [ay, am] = a.date.split('-').map(Number);
        return ay === y && am === m + 1 &&
          (isDoctor || a.patient_phone === S.patient?.phone);
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
// LOGIN PAGE — cu 3 stări: alege rol / login medic / login pacient
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
        <h1 style="font-size:24px;font-weight:700;margin-top:16px;margin-bottom:6px">Cabinet Dr. Țăpârdea</h1>
        <p style="font-size:14px;color:var(--text-muted)">Medicină de familie · Craiova</p>
      </div>

      <div class="role-grid">
        <div class="role-card" data-action="show-doctor-login">
          <div class="role-icon" style="background:var(--success-bg)">
            <svg width="26" height="26" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24">
              <path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px">Sunt medic</div>
          <div style="font-size:12px;color:var(--text-muted)">Gestionează programările</div>
        </div>
        <div class="role-card" data-action="show-patient-login">
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

function renderDoctorLogin() {
  const pin = S.doctorPin || '';
  const dots = Array(4).fill(0).map((_, i) =>
    `<div style="width:14px;height:14px;border-radius:50%;background:${i < pin.length ? 'var(--primary)' : 'var(--border-strong)'}"></div>`
  ).join('');

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  const keypad = keys.map(k => k === ''
    ? '<div></div>'
    : `<button data-action="pin-key" data-key="${k}"
        style="padding:18px;font-size:20px;font-weight:600;background:var(--bg-card);
        border:0.5px solid var(--border);border-radius:var(--radius-md);
        font-family:inherit;color:var(--text);cursor:pointer;touch-action:manipulation">${k}</button>`
  ).join('');

  return `
    <div class="login-page">
      <div style="text-align:center">
        <div class="login-logo">
          <svg width="36" height="36" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24">
            <path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <h1 style="font-size:20px;font-weight:700;margin-top:14px;margin-bottom:4px">Autentificare medic</h1>
        <p style="font-size:13px;color:var(--text-muted)">Dr. Țăpârdea Ancuța</p>
      </div>

      ${S.err ? `<div style="background:var(--danger-bg);color:var(--danger-text);border-radius:var(--radius-md);padding:11px 14px;font-size:14px;text-align:center">${S.err}</div>` : ''}

      <div style="display:flex;gap:16px;justify-content:center;margin:8px 0">${dots}</div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:280px">
        ${keypad}
      </div>

      <button class="btn-ghost" data-action="back-to-roles" style="margin-top:8px">← Înapoi</button>
    </div>`;
}

function renderPatientLogin() {
  return `
    <div class="login-page">
      <div style="text-align:center">
        <div class="login-logo" style="background:var(--info-bg)">
          <svg width="36" height="36" fill="none" stroke="var(--info-text)" stroke-width="1.5" stroke-linecap="round" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h1 style="font-size:20px;font-weight:700;margin-top:14px;margin-bottom:4px">Cont pacient</h1>
        <p style="font-size:13px;color:var(--text-muted)">Introduceți datele dvs. pentru a continua</p>
      </div>

      ${S.err ? `<div style="background:var(--danger-bg);color:var(--danger-text);border-radius:var(--radius-md);padding:11px 14px;font-size:14px">${S.err}</div>` : ''}

      <div style="width:100%;max-width:340px">
        <div class="form-group">
          <label class="form-label">Nume complet</label>
          <input type="text" id="pat-name" placeholder="Ex: Ion Popescu" autocomplete="name">
        </div>
        <div class="form-group">
          <label class="form-label">Număr de telefon</label>
          <input type="tel" id="pat-phone" placeholder="Ex: 0712 345 678" autocomplete="tel">
        </div>
        <div style="background:var(--bg-surface);border-radius:var(--radius-md);padding:11px 13px;font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.5">
          Dacă este prima vizită, contul se creează automat cu aceste date.
        </div>
        <button class="btn-primary" data-action="login-patient">Continuă</button>
        <button class="btn-ghost" data-action="back-to-roles" style="display:block;text-align:center;margin-top:14px">← Înapoi</button>
      </div>
    </div>`;
}

// ============================================
// DOCTOR VIEWS
// ============================================
function viewDoctorCalendar() {
  const appts    = S.cache.appointments;
  const month    = `${S.my.y}-${String(S.my.m + 1).padStart(2,'0')}`;
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
              <div style="flex:1">
                <div class="appt-name">${a.patient_name}</div>
                <div class="appt-type">${a.type} · ${a.patient_phone}</div>
              </div>
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
      <div style="flex:1">
        <div class="appt-name">${a.patient_name}</div>
        <div class="appt-type">${a.type} · ${a.patient_phone}</div>
      </div>
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
  const pendingAppts = S.cache.appointments
    .filter(a => a.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const pendingRxs = S.cache.prescriptions
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const apptCards = pendingAppts.length
    ? pendingAppts.map(a => `
        <div class="card" style="margin-bottom:10px;border-left:3px solid var(--warning-text)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div class="avatar" style="background:var(--warning-bg);color:var(--warning-text)">${initials(a.patient_name)}</div>
            <div>
              <div style="font-size:14px;font-weight:600">${a.patient_name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${a.patient_phone}</div>
            </div>
          </div>
          <div style="font-size:13px;margin-bottom:12px;padding:8px 10px;background:var(--bg-surface);border-radius:var(--radius-sm)">
            <strong>${fmtDate(a.date)}</strong>, ora <strong>${a.time}</strong> · ${a.type}
          </div>
          <div style="display:flex;gap:8px">
            <button style="flex:1;padding:11px;background:var(--primary);color:#fff;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit"
              data-action="approve-appt"
              data-id="${a.id}"
              data-phone="${a.patient_phone}"
              data-date="${a.date}"
              data-time="${a.time}">Confirmă</button>
            <button style="flex:1;padding:11px;background:none;color:var(--danger-text);border:1px solid var(--danger-text);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit"
              data-action="reject-appt"
              data-id="${a.id}"
              data-phone="${a.patient_phone}"
              data-date="${a.date}"
              data-time="${a.time}">Respinge</button>
          </div>
        </div>`).join('')
    : '<div class="empty-state">Nicio programare în așteptare</div>';

  const rxCards = pendingRxs.length
    ? pendingRxs.map(r => `
        <div class="card" style="margin-bottom:10px;border-left:3px solid var(--info-text)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div class="avatar" style="background:var(--info-bg);color:var(--info-text)">${initials(r.patient_name)}</div>
            <div>
              <div style="font-size:14px;font-weight:600">${r.patient_name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${r.patient_phone} · ${fmtTime(r.created_at)}</div>
            </div>
          </div>
          <div style="font-size:13px;margin-bottom:12px;padding:8px 10px;background:var(--bg-surface);border-radius:var(--radius-sm)">
            Medicament: <strong>${r.med}</strong>
          </div>
          <div style="display:flex;gap:8px">
            <button style="flex:1;padding:11px;background:var(--primary);color:#fff;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit"
              data-action="approve-rx" data-id="${r.id}" data-phone="${r.patient_phone}" data-med="${r.med}">Aprobă</button>
            <button style="flex:1;padding:11px;background:none;color:var(--danger-text);border:1px solid var(--danger-text);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit"
              data-action="reject-rx" data-id="${r.id}" data-phone="${r.patient_phone}">Respinge</button>
          </div>
        </div>`).join('')
    : '<div class="empty-state">Nicio cerere de rețetă</div>';

  return `
    <div class="section-title">Programări în așteptare (${pendingAppts.length})</div>
    <div style="margin-top:10px">${apptCards}</div>
    <div class="divider"></div>
    <div class="section-title">Cereri rețete (${pendingRxs.length})</div>
    <div style="margin-top:10px">${rxCards}</div>`;
}

// Alerte = DOAR simptome noi raportate de pacienți
function viewDoctorSymptoms() {
  const syms = S.cache.symptoms;
  const nou  = syms.filter(s => s.status === 'new');
  const rev  = syms.filter(s => s.status === 'reviewed');

  const symCard = (s) => `
    <div class="card" style="margin-bottom:10px${s.status === 'new' ? ';border-left:3px solid var(--danger-text)' : ''}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div class="avatar" style="background:var(--info-bg);color:var(--info-text)">${initials(s.patient_name)}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600">${s.patient_name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${s.patient_phone} · ${fmtTime(s.created_at)}</div>
        </div>
        ${badge(s.status)}
      </div>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.5;padding:8px 10px;background:var(--bg-surface);border-radius:var(--radius-sm)">${s.text}</p>
      ${s.status === 'new' ? `
        <button style="margin-top:10px;padding:9px 16px;background:none;border:0.5px solid var(--border-strong);border-radius:var(--radius-sm);font-size:13px;cursor:pointer;font-family:inherit;color:var(--text)"
          data-action="mark-sym" data-id="${s.id}">Marchează revizuit</button>` : ''}
    </div>`;

  return `
    <div class="section-title">Simptome noi (${nou.length})</div>
    <div style="margin-top:10px">
      ${nou.length ? nou.map(symCard).join('') : '<div class="empty-state">Nicio alertă nouă</div>'}
    </div>
    ${rev.length ? `
      <div class="divider"></div>
      <div class="section-title" style="color:var(--text-muted)">Revizuite (${rev.length})</div>
      <div style="margin-top:10px;opacity:0.6">${rev.map(symCard).join('')}</div>` : ''}`;
}
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
// PATIENT VIEWS — filtrate după patient_phone
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
  // Filtru după patient_phone — nu după nume, care poate varia
  const mine = S.cache.appointments
    .filter(a => a.patient_phone === S.patient?.phone)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const upcoming = mine.filter(a => a.date >= TODAY && a.status !== 'done');
  const history  = mine.filter(a => a.date <  TODAY || a.status === 'done');

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
  // Filtru după patient_phone
  const mine = S.cache.prescriptions.filter(r => r.patient_phone === S.patient?.phone);
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
                <div style="font-size:12px;color:var(--text-muted)">Solicitată: ${fmtTime(r.created_at)}</div>
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
        <textarea id="rx-note" placeholder="Orice informație relevantă..." style="min-height:70px"></textarea>
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
  people: (count) => {
    const dot = count ? `<span class="tab-badge">${count > 9 ? '9+' : count}</span>` : '';
    return `<div class="tab-icon">${dot}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>`;
  },
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
// RENDER PRINCIPAL
// ============================================
async function render() {
  const app = document.getElementById('app');

  // Ecranele de login nu au nevoie de date din Supabase
  if (!S.role) { app.innerHTML = renderLogin(); return; }
  if (S.role === 'doctor-login')  { app.innerHTML = renderDoctorLogin();  return; }
  if (S.role === 'patient-login') { app.innerHTML = renderPatientLogin(); return; }

  const isDoctor    = S.role === 'doctor';
  const notifTarget = isDoctor ? 'doctor' : S.patient?.phone || 'patient';

  showLoading();

  const [appointments, symptoms, prescriptions, notifications] = await Promise.all([
    DB.getAppointments(),
    DB.getSymptoms(),
    DB.getPrescriptions(),
    DB.getNotifications(isDoctor ? 'doctor' : S.patient?.phone),
  ]);

  S.cache.appointments  = appointments;
  S.cache.symptoms      = symptoms;
  S.cache.prescriptions = prescriptions;
  S.cache.notifications = notifications;

  const unreadCount  = notifications.filter(n => !n.read).length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length
                     + prescriptions.filter(r => r.status === 'pending').length;
  const newSymCount  = symptoms.filter(s => s.status === 'new').length;

  const doctorTabs = [
    { id: 'calendar',     label: 'Calendar', icon: ICONS.calendar() },
    { id: 'appointments', label: 'Program',  icon: ICONS.list() },
    { id: 'patients',     label: 'Pacienți', icon: ICONS.people(pendingCount) },
    { id: 'schedule',     label: 'Orar',     icon: ICONS.clock() },
    { id: 'notifs',       label: 'Alerte',   icon: ICONS.bell(newSymCount) },
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
    else if (S.tab === 'notifs')       content = viewDoctorSymptoms();
  } else {
    if      (S.tab === 'book')         content = viewPatientBook();
    else if (S.tab === 'myappts')      content = viewPatientMyAppts();
    else if (S.tab === 'symptoms')     content = viewPatientSymptoms();
    else if (S.tab === 'rx')           content = viewPatientRx();
    else if (S.tab === 'notifs')       content = viewNotifications(false);
  }

  const userName = isDoctor ? 'Dr. Țăpârdea Ancuța' : S.patient?.name || '';

  app.innerHTML = `
    <header class="app-header">
      <div>
        <div style="font-size:15px;font-weight:700">${userName}</div>
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
// EVENT HANDLER
// ============================================
document.getElementById('app').addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  S.msg = null; S.err = null;

  switch (action) {

    case 'show-doctor-login':
      S.role = 'doctor-login'; render(); break;

    case 'show-patient-login':
      S.role = 'patient-login'; render(); break;

    case 'back-to-roles':
      S.role = null; S.doctorPin = ''; S.err = null; render(); break;

    case 'pin-key': {
      const key = el.dataset.key;
      if (!S.doctorPin) S.doctorPin = '';
      if (key === '⌫') {
        S.doctorPin = S.doctorPin.slice(0, -1);
        S.err = null;
        render();
      } else if (S.doctorPin.length < 4) {
        S.doctorPin += key;
        if (S.doctorPin.length === 4) {
          if (S.doctorPin === DOCTOR_PIN) {
            S.role = 'doctor'; S.tab = 'calendar'; S.sd = TODAY; S.doctorPin = '';
            await render();
          } else {
            S.err = 'PIN incorect. Încearcă din nou.';
            S.doctorPin = '';
            render();
          }
        } else {
          render();
        }
      }
      break;
    }

    case 'login-doctor': break; // înlocuit cu pin-key

    case 'login-patient': {
      const name  = document.getElementById('pat-name')?.value?.trim();
      const phone = document.getElementById('pat-phone')?.value?.trim().replace(/\s+/g,'');
      if (!name || !phone) {
        S.err = 'Completați numele și numărul de telefon.'; render(); return;
      }
      // Creează sau găsește pacientul în Supabase
      const pat = await DB.upsertPatient({ name, phone });
      if (!pat) {
        S.err = 'Eroare la conectare. Verificați conexiunea.'; render(); return;
      }
      S.patient = { name: pat.name, phone: pat.phone };
      S.role = 'patient'; S.tab = 'book'; S.sd = null;
      await render(); break;
    }

    case 'logout':
      S.role = null; S.patient = null; S.sd = null; S.bs = null; render(); break;

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
      if (!S.sd || !S.bs || !S.patient) return;
      const type = document.getElementById('appt-type')?.value || 'Consultație generală';
      await DB.insertAppointment({
        date: S.sd, time: S.bs,
        patient_name: S.patient.name, patient_phone: S.patient.phone, type
      });
      await DB.insertNotification({ target: 'patient_' + S.patient.phone, text: `Programare trimisă: ${fmtDate(S.sd)}, ora ${S.bs} — în așteptarea confirmării` });
      await DB.insertNotification({ target: 'doctor', text: `${S.patient.name} (${S.patient.phone}) — programare nouă: ${fmtDate(S.sd)}, ${S.bs} — necesită confirmare` });
      S.msg = `✓ Cerere trimisă pentru ${fmtDate(S.sd)} la ora ${S.bs} — medicul o va confirma în curând`;
      S.bs = null; S.sd = null; S.tab = 'myappts';
      await render(); break;
    }

    case 'submit-sym': {
      const text = document.getElementById('sym-text')?.value?.trim();
      if (!text) { alert('Te rugăm să descrii simptomele.'); return; }
      await DB.insertSymptom({ patient_name: S.patient.name, patient_phone: S.patient.phone, text });
      await DB.insertNotification({ target: 'doctor', text: `${S.patient.name} a descris simptome noi` });
      S.msg = '✓ Raportul a fost trimis. Medicul va fi notificat.';
      await render(); break;
    }

    case 'submit-rx': {
      const med = document.getElementById('rx-med')?.value?.trim();
      if (!med) { alert('Te rugăm să introduci numele medicamentului.'); return; }
      await DB.insertPrescription({ patient_name: S.patient.name, patient_phone: S.patient.phone, med });
      await DB.insertNotification({ target: 'doctor', text: `${S.patient.name} solicită rețetă — ${med}` });
      S.msg = '✓ Cererea a fost trimisă. Medicul o va procesa în curând.';
      await render(); break;
    }

    case 'approve-appt': {
      const id    = Number(el.dataset.id);
      const phone = el.dataset.phone;
      const date  = el.dataset.date;
      const time  = el.dataset.time;
      await DB.updateAppointmentStatus(id, 'confirmed');
      await DB.insertNotification({ target: 'patient_' + phone, text: `Programarea din ${fmtDate(date)}, ora ${time} a fost confirmată de medic` });
      await render(); break;
    }

    case 'reject-appt': {
      const id    = Number(el.dataset.id);
      const phone = el.dataset.phone;
      await DB.updateAppointmentStatus(id, 'rejected');
      await DB.insertNotification({ target: 'patient_' + phone, text: `Programarea a fost respinsă. Vă rugăm să alegeți altă dată.` });
      await render(); break;
    }

    case 'mark-sym':
      await DB.markSymptomReviewed(Number(el.dataset.id));
      await render(); break;

    case 'approve-rx': {
      const id    = Number(el.dataset.id);
      const phone = el.dataset.phone;
      const med   = el.dataset.med || S.cache.prescriptions.find(r => r.id === id)?.med || '';
      await DB.updatePrescriptionStatus(id, 'approved');
      if (phone) await DB.insertNotification({ target: 'patient_' + phone, text: `Rețetă ${med} aprobată de Dr. Țăpârdea` });
      await render(); break;
    }

    case 'reject-rx': {
      const id    = Number(el.dataset.id);
      const phone = el.dataset.phone;
      await DB.updatePrescriptionStatus(id, 'rejected');
      if (phone) await DB.insertNotification({ target: 'patient_' + phone, text: `Cererea de rețetă a fost respinsă. Contactați cabinetul.` });
      await render(); break;
    }

    case 'read-all': {
      const target = S.role === 'doctor' ? 'doctor' : 'patient_' + S.patient?.phone;
      await DB.markAllNotificationsRead(target);
      await render(); break;
    }
  }
});

// ============================================
// PWA
// ============================================
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  const b = document.getElementById('install-banner');
  if (b) b.style.display = 'flex';
});
document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('install-banner').style.display = 'none';
});
document.getElementById('install-dismiss')?.addEventListener('click', () => {
  document.getElementById('install-banner').style.display = 'none';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
  });
}

async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

render();
requestNotificationPermission();
