// dashboard.js (module)
// Supabase-backed Management Dashboard for Ilimi International
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---------------- CONFIG (your Supabase credentials) ----------------
const SUPABASE_URL = 'https://mhxaxxhhpyjujroyjzzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oeGF4eGhocHlqdWpyb3lqenpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2OTY0NjUsImV4cCI6MjA3MDI3MjQ2NX0.G1rcTI9mhr4euCw8RakmSmzNJlPkGpQPkNx49PsEUWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DEFAULT_PW = '0000';

// ----------------- Utility -----------------
const $ = id => document.getElementById(id);
const now = () => new Date().toISOString();
const uid = (p='id_') => p + Math.random().toString(36).slice(2,9);
const normalize = s => (s||'').toString().replace(/\s+/g,'').replace(/[^a-zA-Z0-9]/g,'');

// ----------------- UI: accordion & notifications -----------------
function setupUI() {
  document.querySelectorAll('.accordion .accordion-header').forEach(h => {
    h.addEventListener('click', () => {
      const body = h.nextElementSibling;
      const icon = h.querySelector('i');
      if (body.style.display === 'block') {
        body.style.display = 'none';
        if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
      } else {
        body.style.display = 'block';
        if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
      }
    });
    // collapsed by default
    const body = h.nextElementSibling;
    body.style.display = 'none';
  });

  // notif bell
  const bell = document.getElementById('notifBell');
  const list = document.getElementById('notifList');
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    list.style.display = (list.style.display === 'block') ? 'none' : 'block';
  });
  document.addEventListener('click', () => list.style.display = 'none');

  // wire buttons
  $('addTeachersBtn').addEventListener('click', onAddTeachers);
  $('addClassesBtn').addEventListener('click', onAddClasses);
  $('addSubjectsBtn').addEventListener('click', onAddSubjects);
  $('addStudentsBtn').addEventListener('click', onAddStudents);
  $('logoutBtn').addEventListener('click', () => alert('Logged out (simulate)'));
}

// ----------------- Data helpers (Supabase CRUD) -----------------

// TEACHERS
async function fetchTeachers() {
  const { data, error } = await supabase.from('teachers').select('*').order('id', { ascending: true });
  if (error) console.error('fetchTeachers', error);
  return data || [];
}
async function insertTeachers(bulkNames) {
  const rows = bulkNames.map(n => ({ name: n, username: generateTeacherUsername(n), password: DEFAULT_PW, role: 'teacher' }));
  const { error } = await supabase.from('teachers').insert(rows);
  if (error) throw error;
  return true;
}
function generateTeacherUsername(name) {
  let base = normalize(name);
  if (!base) base = 'teacher';
  return base;
}

// CLASSES
async function fetchClasses() {
  const { data, error } = await supabase.from('classes').select('*').order('id');
  if (error) console.error('fetchClasses', error);
  return data || [];
}
async function insertClasses(bulkNames, form_master_id=null) {
  const rows = bulkNames.map(n => ({ name: n, form_master_id }));
  const { error } = await supabase.from('classes').insert(rows);
  if (error) throw error;
  return true;
}

// SUBJECTS
async function fetchSubjects() {
  const { data, error } = await supabase.from('subjects').select('*').order('id');
  if (error) console.error('fetchSubjects', error);
  return data || [];
}
async function insertSubjects(bulkNames, class_id, teacher_id=null) {
  const rows = bulkNames.map(n => ({ name: n, class_id, teacher_id }));
  const { error } = await supabase.from('subjects').insert(rows);
  if (error) throw error;
  return true;
}

// STUDENTS
async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*').order('id');
  if (error) console.error('fetchStudents', error);
  return data || [];
}
async function insertStudents(bulkNames, class_id) {
  // generate usernames: class name + incremental serial starting 1001 per class
  // fetch existing students for class to find next serial
  const { data: existing, error: e } = await supabase.from('students').select('username').eq('class_id', class_id);
  if (e) console.error(e);
  const serials = existing ? existing.map(s => {
    const m = (s.username||'').match(/(\d+)$/);
    return m ? parseInt(m[1],10) : null;
  }).filter(Boolean) : [];
  let start = 1001;
  if (serials.length) start = Math.max(...serials) + 1;
  const rows = bulkNames.map((n, i) => {
    const username = normalize(`${class_id}${start + i}`); // safe unique-ish ID; we'll store readable username later
    return { name: n, username, password: DEFAULT_PW, class_id };
  });
  const { error } = await supabase.from('students').insert(rows);
  if (error) throw error;
  return true;
}

