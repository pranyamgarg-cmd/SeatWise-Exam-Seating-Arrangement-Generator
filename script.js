/* SeatWise - application logic */
(() => {
  const $ = id => document.getElementById(id);

  /* ---------- DATA (arrays of objects) ---------- */
  let students = [];                       // { roll, name, course, room, seat }
  let rooms = [
    { name: 'Room 101', capacity: 20 },
    { name: 'Room 102', capacity: 20 }
  ];
  let generated = false;                   // has the seating plan been created?
  let tab = 'seating';                     // current tab
  let timer;                               // toast timer

  /* ---------- HELPERS ---------- */
  // Escape text so user input cannot break the HTML
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Show a small message at the bottom-right
  function msg(text) {
    $('toast').textContent = text;
    $('toast').classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => $('toast').classList.remove('show'), 2400);
  }

  // Total seats in all rooms
  const cap = () => rooms.reduce((sum, r) => sum + r.capacity, 0);

  // Does a student match the search text?  (linear search)
  const matches = (s, q) =>
    String(s.roll).includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.course.toLowerCase().includes(q);

  // Any change to data clears the old plan
  function invalidate() {
    generated = false;
    students.forEach(s => { s.room = ''; s.seat = 0; });
    render();
  }

  /* ---------- RENDER FUNCTIONS ---------- */
  function renderRooms() {
    $('rooms').innerHTML = rooms.map((r, i) => `
      <div class="row">
        <input data-name="${i}" aria-label="Room name" value="${esc(r.name)}" maxlength="30">
        <input data-cap="${i}" aria-label="Seat capacity" type="number" min="1" max="500" value="${r.capacity}">
        <button data-remove="${i}" aria-label="Remove room">×</button>
      </div>`).join('');
  }

  function renderStats() {
    $('ns').textContent = students.length;
    $('nr').textContent = rooms.length;
    $('nc').textContent = cap();
    $('na').textContent = generated ? students.filter(s => s.room).length : 0;
    $('status').textContent = generated ? 'Plan generated' : 'Not generated';
    $('status').className = 'badge' + (generated ? ' ok' : '');
    $('notice').textContent = students.length > cap()
      ? `Not enough seats: ${students.length} students but only ${cap()} seats.`
      : `Capacity: ${cap()} seats for ${students.length} registered students.`;
  }

  // Student list tab: sorted by roll number, filtered by search
  function renderStudents() {
    const q = $('search').value.trim().toLowerCase();
    const list = [...students].sort((a, b) => a.roll - b.roll).filter(s => matches(s, q));

    if (!list.length) {
      $('workspace').innerHTML = `<div class="empty">♙<b>${students.length ? 'No matching students' : 'No students registered yet'}</b>${students.length ? 'Try another search.' : 'Add students using the registration form.'}</div>`;
      return;
    }

    $('workspace').innerHTML = `
      <div class="tablewrap"><table>
        <thead><tr><th>Roll number</th><th>Student name</th><th>Class / course</th><th>Room</th><th>Seat</th><th></th></tr></thead>
        <tbody>${list.map(s => `
          <tr>
            <td><b>${s.roll}</b></td>
            <td>${esc(s.name)}</td>
            <td>${esc(s.course)}</td>
            <td>${generated ? esc(s.room) : '—'}</td>
            <td>${generated ? s.seat : '—'}</td>
            <td><button data-delete="${s.roll}">Remove</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p style="font-size:12px;color:var(--muted)">${list.length} student(s) shown</p>`;
  }

  // Seating chart tab: one grid of seats per room
  function renderSeating() {
    if (!generated) {
      $('workspace').innerHTML = '<div class="empty">▦<b>Your seating chart will appear here</b>Register students, configure rooms, then select “Generate seating plan”.</div>';
      return;
    }

    const q = $('search').value.trim().toLowerCase();
    let html = '<div class="legend"><i></i>Assigned seat <i class="v"></i>Vacant seat</div>';

    rooms.forEach(r => {
      const assigned = students.filter(s => s.room === r.name);
      const shown = assigned.filter(s => !q || matches(s, q));
      if (q && !shown.length) return;                    // hide rooms with no match

      html += `<div class="room"><div class="roomhead"><b>${esc(r.name)}</b><span>${assigned.length} / ${r.capacity} seats occupied</span></div><div class="seats">`;

      for (let i = 1; i <= r.capacity; i++) {
        const s = assigned.find(x => x.seat === i);     // who sits on seat i?
        if (s && (!q || matches(s, q))) {
          html += `<div class="seat"><small>Seat ${i}</small><b>${esc(s.name)}</b><p>Roll ${s.roll} · ${esc(s.course)}</p></div>`;
        } else if (!s && !q) {
          html += `<div class="seat vacant"><small>Seat ${i}</small><b>Vacant</b><p>Available</p></div>`;
        }
      }
      html += '</div></div>';
    });

    if (q && !students.some(s => matches(s, q))) {
      html = '<div class="empty">⌕<b>No matching student found</b>Try another name or roll number.</div>';
    }
    $('workspace').innerHTML = html;
  }

  function renderWorkspace() {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    tab === 'students' ? renderStudents() : renderSeating();
  }

  function render() {
    renderRooms();
    renderStats();
    renderWorkspace();
  }

  /* ---------- EVENTS ---------- */

  // Register a student
  $('studentForm').addEventListener('submit', e => {
    e.preventDefault();
    const roll = Number($('roll').value);
    const name = $('name').value.trim();
    const course = $('course').value.trim();

    if (!Number.isInteger(roll) || roll < 1) return msg('Enter a valid positive roll number.');
    if (students.some(s => s.roll === roll)) return msg('That roll number is already registered.');
    if (!name || !course) return msg('Complete all student fields.');

    students.push({ roll, name, course, room: '', seat: 0 });
    $('studentForm').reset();
    $('course').value = 'CSE-A';
    invalidate();
    msg('Student registered successfully.');
  });

  // Edit room name or capacity
  $('rooms').addEventListener('change', e => {
    let i;
    if (e.target.dataset.name !== undefined) {
      i = +e.target.dataset.name;
      const n = e.target.value.trim();
      if (!n) return msg('Room name cannot be empty.');
      if (rooms.some((r, j) => j !== i && r.name.toLowerCase() === n.toLowerCase())) {
        e.target.value = rooms[i].name;
        return msg('Room names must be unique.');
      }
      rooms[i].name = n;
      invalidate();
    } else if (e.target.dataset.cap !== undefined) {
      i = +e.target.dataset.cap;
      const n = +e.target.value;
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        e.target.value = rooms[i].capacity;
        return msg('Capacity must be between 1 and 500.');
      }
      rooms[i].capacity = n;
      invalidate();
    }
  });

  // Remove a room
  $('rooms').addEventListener('click', e => {
    if (e.target.dataset.remove !== undefined) {
      rooms.splice(+e.target.dataset.remove, 1);
      invalidate();
      msg('Room removed.');
    }
  });

  // Add a room
  $('addRoom').addEventListener('click', () => {
    if (rooms.length >= 20) return msg('Maximum of 20 rooms allowed.');
    let n = rooms.length + 1;
    while (rooms.some(r => r.name === `Room ${n}`)) n++;
    rooms.push({ name: `Room ${n}`, capacity: 20 });
    invalidate();
    msg('Room added.');
  });

  // *** MAIN ALGORITHM: generate the seating plan ***
  $('generate').addEventListener('click', () => {
    if (!students.length) return msg('Register at least one student first.');
    if (!rooms.length) return msg('Add at least one room first.');
    if (students.length > cap()) return msg(`Not enough seats. Need ${students.length - cap()} more.`);

    students.sort((a, b) => a.roll - b.roll);            // 1. sort by roll number

    let i = 0;                                           // 2. fill rooms one by one
    rooms.forEach(r => {
      for (let seat = 1; seat <= r.capacity && i < students.length; seat++, i++) {
        students[i].room = r.name;
        students[i].seat = seat;
      }
    });

    generated = true;
    tab = 'seating';
    render();
    msg('Seating plan generated successfully.');
  });

  // Search box and tabs
  $('search').addEventListener('input', renderWorkspace);
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    renderWorkspace();
  }));

  // Remove a student
  $('workspace').addEventListener('click', e => {
    if (e.target.dataset.delete) {
      students = students.filter(s => s.roll !== +e.target.dataset.delete);
      invalidate();
      msg('Student removed.');
    }
  });

  // Load demo data: 10 students, 2 rooms of 6 seats
  $('demo').addEventListener('click', () => {
    students = [
      ['Aarav Sharma', 'CSE-A'], ['Ananya Patel', 'CSE-A'], ['Ishaan Verma', 'ECE-A'],
      ['Meera Shah', 'CSE-B'], ['Rohan Desai', 'ECE-A'], ['Sara Khan', 'CSE-B'],
      ['Kabir Joshi', 'CSE-A'], ['Diya Nair', 'ECE-A'], ['Vivaan Rao', 'CSE-B'],
      ['Aditi Kulkarni', 'CSE-A']
    ].map((x, i) => ({ roll: 101 + i, name: x[0], course: x[1], room: '', seat: 0 }));
    rooms = [{ name: 'Room 101', capacity: 6 }, { name: 'Room 102', capacity: 6 }];
    $('search').value = '';
    tab = 'seating';
    invalidate();
    msg('Demo data loaded. Generate the seating plan.');
  });

  // Export the seating plan as a text file
  $('export').addEventListener('click', () => {
    if (!generated) return msg('Generate a seating plan before exporting.');

    const out = ['EXAM SEATING ARRANGEMENT REPORT', `Total students: ${students.length}`, ''];
    rooms.forEach(r => {
      out.push(`${r.name} (capacity: ${r.capacity})`, '----------------------------------------');
      students.filter(s => s.room === r.name)
        .sort((a, b) => a.seat - b.seat)
        .forEach(s => out.push(`Seat ${s.seat} | Roll ${s.roll} | Name: ${s.name} | Class: ${s.course}`));
      out.push('');
    });

    const url = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seating_report.txt';
    a.click();
    URL.revokeObjectURL(url);
    msg('Report downloaded.');
  });

  render();                                              // first draw
})();
