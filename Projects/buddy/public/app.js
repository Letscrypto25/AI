const state = {
  health: null,
  notes: [],
  projects: [],
  diary: null,
  diaryDate: new Date().toISOString().slice(0, 10),
  diaryLinkedNotes: [],
  activeNoteId: null,
  activeProjectId: null,
  chat: [],
  tab: 'diary',
  token: localStorage.getItem('buddyToken') || ''
};

const els = {
  statusStrip: document.querySelector('#statusStrip'),
  saveNoteButton: document.querySelector('#saveNoteButton'),
  refreshButton: document.querySelector('#refreshButton'),
  captureText: document.querySelector('#captureText'),
  sourceInput: document.querySelector('#sourceInput'),
  projectInput: document.querySelector('#projectInput'),
  categoryInput: document.querySelector('#categoryInput'),
  searchInput: document.querySelector('#searchInput'),
  noteList: document.querySelector('#noteList'),
  updateNoteButton: document.querySelector('#updateNoteButton'),
  deleteNoteButton: document.querySelector('#deleteNoteButton'),
  titleEditor: document.querySelector('#titleEditor'),
  rawEditor: document.querySelector('#rawEditor'),
  summaryEditor: document.querySelector('#summaryEditor'),
  categoryEditor: document.querySelector('#categoryEditor'),
  tagsEditor: document.querySelector('#tagsEditor'),
  projectEditor: document.querySelector('#projectEditor'),
  tabButtons: document.querySelectorAll('.tab-button'),
  diaryTab: document.querySelector('#diaryTab'),
  diaryDateInput: document.querySelector('#diaryDateInput'),
  diaryDisplayDate: document.querySelector('#diaryDisplayDate'),
  diaryQuote: document.querySelector('#diaryQuote'),
  diaryTitleInput: document.querySelector('#diaryTitleInput'),
  diaryRawInput: document.querySelector('#diaryRawInput'),
  diarySummaryInput: document.querySelector('#diarySummaryInput'),
  diaryCategoriesInput: document.querySelector('#diaryCategoriesInput'),
  diaryThoughtsInput: document.querySelector('#diaryThoughtsInput'),
  diaryDecisionsInput: document.querySelector('#diaryDecisionsInput'),
  diaryTasksInput: document.querySelector('#diaryTasksInput'),
  diaryLinkedNotes: document.querySelector('#diaryLinkedNotes'),
  previousDiaryButton: document.querySelector('#previousDiaryButton'),
  todayDiaryButton: document.querySelector('#todayDiaryButton'),
  nextDiaryButton: document.querySelector('#nextDiaryButton'),
  saveDiaryButton: document.querySelector('#saveDiaryButton'),
  organizeDiaryButton: document.querySelector('#organizeDiaryButton'),
  chatTab: document.querySelector('#chatTab'),
  projectsTab: document.querySelector('#projectsTab'),
  terminalTab: document.querySelector('#terminalTab'),
  chatLog: document.querySelector('#chatLog'),
  chatInput: document.querySelector('#chatInput'),
  sendChatButton: document.querySelector('#sendChatButton'),
  projectIdeaInput: document.querySelector('#projectIdeaInput'),
  generateProjectButton: document.querySelector('#generateProjectButton'),
  projectList: document.querySelector('#projectList'),
  projectFiles: document.querySelector('#projectFiles'),
  tokenInput: document.querySelector('#tokenInput'),
  terminalProjectSelect: document.querySelector('#terminalProjectSelect'),
  terminalInput: document.querySelector('#terminalInput'),
  runCommandButton: document.querySelector('#runCommandButton'),
  terminalOutput: document.querySelector('#terminalOutput')
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(state.token ? { 'x-buddy-token': state.token } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.reason || `Request failed: ${response.status}`);
  }
  return data;
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || 'Working';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function renderStatus() {
  const health = state.health || {};
  const pills = [
    health.supabase
      ? 'Supabase: connected by vars'
      : `Supabase: missing ${health.supabase_url_set ? '' : 'SUPABASE_URL '}${health.supabase_key_set ? '' : 'SUPABASE_SERVICE_ROLE_KEY'}`.trim(),
    `Groq: ${health.groq ? health.model : 'not set'}`,
    `DB pooler: ${health.database_url_set ? 'DATABASE_URL set' : 'DATABASE_URL missing'}`,
    `Terminal: ${health.terminal ? 'enabled' : 'off'}`,
    `Token: ${health.token_required ? 'required' : 'not set'}`,
    `Env file: ${health.env_file_loaded ? 'loaded' : 'Railway vars/local env'}`
  ];
  els.statusStrip.innerHTML = pills.map((pill) => `<span class="status-pill">${escapeHtml(pill)}</span>`).join('');
}