// NOTIFICATIONS
async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('id', { ascending: false }).limit(50);
  if (error) console.error('fetchNotifications', error);
  return data || [];
}
async function insertNotification(message) {
  const { error } = await supabase.from('notifications').insert([{ message }]);
  if (error) console.error('insertNotification', error);
  return true;
}

// DELETE helpers (single)
async function deleteTeacher(teacherId) {
  const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
  if (error) console.error('deleteTeacher', error);
}
async function deleteClass(classId) {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) console.error('deleteClass', error);
}
async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) console.error('deleteSubject', error);
}
async function deleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) console.error('deleteStudent', error);
}

// ----------------- UI rendering -----------------
async function renderAll() {
  await renderTeachers();
  await renderClasses();
  await renderSubjects();
  await renderStudents();
  await renderNotifications();
  await updateCounts();
}

async function renderTeachers() {
  const arr = await fetchTeachers();
  const container = $('teacherList'); container.innerHTML = '';
  arr.forEach(t => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `<div><strong>${t.name}</strong> <span class="muted">(${t.username})</span></div>
      <div>
        <button class="icon-btn" data-id="${t.id}" data-username="${t.username}" title="Forgot password"><i class="fas fa-key"></i></button>
        <button class="icon-btn" data-edit="${t.id}" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="icon-btn" data-del="${t.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </div>`;
    container.appendChild(div);
  });
  // attach handlers
  container.querySelectorAll('button[data-id]').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const username = e.currentTarget.getAttribute('data-username');
      await onForgotPassword(username);
    });
  });
  container.querySelectorAll('button[data-edit]').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-edit');
      const newName = prompt('Edit teacher name:');
      if (newName) {
        const { error } = await supabase.from('teachers').update({ name: newName }).eq('id', id);
        if (error) alert('Error updating teacher');
        else renderTeachers();
      }
    });
  });
  container.querySelectorAll('button[data-del]').forEach(b => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-del');
      if (!confirm('Delete teacher? This will unassign them from subjects and classes.')) return;
      await deleteTeacher(id);
      await renderAll();
    });
  });

  // populate teacher selectors
  const select1 = $('formMasterSelect'); const select2 = $('subjectTeacherSelect');
  if (select1) { select1.innerHTML = '<option value="">Assign form master (optional)</option>'; arr.forEach(t => select1.add(new Option(`${t.username} — ${t.name}`, t.id))); }
  if (select2) { select2.innerHTML = '<option value="">Assign teacher (optional)</option>'; arr.forEach(t => select2.add(new Option(`${t.username} — ${t.name}`, t.id))); }
}

async function renderClasses() {
  const arr = await fetchClasses();
  const container = $('classList'); container.innerHTML = '';
  const sc = $('subjectClassSelect'); const ss = $('studentClassSelect');
  if (sc) { sc.innerHTML = '<option value="">Select class</option>'; }
  if (ss) { ss.innerHTML = '<option value="">Select class</option>'; }
  arr.forEach(c => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `<div><strong>${c.name}</strong> <div class="muted">id:${c.id}${c.form_master_id? ' • form master id:'+c.form_master_id:''}</div></div>
      <div>
        <button class="icon-btn" data-edit="${c.id}" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="icon-btn" data-assign="${c.id}" title="Assign form master"><i class="fas fa-user-tie"></i></button>
        <button class="icon-btn" data-del="${c.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </div>`;
    container.appendChild(div);
    if (sc) sc.add(new Option(c.name, c.id));
    if (ss) ss.add(new Option(c.name, c.id));
  });

  // handlers
  container.querySelectorAll('button[data-edit]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-edit');
    const newName = prompt('Edit class name (exact):');
    if (!newName) return;
    const { error } = await supabase.from('classes').update({ name: newName }).eq('id', id);
    if (error) alert('Error updating class: ' + error.message);
    await renderAll();
  }));
  container.querySelectorAll('button[data-assign]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-assign');
    // show teacher list to choose
    const teachers = await fetchTeachers();
    if (!teachers.length) return alert('Add teachers first.');
    const choice = prompt('Enter teacher id to be form master:\n' + teachers.map(t=>`${t.id} — ${t.username} — ${t.name}`).join('\n'));
    if (!choice) return;
    const t = teachers.find(x => x.id.toString() === choice.toString());
    if (!t) return alert('teacher id not found');
    const { error } = await supabase.from('classes').update({ form_master_id: t.id }).eq('id', id);
    if (error) alert('Error assigning form master');
    else { await insertNotification(`Assigned ${t.name} as form master for class id ${id}`); await renderAll(); }
  }));
  container.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-del');
    if (!confirm('Delete class and all related students & subjects?')) return;
    await deleteClass(id);
    await renderAll();
  }));
}

