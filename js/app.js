var API_URL = 'https://miafood-api.matteoriserva0411.workers.dev';

(function () {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();

(function () {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.style.color = '');
        const active = document.querySelector('nav a[href="#' + entry.target.id + '"]');
        if (active) active.style.color = 'var(--red)';
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => io.observe(s));
})();

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

(function () {
  var dateInput = document.getElementById('b-date');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }
})();

function submitBooking() {
  var name   = (document.getElementById('b-name').value   || '').trim();
  var phone  = (document.getElementById('b-phone').value  || '').trim();
  var email  = (document.getElementById('b-email').value  || '').trim();
  var guests = (document.getElementById('b-guests').value || '').trim();
  var date   = (document.getElementById('b-date').value   || '').trim();
  var time   = (document.getElementById('b-time').value   || '').trim();
  var notes  = (document.getElementById('b-notes').value  || '').trim();

  if (!name || !phone || !guests || !date || !time) {
    alert('Compila tutti i campi obbligatori (*).');
    return;
  }

  var btn = document.getElementById('booking-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Invio in corso...';

  fetch(API_URL + '/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, phone: phone, email: email, guests: guests, date: date, time: time, notes: notes }),
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Errore server');
      return res.json();
    })
    .then(function () {
      ['b-name', 'b-phone', 'b-email', 'b-guests', 'b-date', 'b-time', 'b-notes'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.getElementById('booking-success').style.display = 'flex';
      document.getElementById('booking-error').style.display = 'none';
    })
    .catch(function () {
      document.getElementById('booking-error').style.display = 'block';
      document.getElementById('booking-success').style.display = 'none';
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Prenota il tuo tavolo →';
    });
}
