var API_URL = 'https://miafood-api.matteoriserva0411.workers.dev';
//^=^
var bookings = [];
var adminToken = null;

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
  var now = new Date();
  document.getElementById('today-label').textContent =
    now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  loadBookings();

  setInterval(function () {
    loadBookings();
    document.getElementById('table-updated').textContent =
      'Aggiornato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }, 30000);
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
          '<tr><td colspan="7"><div class="empty-state"><div class="icon">⚠️</div><p>Errore nel caricamento. Riprova.</p></div></td></tr>';
      }
    });
}

function renderStats() {
  var total  = bookings.length;
  var newB   = bookings.filter(function (b) { return b.status === 'new'; }).length;
  var conf   = bookings.filter(function (b) { return b.status === 'confirmed'; }).length;
  var guests = bookings
    .filter(function (b) { return b.status !== 'cancelled'; })
    .reduce(function (s, b) { return s + (parseInt(b.guests) || 0); }, 0);

  document.getElementById('s-total').textContent     = total;
  document.getElementById('s-new').textContent       = newB;
  document.getElementById('s-confirmed').textContent = conf;
  document.getElementById('s-guests').textContent    = guests;
}

function renderTable() {
  var search     = (document.getElementById('search-input').value || '').toLowerCase().trim();
  var filterS    = document.getElementById('filter-status').value || '';
  var filterFrom = document.getElementById('filter-date-from').value || '';
  var filterTo   = document.getElementById('filter-date-to').value || '';

  var filtered = bookings.filter(function (b) {
    var matchSearch = !search ||
      b.name.toLowerCase().includes(search) ||
      (b.phone || '').toLowerCase().includes(search);
    var matchStatus = !filterS || b.status === filterS;
    var matchFrom   = !filterFrom || b.date >= filterFrom;
    var matchTo     = !filterTo   || b.date <= filterTo;
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  var tbody = document.getElementById('table-body');

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="icon">📋</div><p>Nessuna prenotazione trovata.</p></div></td></tr>';
    document.getElementById('table-count').textContent = '0 prenotazioni';
    return;
  }

  var badgeMap = {
    new:       '<span class="badge badge-new">🟠 Nuova</span>',
    confirmed: '<span class="badge badge-confirmed">✅ Confermata</span>',
    cancelled: '<span class="badge badge-cancelled">❌ Cancellata</span>',
  };

  var rows = filtered.map(function (b) {
    var d        = new Date(b.date + 'T00:00:00');
    var dateMain = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var dateDay  = d.toLocaleDateString('it-IT', { weekday: 'long' });
    var notes    = b.notes ? b.notes.substring(0, 30) + (b.notes.length > 30 ? '…' : '') : '—';

    var actions = '';
    if (b.status !== 'confirmed') {
      actions += '<button class="btn-action btn-confirm" onclick="updateStatus(\'' + b.id + '\',\'confirmed\',event)">✓ Conf.</button>';
    }
    if (b.status !== 'cancelled') {
      actions += '<button class="btn-action btn-cancel" onclick="updateStatus(\'' + b.id + '\',\'cancelled\',event)">✗</button>';
    }
    actions += '<button class="btn-action btn-del" onclick="deleteBooking(\'' + b.id + '\',event)">🗑</button>';

    return '<tr onclick="openDetail(\'' + b.id + '\')" style="cursor:pointer">' +
      '<td class="td-name"><strong>' + escHtml(b.name) + '</strong><small>' + escHtml(b.phone) + (b.email ? ' · ' + escHtml(b.email) : '') + '</small></td>' +
      '<td class="td-date"><div class="date-main">' + dateMain + '</div><div class="date-day">' + dateDay + '</div></td>' +
      '<td><strong>' + b.time + '</strong></td>' +
      '<td style="text-align:center;font-weight:700">' + b.guests + '</td>' +
      '<td>' + (badgeMap[b.status] || b.status) + '</td>' +
      '<td class="notes-cell" title="' + escHtml(b.notes || '') + '">' + escHtml(notes) + '</td>' +
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

  var d       = new Date(b.date + 'T00:00:00');
  var dateStr = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var createdStr = new Date(b.created_at).toLocaleString('it-IT');

  var badgeMap = {
    new:       '<span class="badge badge-new">🟠 Nuova</span>',
    confirmed: '<span class="badge badge-confirmed">✅ Confermata</span>',
    cancelled: '<span class="badge badge-cancelled">❌ Cancellata</span>',
  };

  document.getElementById('modal-name').textContent = b.name;
  document.getElementById('modal-body').innerHTML =
    row('Telefono',    '<a href="tel:' + b.phone + '" style="color:var(--red);font-weight:600">' + escHtml(b.phone) + '</a>') +
    row('Email',       b.email ? '<a href="mailto:' + b.email + '" style="color:var(--red)">' + escHtml(b.email) + '</a>' : '—') +
    row('Data',        dateStr) +
    row('Orario',      '<strong>' + b.time + '</strong>') +
    row('Persone',     '<strong>' + b.guests + '</strong>') +
    row('Stato',       badgeMap[b.status] || b.status) +
    row('Note',        b.notes ? escHtml(b.notes) : '—') +
    row('Ricevuta il', createdStr);

  var actions = '';
  if (b.status !== 'confirmed') {
    actions += '<button class="btn-action btn-confirm" style="font-size:.88rem;padding:.65rem" onclick="updateStatus(\'' + b.id + '\',\'confirmed\'); closeModalDirect()">✓ Conferma</button>';
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
  var header = ['ID', 'Nome', 'Telefono', 'Email', 'Data', 'Orario', 'Persone', 'Stato', 'Note', 'Ricevuta il'];
  var rows = bookings.map(function (b) {
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
  a.download = 'prenotazioni-miafood-' + new Date().toISOString().split('T')[0] + '.csv';
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