async function renderSubjects() {
  // we will show subjects grouped by class
  const classes = await fetchClasses();
  const subsContainer = $('subjectList'); subsContainer.innerHTML = '';
  for (const c of classes) {
    const { data: subjects } = await supabase.from('subjects').select('*').eq('class_id', c.id).order('id');
    const block = document.createElement('div'); block.style.padding='8px 4px'; block.style.borderBottom='1px solid #eef3f7';
    const header = document.createElement('div'); header.innerHTML = `<strong>${c.name}</strong> — Subjects: ${subjects.length}`;
    block.appendChild(header);
    if (subjects.length) {
      subjects.forEach(s => {
        const li = document.createElement('div'); li.className='list-item';
        li.innerHTML = `<div>${s.name} <span class="muted">(${s.id})</span><div class="muted">teacher_id: ${s.teacher_id || '—'}</div></div>
          <div>
            <button class="icon-btn" data-assign-sub="${s.id}" data-class="${c.id}" title="Assign teacher"><i class="fas fa-user"></i></button>
            <button class="icon-btn" data-del-sub="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
          </div>`;
        block.appendChild(li);
      });
    }
    subsContainer.appendChild(block);
  }

  // handlers
  subsContainer.querySelectorAll('button[data-assign-sub]').forEach(b => b.addEventListener('click', async e=>{
    const subId = e.currentTarget.getAttribute('data-assign-sub');
    const teachers = await fetchTeachers();
    if (!teachers.length) return alert('No teachers yet');
    const choice = prompt('Enter teacher id to assign:\n' + teachers.map(t=>`${t.id} — ${t.username} — ${t.name}`).join('\n'));
    if (!choice) return;
    const t = teachers.find(x=>x.id.toString()===choice.toString());
    if (!t) return alert('teacher id not found');
    const { error } = await supabase.from('subjects').update({ teacher_id: t.id }).eq('id', subId);
    if (error) alert('Error assigning teacher: ' + error.message);
    else { await insertNotification(`Assigned ${t.name} to subject ${subId}`); renderSubjects(); }
  }));
  subsContainer.querySelectorAll('button[data-del-sub]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-del-sub');
    if (!confirm('Delete subject?')) return;
    await deleteSubject(id);
    renderSubjects();
  }));
}

async function renderStudents() {
  const classes = await fetchClasses();
  const container = $('studentList'); container.innerHTML = '';
  for (const c of classes) {
    const { data: studs } = await supabase.from('students').select('*').eq('class_id', c.id).order('id');
    const block = document.createElement('div'); block.style.padding='8px 4px'; block.style.borderBottom='1px solid #eef3f7';
    const header = document.createElement('div'); header.innerHTML = `<strong>${c.name}</strong> — Students: ${studs.length}`;
    block.appendChild(header);
    if (studs.length) {
      studs.forEach(s => {
        const li = document.createElement('div'); li.className='list-item';
        li.innerHTML = `<div>${s.name} <span class="muted">(${s.username})</span></div>
          <div>
            <button class="icon-btn" data-forgot="${s.username}" title="Forgot password"><i class="fas fa-key"></i></button>
            <button class="icon-btn" data-edit-stud="${s.id}" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="icon-btn" data-del-stud="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
          </div>`;
        block.appendChild(li);
      });
    }
    container.appendChild(block);
  }

  // handlers
  container.querySelectorAll('button[data-forgot]').forEach(b => b.addEventListener('click', async e=>{
    const username = e.currentTarget.getAttribute('data-forgot');
    await onForgotPassword(username);
  }));
  container.querySelectorAll('button[data-edit-stud]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-edit-stud');
    const newName = prompt('Edit student name:');
    if (!newName) return;
    const { error } = await supabase.from('students').update({ name: newName }).eq('id', id);
    if (error) alert('Error');
    else renderStudents();
  }));
  container.querySelectorAll('button[data-del-stud]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-del-stud');
    if (!confirm('Delete student?')) return;
    await deleteStudent(id);
    renderStudents();
  }));
}

