var API_URL = 'https://miafood-api.matteoriserva0411.workers.dev';

var bookings = [];
var currentDay = todayStr();

function dateToStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function todayStr() {
  return dateToStr(new Date());
}

function formatDayLabel(dateStr) {
  var parts = dateStr.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  var today = todayStr();
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = dateToStr(yesterday);
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowStr = dateToStr(tomorrow);

  if (dateStr === today) return 'Oggi';
  if (dateStr === yesterdayStr) return 'Ieri';
  if (dateStr === tomorrowStr) return 'Domani';
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getToken() {
  return sessionStorage.getItem('mf_token');
}

function doLogin() {
  var pwd = document.getElementById('pwd').value;
  if (!pwd) return;

  fetch(API_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd }),
  })
    .then(function (res) {
      if (!res.ok) throw new Error('wrong');
      return res.json();
    })
    .then(function (data) {
      sessionStorage.setItem('mf_token', data.token);
      document.getElementById('login-wrap').style.display = 'none';
      document.getElementById('admin-wrap').style.display = 'flex';
      init();
    })
    .catch(function () {
      document.getElementById('login-error').style.display = 'block';
      document.getElementById('pwd').value = '';
    });
}

function doLogout() {
  sessionStorage.removeItem('mf_token');
  location.reload();
}

if (getToken()) {
  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('admin-wrap').style.display = 'flex';
}

function init() {
  renderDayNav();
  loadBookings();

  setInterval(function () {
    loadBookings();
    document.getElementById('table-updated').textContent =
      'Aggiornato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }, 30000);
}

function renderDayNav() {
  document.getElementById('day-label').textContent = formatDayLabel(currentDay);
  var parts = currentDay.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  var fullDate = d.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('day-full').textContent = fullDate;
}

function prevDay() {
  var parts = currentDay.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  d.setDate(d.getDate() - 1);
  currentDay = dateToStr(d);
  renderDayNav();
  renderStats();
  renderTable();
}

function nextDay() {
  var parts = currentDay.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  d.setDate(d.getDate() + 1);
  currentDay = dateToStr(d);
  renderDayNav();
  renderStats();
  renderTable();
}

function goToday() {
  currentDay = todayStr();
  renderDayNav();
  renderStats();
  renderTable();
}

function bookingsForDay() {
  return bookings.filter(function (b) { return b.date === currentDay; });
}

function loadBookings() {
  fetch(API_URL + '/api/bookings', {
    headers: { Authorization: 'Bearer ' + getToken() },
  })
    .then(function (res) {
      if (res.status === 401) { doLogout(); throw new Error('unauth'); }
      if (!res.ok) throw new Error('Errore server');
      return res.json();
    })
    .then(function (data) {
      bookings = data;
      renderStats();
      renderTable();
    })
    .catch(function (err) {
      if (err.message !== 'unauth') {
        document.getElementById('table-body').innerHTML =
          '<tr><td colspan="8"><div class="empty-state"><div class="icon">⚠️</div><p>Errore nel caricamento. Riprova.</p></div></td></tr>';
      }
    });
}

function renderStats() {
  var day = bookingsForDay();
  var total  = day.length;
  var newB   = day.filter(function (b) { return b.status === 'new'; }).length;
  var conf   = day.filter(function (b) { return b.status === 'confirmed'; }).length;
  var attesi = day
    .filter(function (b) { return b.status === 'new'; })
    .reduce(function (s, b) { return s + (parseInt(b.guests) || 0); }, 0);

  document.getElementById('s-total').textContent     = total;
  document.getElementById('s-new').textContent       = newB;
  document.getElementById('s-confirmed').textContent = conf;
  document.getElementById('s-guests').textContent    = attesi;
}

function renderTable() {
  var search  = (document.getElementById('search-input').value || '').toLowerCase().trim();
  var filterS = document.getElementById('filter-status').value || '';

  var filtered = bookingsForDay().filter(function (b) {
    var matchSearch = !search ||
      b.name.toLowerCase().includes(search) ||
      (b.phone || '').toLowerCase().includes(search);
    var matchStatus = !filterS || b.status === filterS;
    return matchSearch && matchStatus;
  });

  var tbody = document.getElementById('table-body');

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📋</div><p>Nessuna prenotazione per questo giorno.</p></div></td></tr>';
    document.getElementById('table-count').textContent = '0 prenotazioni';
    return;
  }

  var badgeMap = {
    new:       '<span class="badge badge-new">🟠 In attesa</span>',
    confirmed: '<span class="badge badge-confirmed">✅ Arrivati</span>',
    cancelled: '<span class="badge badge-cancelled">❌ Cancellata</span>',
  };

  var rows = filtered.map(function (b) {
    var parts    = b.date.split('-');
    var d        = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var dateMain = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var dateDay  = d.toLocaleDateString('it-IT', { weekday: 'long' });
    var notes    = b.notes ? b.notes.substring(0, 30) + (b.notes.length > 30 ? '…' : '') : '—';
    var sentAt   = new Date(b.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    var actions = '';
    if (b.status === 'new') {
      actions += '<button class="btn-action btn-confirm" onclick="updateStatus(\'' + b.id + '\',\'confirmed\',event)" title="Segna come arrivati">✓ Arrivati</button>';
    }
    if (b.status !== 'cancelled') {
      actions += '<button class="btn-action btn-cancel" onclick="updateStatus(\'' + b.id + '\',\'cancelled\',event)" title="Cancella">✗</button>';
    }
    actions += '<button class="btn-action btn-del" onclick="deleteBooking(\'' + b.id + '\',event)" title="Elimina">🗑</button>';

    return '<tr onclick="openDetail(\'' + b.id + '\')" style="cursor:pointer">' +
      '<td class="td-name"><strong>' + escHtml(b.name) + '</strong><small>' + escHtml(b.phone) + (b.email ? ' · ' + escHtml(b.email) : '') + '</small></td>' +
      '<td class="td-date"><div class="date-main">' + dateMain + '</div><div class="date-day">' + dateDay + '</div></td>' +
      '<td><strong>' + b.time + '</strong></td>' +
      '<td style="text-align:center;font-weight:700">' + b.guests + '</td>' +
      '<td>' + (badgeMap[b.status] || b.status) + '</td>' +
      '<td class="notes-cell" title="' + escHtml(b.notes || '') + '">' + escHtml(notes) + '</td>' +
      '<td style="font-size:.8rem;color:var(--muted);white-space:nowrap">' + sentAt + '</td>' +
      '<td><div class="action-btns" onclick="event.stopPropagation()">' + actions + '</div></td>' +
      '</tr>';
  }).join('');

  tbody.innerHTML = rows;
  document.getElementById('table-count').textContent =
    filtered.length + ' prenotazion' + (filtered.length === 1 ? 'e' : 'i');
}

function updateStatus(id, status, event) {
  if (event) event.stopPropagation();

  fetch(API_URL + '/api/bookings/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: JSON.stringify({ status: status }),
  })
    .then(function (res) {
      if (!res.ok) throw new Error();
      var b = bookings.find(function (x) { return x.id === id; });
      if (b) b.status = status;
      renderStats();
      renderTable();
    })
    .catch(function () { alert('Errore nell\'aggiornamento. Riprova.'); });
}

function deleteBooking(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('Eliminare definitivamente questa prenotazione?')) return;

  fetch(API_URL + '/api/bookings/' + id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + getToken() },
  })
    .then(function (res) {
      if (!res.ok) throw new Error();
      bookings = bookings.filter(function (b) { return b.id !== id; });
      closeModalDirect();
      renderStats();
      renderTable();
    })
    .catch(function () { alert('Errore nell\'eliminazione. Riprova.'); });
}