function renderNotes() {
  const active = state.activeNoteId;
  if (!state.notes.length) {
    els.noteList.innerHTML = '<div class="note-item"><strong>No notes yet</strong><span>Paste something into Capture and save it.</span></div>';
    return;
  }
  els.noteList.innerHTML = state.notes.map((note) => {
    const classes = note.id === active ? 'note-item active' : 'note-item';
    const date = note.created_at ? new Date(note.created_at).toLocaleString() : '';
    return `
      <div class="${classes}" data-note-id="${escapeHtml(note.id)}">
        <strong>${escapeHtml(note.clean_title || 'Untitled note')}</strong>
        <span>${escapeHtml(note.category || 'Unsorted')} ${date ? `- ${escapeHtml(date)}` : ''}</span>
        <span>${escapeHtml(note.summary || note.raw_text || '').slice(0, 150)}</span>
      </div>
    `;
  }).join('');
}

function activeNote() {
  return state.notes.find((note) => note.id === state.activeNoteId) || null;
}

function renderEditor() {
  const note = activeNote();
  els.titleEditor.value = note?.clean_title || '';
  els.rawEditor.value = note?.raw_text || '';
  els.summaryEditor.value = note?.summary || '';
  els.categoryEditor.value = note?.category || '';
  els.tagsEditor.value = (note?.tags || []).join(', ');
  els.projectEditor.value = note?.project || '';
}

function renderChat() {
  if (!state.chat.length) {
    els.chatLog.innerHTML = '<div class="chat-message"><b>Buddy</b>Ask me about your saved notes, decisions, projects, or repeated ideas.</div>';
    return;
  }
  els.chatLog.innerHTML = state.chat.map((message) => `
    <div class="chat-message">
      <b>${escapeHtml(message.role)}</b>
      ${escapeHtml(message.text)}
    </div>
  `).join('');
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function renderTabs() {
  els.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.tab);
  });
  els.diaryTab.classList.toggle('active', state.tab === 'diary');
  els.chatTab.classList.toggle('active', state.tab === 'chat');
  els.projectsTab.classList.toggle('active', state.tab === 'projects');
  els.terminalTab.classList.toggle('active', state.tab === 'terminal');
}

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function renderDiary() {
  const page = state.diary || {};
  els.diaryDateInput.value = state.diaryDate;
  els.diaryDisplayDate.textContent = formatDateLabel(state.diaryDate);
  els.diaryQuote.textContent = page.quote ? `"${page.quote}"` : '';
  els.diaryTitleInput.value = page.title || `Diary - ${state.diaryDate}`;
  els.diaryRawInput.value = page.raw_text || '';
  els.diarySummaryInput.value = page.ai_summary || '';
  els.diaryCategoriesInput.value = (page.ai_categories || []).join(', ');
  els.diaryThoughtsInput.value = (page.important_thoughts || []).join('\n');
  els.diaryDecisionsInput.value = (page.decisions || []).join('\n');
  els.diaryTasksInput.value = (page.tasks || []).join('\n');
  if (!state.diaryLinkedNotes.length) {
    els.diaryLinkedNotes.innerHTML = '<div class="linked-note-empty">No saved notes on this date yet.</div>';
    return;
  }
  els.diaryLinkedNotes.innerHTML = state.diaryLinkedNotes.map((note) => `
    <button class="linked-note" data-note-id="${escapeHtml(note.id)}">
      <strong>${escapeHtml(note.clean_title || 'Untitled note')}</strong>
      <span>${escapeHtml(note.category || 'Unsorted')}</span>
    </button>
  `).join('');
}

function renderProjects() {
  els.terminalProjectSelect.innerHTML = '<option value="">Buddy workspace</option>' + state.projects.map((project) => (
    `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`
  )).join('');
  els.terminalProjectSelect.value = state.activeProjectId || '';
  if (!state.projects.length) {
    els.projectList.innerHTML = '<div class="project-item"><strong>No projects yet</strong><span>Describe a small project and generate it.</span></div>';
    els.projectFiles.textContent = '';
    return;
  }
  els.projectList.innerHTML = state.projects.map((project) => `
    <div class="project-item" data-project-id="${escapeHtml(project.id)}">
      <strong>${escapeHtml(project.name)}</strong>
      <span>${escapeHtml(project.summary || project.idea || '')}</span>
    </div>
  `).join('');
  const project = state.projects.find((item) => item.id === state.activeProjectId) || state.projects[0];
  if (project && !state.activeProjectId) state.activeProjectId = project.id;
  renderProjectFiles(project);
}