// Notifications
async function renderNotifications() {
  const items = await fetchNotifications();
  const list = $('notifList'); list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<div class="notif-item">No notifications</div>'; return; }
  items.forEach(n => {
    const el = document.createElement('div'); el.className='notif-item';
    el.innerHTML = `<div><div style="font-size:14px">${n.message}</div><div class="muted">${new Date(n.created_at).toLocaleString()}</div></div>
      <div><button class="icon-btn" data-delnotif="${n.id}"><i class="fas fa-trash"></i></button></div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('button[data-delnotif]').forEach(b => b.addEventListener('click', async e=>{
    const id = e.currentTarget.getAttribute('data-delnotif');
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.error(error);
    renderNotifications();
  }));
}

// update counts
async function updateCounts() {
  const t = await fetchTeachers();
  const s = await fetchStudents();
  const subs = await fetchSubjects();
  $('teacherCount').textContent = t.length;
  $('studentCount').textContent = s.length;
  // incomplete: subjects with teacher assigned but teacher_id not null and maybe flagged elsewhere
  const inc = subs.filter(x => x.teacher_id !== null).length; // placeholder measure
  $('incompleteCount').textContent = inc;
}

// ----------------- Event handlers for add buttons (bulk) -----------------
async function onAddTeachers() {
  const v = $('teacherInput').value.trim();
  if (!v) return alert('Enter teacher names.');
  const names = v.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await insertTeachers(names);
    await renderTeachers();
    $('teacherInput').value = '';
    await insertNotification(`Added teachers: ${names.join(', ')}`);
    await updateCounts();
  } catch(err) {
    console.error(err); alert('Failed adding teachers: ' + err.message);
  }
}

async function onAddClasses() {
  const v = $('classInput').value.trim();
  if (!v) return alert('Enter class names.');
  const names = v.split(',').map(s => s.trim()).filter(Boolean);
  const fm_select = $('formMasterSelect');
  const fm_id = fm_select && fm_select.value ? Number(fm_select.value) : null;
  try {
    await insertClasses(names, fm_id);
    $('classInput').value = '';
    await renderClasses();
    await insertNotification(`Added classes: ${names.join(', ')}`);
  } catch(err) {
    console.error(err); alert('Failed adding classes: ' + err.message);
  }
}

async function onAddSubjects() {
  const classId = Number($('subjectClassSelect').value);
  if (!classId) return alert('Choose a class first.');
  const v = $('subjectInput').value.trim();
  if (!v) return alert('Enter subject names.');
  const names = v.split(',').map(s => s.trim()).filter(Boolean);
  const teacherId = $('subjectTeacherSelect').value ? Number($('subjectTeacherSelect').value) : null;
  try {
    await insertSubjects(names, classId, teacherId);
    $('subjectInput').value = '';
    await renderSubjects();
    await insertNotification(`Added subjects (${names.join(', ')}) to class id ${classId}`);
  } catch(err) {
    console.error(err); alert('Failed adding subjects: ' + err.message);
  }
}

async function onAddStudents() {
  const classId = Number($('studentClassSelect').value);
  if (!classId) return alert('Choose a class first.');
  const v = $('studentInput').value.trim();
  if (!v) return alert('Enter student names.');
  const names = v.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await insertStudents(names, classId);
    $('studentInput').value = '';
    await renderStudents();
    await insertNotification(`Added ${names.length} students to class id ${classId}`);
    await updateCounts();
  } catch(err) {
    console.error(err); alert('Failed adding students: ' + err.message);
  }
}

// Forgot password: find username in teachers/students/subjects and notify managers
async function onForgotPassword(username) {
  // search teachers
  const { data: tdata } = await supabase.from('teachers').select('*').or(`username.eq.${username}`);
  if (tdata && tdata.length) {
    const t = tdata[0];
    await insertNotification(`Forgot password: Teacher ${t.name} (${t.username}) — password: ${t.password}`);
    alert('Managers notified (simulation).');
    return;
  }
  const { data: sdata } = await supabase.from('students').select('*').or(`username.eq.${username}`);
  if (sdata && sdata.length) {
    const s = sdata[0];
    await insertNotification(`Forgot password: Student ${s.name} (${s.username}) — password: ${s.password}`);
    alert('Managers notified (simulation).');
    return;
  }
  // subjects usernames not stored by username column; subjects have id only — skip subject usernames
  alert('Username not found in teachers or students.');
}

// ----------------- Init -----------------
async function boot() {
  setupUI();
  // initial load
  await renderAll();

  // populate subject teacher select and student/class selects when data changes
  setInterval(async ()=>{ // lightweight polling to keep UI fresh for multi-manager edits
    await renderAll();
  }, 8000);
}

boot();