function openDetail(id) {
  var b = bookings.find(function (x) { return x.id === id; });
  if (!b) return;

  var parts    = b.date.split('-');
  var d        = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  var dateStr  = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var createdStr = new Date(b.created_at).toLocaleString('it-IT');

  var badgeMap = {
    new:       '<span class="badge badge-new">🟠 In attesa</span>',
    confirmed: '<span class="badge badge-confirmed">✅ Arrivati</span>',
    cancelled: '<span class="badge badge-cancelled">❌ Cancellata</span>',
  };

  document.getElementById('modal-name').textContent = b.name;
  document.getElementById('modal-body').innerHTML =
    row('Telefono',      '<a href="tel:' + b.phone + '" style="color:var(--red);font-weight:600">' + escHtml(b.phone) + '</a>') +
    row('Email',         b.email ? '<a href="mailto:' + b.email + '" style="color:var(--red)">' + escHtml(b.email) + '</a>' : '—') +
    row('Data',          dateStr) +
    row('Orario',        '<strong>' + b.time + '</strong>') +
    row('Persone',       '<strong>' + b.guests + '</strong>') +
    row('Stato',         badgeMap[b.status] || b.status) +
    row('Note',          b.notes ? escHtml(b.notes) : '—') +
    row('Prenotazione inviata', createdStr);

  var actions = '';
  if (b.status === 'new') {
    actions += '<button class="btn-action btn-confirm" style="font-size:.88rem;padding:.65rem" onclick="updateStatus(\'' + b.id + '\',\'confirmed\'); closeModalDirect()">✓ Segna arrivati</button>';
  }
  if (b.status !== 'cancelled') {
    actions += '<button class="btn-action btn-cancel" style="font-size:.88rem;padding:.65rem" onclick="updateStatus(\'' + b.id + '\',\'cancelled\'); closeModalDirect()">✗ Cancella</button>';
  }
  document.getElementById('modal-actions').innerHTML = actions;
  document.getElementById('modal-overlay').classList.add('open');
}

function row(lbl, val) {
  return '<div class="modal-row"><div class="modal-row-lbl">' + lbl + '</div><div class="modal-row-val">' + val + '</div></div>';
}

function closeModal(event) {
  if (event.target === document.getElementById('modal-overlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function exportCSV() {
  var day = bookingsForDay();
  var header = ['ID', 'Nome', 'Telefono', 'Email', 'Data', 'Orario', 'Persone', 'Stato', 'Note', 'Prenotazione inviata'];
  var rows = day.map(function (b) {
    return [b.id, b.name, b.phone, b.email || '', b.date, b.time, b.guests, b.status,
      (b.notes || '').replace(/"/g, '""'), b.created_at]
      .map(function (v) { return '"' + v + '"'; }).join(',');
  });
  var csv  = [header.join(',')].concat(rows).join('\n');
  var bom  = '\uFEFF';
  var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'prenotazioni-miafood-' + currentDay + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('pwd') && document.getElementById('pwd').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') doLogin();
});

if (getToken()) {
  init();
}