function renderProjectFiles(project) {
  if (!project) {
    els.projectFiles.textContent = '';
    return;
  }
  const files = Array.isArray(project.files) ? project.files : [];
  els.projectFiles.textContent = files.map((file) => (
    `# ${file.path}\n${file.content || ''}`
  )).join('\n\n');
}

function renderAll() {
  renderStatus();
  renderNotes();
  renderEditor();
  renderDiary();
  renderChat();
  renderTabs();
  renderProjects();
}

async function loadHealth() {
  state.health = await api('/api/health');
}

async function loadNotes() {
  const params = new URLSearchParams();
  const search = els.searchInput.value.trim();
  if (search) params.set('search', search);
  const data = await api(`/api/notes${params.toString() ? `?${params}` : ''}`);
  state.notes = data.notes || [];
  if (state.activeNoteId && !state.notes.some((note) => note.id === state.activeNoteId)) {
    state.activeNoteId = null;
  }
}

async function loadProjects() {
  const data = await api('/api/projects');
  state.projects = data.projects || [];
}

async function loadDiary(date = state.diaryDate) {
  state.diaryDate = date;
  const data = await api(`/api/diary?date=${encodeURIComponent(state.diaryDate)}`);
  state.diary = data.page || null;
  state.diaryLinkedNotes = data.linked_notes || [];
}

async function reload() {
  await Promise.all([loadHealth(), loadNotes(), loadProjects(), loadDiary()]);
  renderAll();
}

async function saveNote() {
  const text = els.captureText.value.trim();
  if (!text) return;
  setBusy(els.saveNoteButton, true, 'Saving');
  try {
    const data = await api('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        raw_text: text,
        source: els.sourceInput.value.trim(),
        project: els.projectInput.value.trim(),
        category: els.categoryInput.value
      })
    });
    state.activeNoteId = data.note.id;
    els.captureText.value = '';
    await loadNotes();
    renderAll();
  } catch (error) {
    alert(error.message);
  } finally {
    setBusy(els.saveNoteButton, false);
  }
}

async function updateNote() {
  const note = activeNote();
  if (!note) return;
  setBusy(els.updateNoteButton, true, 'Updating');
  try {
    const tags = els.tagsEditor.value.split(',').map((tag) => tag.trim()).filter(Boolean);
    const data = await api(`/api/notes/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        raw_text: els.rawEditor.value,
        clean_title: els.titleEditor.value,
        summary: els.summaryEditor.value,
        category: els.categoryEditor.value,
        tags,
        project: els.projectEditor.value,
        source: note.source || '',
        people: note.people || [],
        status: note.status || 'active',
        ai_confidence: note.ai_confidence || 0
      })
    });
    state.notes = state.notes.map((item) => item.id === note.id ? data.note : item);
    renderAll();
  } catch (error) {
    alert(error.message);
  } finally {
    setBusy(els.updateNoteButton, false);
  }
}

async function deleteNote() {
  const note = activeNote();
  if (!note) return;
  if (!confirm('Delete this Buddy note?')) return;
  try {
    await api(`/api/notes/${note.id}`, { method: 'DELETE' });
    state.activeNoteId = null;
    await loadNotes();
    renderAll();
  } catch (error) {
    alert(error.message);
  }
}

async function sendChat() {
  const message = els.chatInput.value.trim();
  if (!message) return;
  state.chat.push({ role: 'You', text: message });
  els.chatInput.value = '';
  renderChat();
  setBusy(els.sendChatButton, true, 'Asking');
  try {
    const data = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    state.chat.push({ role: 'Buddy', text: data.answer || '' });
  } catch (error) {
    state.chat.push({ role: 'Buddy', text: error.message });
  } finally {
    setBusy(els.sendChatButton, false);
    renderChat();
  }
}

async function saveDiary() {
  const categories = els.diaryCategoriesInput.value.split(',').map((item) => item.trim()).filter(Boolean);
  const importantThoughts = els.diaryThoughtsInput.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const decisions = els.diaryDecisionsInput.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const tasks = els.diaryTasksInput.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  setBusy(els.saveDiaryButton, true, 'Saving');
  try {
    const data = await api('/api/diary', {
      method: 'PUT',
      body: JSON.stringify({
        diary_date: state.diaryDate,
        title: els.diaryTitleInput.value,
        quote: state.diary?.quote || '',
        raw_text: els.diaryRawInput.value,
        ai_summary: els.diarySummaryInput.value,
        ai_categories: categories,
        important_thoughts: importantThoughts,
        decisions,
        tasks
      })
    });
    state.diary = data.page || null;
    state.diaryLinkedNotes = data.linked_notes || [];
    renderDiary();
  } catch (error) {
    alert(error.message);
  } finally {
    setBusy(els.saveDiaryButton, false);
  }
}

async function organizeDiary() {
  await saveDiary();
  setBusy(els.organizeDiaryButton, true, 'Organizing');
  try {
    const data = await api('/api/diary/organize', {
      method: 'POST',
      body: JSON.stringify({ diary_date: state.diaryDate })
    });
    state.diary = data.page || null;
    state.diaryLinkedNotes = data.linked_notes || [];
    renderDiary();
  } catch (error) {
    alert(error.message);
  } finally {
    setBusy(els.organizeDiaryButton, false);
  }
}

async function goDiary(date) {
  await loadDiary(date);
  renderDiary();
}

async function generateProject() {
  const idea = els.projectIdeaInput.value.trim();
  if (!idea) return;
  setBusy(els.generateProjectButton, true, 'Generating');
  try {
    const selected = state.activeNoteId ? [state.activeNoteId] : [];
    const data = await api('/api/projects/generate', {
      method: 'POST',
      body: JSON.stringify({ idea, note_ids: selected })
    });
    state.activeProjectId = data.project.id;
    els.projectIdeaInput.value = '';
    await loadProjects();
    renderAll();
  } catch (error) {
    alert(error.message);
  } finally {
    setBusy(els.generateProjectButton, false);
  }
}

async function runCommand() {
  const command = els.terminalInput.value.trim();
  if (!command) return;
  setBusy(els.runCommandButton, true, 'Running');
  els.terminalOutput.textContent = `> ${command}\n`;
  try {
    const data = await api('/api/terminal', {
      method: 'POST',
      body: JSON.stringify({
        command,
        project_id: els.terminalProjectSelect.value || ''
      })
    });
    els.terminalOutput.textContent += [
      data.stdout || '',
      data.stderr ? `\n[stderr]\n${data.stderr}` : '',
      `\n[exit ${data.exit_code ?? 0}]`
    ].join('');
  } catch (error) {
    els.terminalOutput.textContent += error.message;
  } finally {
    setBusy(els.runCommandButton, false);
  }
}

els.saveNoteButton.addEventListener('click', saveNote);
els.refreshButton.addEventListener('click', reload);
els.searchInput.addEventListener('input', () => {
  clearTimeout(els.searchInput.searchTimer);
  els.searchInput.searchTimer = setTimeout(async () => {
    await loadNotes();
    renderAll();
  }, 250);
});
els.noteList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-note-id]');
  if (!item) return;
  state.activeNoteId = item.dataset.noteId;
  renderAll();
});
els.updateNoteButton.addEventListener('click', updateNote);
els.deleteNoteButton.addEventListener('click', deleteNote);
els.tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.tab = button.dataset.tab;
    renderTabs();
  });
});
els.diaryDateInput.addEventListener('change', () => goDiary(els.diaryDateInput.value));
els.previousDiaryButton.addEventListener('click', () => goDiary(shiftDate(state.diaryDate, -1)));
els.todayDiaryButton.addEventListener('click', () => goDiary(new Date().toISOString().slice(0, 10)));
els.nextDiaryButton.addEventListener('click', () => goDiary(shiftDate(state.diaryDate, 1)));
els.saveDiaryButton.addEventListener('click', saveDiary);
els.organizeDiaryButton.addEventListener('click', organizeDiary);
els.diaryLinkedNotes.addEventListener('click', (event) => {
  const item = event.target.closest('[data-note-id]');
  if (!item) return;
  state.activeNoteId = item.dataset.noteId;
  renderAll();
});
els.sendChatButton.addEventListener('click', sendChat);
els.chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendChat();
});
els.generateProjectButton.addEventListener('click', generateProject);
els.projectList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-project-id]');
  if (!item) return;
  state.activeProjectId = item.dataset.projectId;
  const project = state.projects.find((entry) => entry.id === state.activeProjectId);
  renderProjects();
  renderProjectFiles(project);
});
els.tokenInput.value = state.token;
els.tokenInput.addEventListener('input', () => {
  state.token = els.tokenInput.value.trim();
  localStorage.setItem('buddyToken', state.token);
});
els.terminalProjectSelect.addEventListener('change', () => {
  state.activeProjectId = els.terminalProjectSelect.value;
});
els.runCommandButton.addEventListener('click', runCommand);
els.terminalInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') runCommand();
});

reload().catch((error) => {
  els.statusStrip.innerHTML = `<span class="status-pill">${escapeHtml(error.message)}</span>`;
});
