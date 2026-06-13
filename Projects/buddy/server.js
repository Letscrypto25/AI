import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  try {
    const text = await readFile(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) continue;
      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (!key || process.env[key] !== undefined) continue;
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
    return true;
  } catch {
    return false;
  }
}

const ENV_FILE_LOADED = await loadEnvFile();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'buddy.json');
const WORKSPACE_DIR = path.join(__dirname, 'workspace');

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.BUDDY_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ACCESS_TOKEN = process.env.BUDDY_ACCESS_TOKEN || '';
const TERMINAL_ENABLED = process.env.BUDDY_ALLOW_TERMINAL === 'true';
const COMMAND_TIMEOUT_MS = Number(process.env.BUDDY_COMMAND_TIMEOUT_MS || 20000);

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const TABLES = {
  notes: 'buddy_notes',
  projects: 'buddy_projects',
  commands: 'buddy_command_logs',
  diaryPages: 'buddy_diary_pages'
};

const DAILY_QUOTES = [
  'Write it down. The pattern will show itself later.',
  'Small notes become maps when you keep them.',
  'Today only needs one honest page.',
  'Messy thoughts are still useful material.',
  'Memory gets stronger when it has a place to land.',
  'Make the day visible, then make it simple.',
  'A clear page can hold a chaotic mind.',
  'Keep the raw thought. Shape it after.',
  'The next step is hiding inside the notes.',
  'Order comes after capture.'
];

function nowIso() {
  return new Date().toISOString();
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function normalizeDiaryDate(value) {
  return isDateString(value) ? value : todayDateString();
}

function dailyQuote(dateString) {
  const score = [...String(dateString || todayDateString())]
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return DAILY_QUOTES[score % DAILY_QUOTES.length];
}

function hasSupabase() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function hasGroq() {
  return Boolean(GROQ_API_KEY);
}

function sendJson(res, status, data) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(data));
}

function sendError(res, status, message, extra = {}) {
  sendJson(res, status, { error: message, ...extra });
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_500_000) {
      throw new Error('Request body is too large.');
    }
  }
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function authOk(req) {
  if (!ACCESS_TOKEN) return true;
  const headerToken = req.headers['x-buddy-token'];
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return headerToken === ACCESS_TOKEN || bearer === ACCESS_TOKEN;
}

function requireAuth(req, res) {
  if (authOk(req)) return true;
  sendError(res, 401, 'Buddy token required.');
  return false;
}

async function ensureLocalStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await stat(DATA_FILE);
  } catch {
    await writeFile(DATA_FILE, JSON.stringify({ notes: [], projects: [], commands: [], diary_pages: [] }, null, 2));
  }
}

async function readLocalStore() {
  await ensureLocalStore();
  const text = await readFile(DATA_FILE, 'utf8');
  const data = JSON.parse(text);
  return {
    notes: Array.isArray(data.notes) ? data.notes : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    commands: Array.isArray(data.commands) ? data.commands : [],
    diary_pages: Array.isArray(data.diary_pages) ? data.diary_pages : []
  };
}

async function writeLocalStore(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function supabaseRequest(table, query = '', options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  if (!text) return null;
  return JSON.parse(text);
}

function textIncludes(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

function filterNotes(notes, { search = '', category = '' } = {}) {
  const searchTerm = search.trim().toLowerCase();
  return notes.filter((note) => {
    const categoryOk = !category || note.category === category;
    if (!categoryOk) return false;
    if (!searchTerm) return true;
    const fields = [
      note.raw_text,
      note.clean_title,
      note.summary,
      note.category,
      note.project,
      ...(note.tags || []),
      ...(note.people || [])
    ];
    return fields.some((field) => textIncludes(field, searchTerm));
  });
}

async function listNotes(filters = {}) {
  if (hasSupabase()) {
    try {
      const rows = await supabaseRequest(TABLES.notes, '?select=*&order=created_at.desc');
      return filterNotes(rows || [], filters);
    } catch (error) {
      console.warn(error.message);
    }
  }
  const data = await readLocalStore();
  return filterNotes(data.notes.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), filters);
}

async function saveNote(note) {
  if (hasSupabase()) {
    const rows = await supabaseRequest(TABLES.notes, '', {
      method: 'POST',
      body: JSON.stringify(note)
    });
    return rows?.[0] || note;
  }
  const data = await readLocalStore();
  const stored = { ...note, id: randomUUID() };
  data.notes.unshift(stored);
  await writeLocalStore(data);
  return stored;
}

async function updateNote(id, patch) {
  if (hasSupabase()) {
    const rows = await supabaseRequest(TABLES.notes, `?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    return rows?.[0] || null;
  }
  const data = await readLocalStore();
  const index = data.notes.findIndex((note) => note.id === id);
  if (index === -1) return null;
  data.notes[index] = { ...data.notes[index], ...patch, updated_at: nowIso() };
  await writeLocalStore(data);
  return data.notes[index];
}

async function deleteNote(id) {
  if (hasSupabase()) {
    await supabaseRequest(TABLES.notes, `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }
  const data = await readLocalStore();
  const before = data.notes.length;
  data.notes = data.notes.filter((note) => note.id !== id);
  await writeLocalStore(data);
  return data.notes.length !== before;
}

function noteDate(note) {
  return String(note.created_at || '').slice(0, 10);
}

async function notesForDate(dateString) {
  const notes = await listNotes({});
  return notes.filter((note) => noteDate(note) === dateString);
}

function defaultDiaryPage(dateString) {
  return {
    diary_date: dateString,
    quote: dailyQuote(dateString),
    title: `Diary - ${dateString}`,
    raw_text: '',
    ai_summary: '',
    ai_categories: [],
    important_thoughts: [],
    decisions: [],
    tasks: [],
    linked_note_ids: [],
    created_at: nowIso(),
    updated_at: nowIso()
  };
}

function normalizeDiaryPage(page, dateString) {
  return {
    ...defaultDiaryPage(dateString),
    ...page,
    diary_date: page?.diary_date || dateString,
    quote: page?.quote || dailyQuote(dateString),
    ai_categories: Array.isArray(page?.ai_categories) ? page.ai_categories : [],
    important_thoughts: Array.isArray(page?.important_thoughts) ? page.important_thoughts : [],
    decisions: Array.isArray(page?.decisions) ? page.decisions : [],
    tasks: Array.isArray(page?.tasks) ? page.tasks : [],
    linked_note_ids: Array.isArray(page?.linked_note_ids) ? page.linked_note_ids : []
  };
}

async function listDiaryPages(limit = 30) {
  if (hasSupabase()) {
    try {
      return (await supabaseRequest(
        TABLES.diaryPages,
        `?select=*&order=diary_date.desc&limit=${encodeURIComponent(limit)}`
      )) || [];
    } catch (error) {
      console.warn(error.message);
    }
  }
  const data = await readLocalStore();
  return data.diary_pages
    .sort((a, b) => String(b.diary_date).localeCompare(String(a.diary_date)))
    .slice(0, limit);
}

async function getDiaryPage(dateValue) {
  const dateString = normalizeDiaryDate(dateValue);
  let page = null;
  if (hasSupabase()) {
    try {
      const rows = await supabaseRequest(
        TABLES.diaryPages,
        `?diary_date=eq.${encodeURIComponent(dateString)}&select=*&limit=1`
      );
      page = rows?.[0] || null;
    } catch (error) {
      console.warn(error.message);
    }
  } else {
    const data = await readLocalStore();
    page = data.diary_pages.find((entry) => entry.diary_date === dateString) || null;
  }
  const linkedNotes = await notesForDate(dateString);
  const normalized = normalizeDiaryPage(page, dateString);
  normalized.linked_note_ids = linkedNotes.map((note) => note.id).filter(Boolean);
  return { page: normalized, linked_notes: linkedNotes };
}

async function saveDiaryPage(dateValue, patch) {
  const dateString = normalizeDiaryDate(dateValue);
  const existing = (await getDiaryPage(dateString)).page;
  const page = normalizeDiaryPage({
    ...existing,
    ...patch,
    diary_date: dateString,
    quote: patch.quote || existing.quote || dailyQuote(dateString),
    updated_at: nowIso()
  }, dateString);

  if (hasSupabase()) {
    const rows = await supabaseRequest(TABLES.diaryPages, '?on_conflict=diary_date', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(page)
    });
    return (await getDiaryPage(dateString)).linked_notes.length
      ? { page: rows?.[0] || page, linked_notes: (await getDiaryPage(dateString)).linked_notes }
      : { page: rows?.[0] || page, linked_notes: [] };
  }

  const data = await readLocalStore();
  const index = data.diary_pages.findIndex((entry) => entry.diary_date === dateString);
  if (index === -1) data.diary_pages.unshift({ ...page, id: randomUUID(), created_at: nowIso() });
  else data.diary_pages[index] = { ...data.diary_pages[index], ...page };
  await writeLocalStore(data);
  return getDiaryPage(dateString);
}

async function organizeDiaryPage(dateValue) {
  const dateString = normalizeDiaryDate(dateValue);
  const { page, linked_notes: linkedNotes } = await getDiaryPage(dateString);
  const text = [
    page.raw_text,
    ...linkedNotes.map((note) => `${note.clean_title}: ${note.raw_text || note.summary}`)
  ].join('\n\n').trim();

  if (!text) {
    return saveDiaryPage(dateString, {
      ...page,
      ai_summary: '',
      ai_categories: [],
      important_thoughts: [],
      decisions: [],
      tasks: []
    });
  }

  if (!hasGroq()) {
    return saveDiaryPage(dateString, {
      ...page,
      ai_summary: text.replace(/\s+/g, ' ').slice(0, 500),
      ai_categories: [...new Set(linkedNotes.map((note) => note.category).filter(Boolean))].slice(0, 12),
      important_thoughts: linkedNotes.slice(0, 6).map((note) => note.clean_title || note.summary || note.raw_text).filter(Boolean),
      decisions: [],
      tasks: linkedNotes.filter((note) => note.category === 'To-do items').map((note) => note.clean_title).filter(Boolean)
    });
  }

  const result = await groqJson([
    {
      role: 'system',
      content: [
        'You organize one private diary day for Buddy.',
        'Return JSON only with ai_summary, ai_categories, important_thoughts, decisions, tasks.',
        'Keep the original raw text unchanged. Be practical and concise.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        diary_date: dateString,
        raw_diary_text: page.raw_text,
        linked_notes: linkedNotes.map((note) => ({
          title: note.clean_title,
          category: note.category,
          summary: note.summary,
          raw_text: note.raw_text
        }))
      })
    }
  ]);

  return saveDiaryPage(dateString, {
    ...page,
    ai_summary: String(result.ai_summary || page.ai_summary || '').slice(0, 4000),
    ai_categories: Array.isArray(result.ai_categories) ? result.ai_categories.map(String).slice(0, 24) : page.ai_categories,
    important_thoughts: Array.isArray(result.important_thoughts) ? result.important_thoughts.map(String).slice(0, 40) : page.important_thoughts,
    decisions: Array.isArray(result.decisions) ? result.decisions.map(String).slice(0, 40) : page.decisions,
    tasks: Array.isArray(result.tasks) ? result.tasks.map(String).slice(0, 40) : page.tasks
  });
}

async function listProjects() {
  if (hasSupabase()) {
    try {
      return (await supabaseRequest(TABLES.projects, '?select=*&order=created_at.desc')) || [];
    } catch (error) {
      console.warn(error.message);
    }
  }
  const data = await readLocalStore();
  return data.projects.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

async function saveProject(project) {
  if (hasSupabase()) {
    const rows = await supabaseRequest(TABLES.projects, '', {
      method: 'POST',
      body: JSON.stringify(project)
    });
    return rows?.[0] || project;
  }
  const data = await readLocalStore();
  const stored = { ...project, id: randomUUID() };
  data.projects.unshift(stored);
  await writeLocalStore(data);
  return stored;
}

async function logCommand(entry) {
  if (hasSupabase()) {
    try {
      await supabaseRequest(TABLES.commands, '', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
      return;
    } catch (error) {
      console.warn(error.message);
    }
  }
  const data = await readLocalStore();
  data.commands.unshift({ ...entry, id: randomUUID() });
  data.commands = data.commands.slice(0, 200);
  await writeLocalStore(data);
}

function firstLineTitle(text) {
  const title = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || 'Untitled note';
  return title.slice(0, 90);
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (/whatb|whatsapp|chat/.test(lower)) return 'WHATB';
  if (/railway|supabase|groq|api|deploy|server/.test(lower)) return 'Apps to build';
  if (/price|money|cost|sell|client|business/.test(lower)) return 'Business ideas';
  if (/todo|to do|remind|remember|follow up|next/.test(lower)) return 'To-do items';
  if (/decision|decide|approved|confirmed/.test(lower)) return 'Decisions';
  if (/ai|assistant|agent|memory|buddy/.test(lower)) return 'AI assistants';
  return 'Random ideas';
}

function detectProject(text) {
  const lower = text.toLowerCase();
  const known = ['buddy', 'whatb', 'flow-net', 'pizza', 'aaa', 'lombicor', 'disjointed'];
  return known.find((name) => lower.includes(name)) || '';
}

function detectTags(text, category, project) {
  const tags = new Set();
  for (const match of text.matchAll(/#([a-z0-9_-]+)/gi)) tags.add(match[1].toLowerCase());
  if (category) tags.add(category.toLowerCase().replace(/\s+/g, '-'));
  if (project) tags.add(project.toLowerCase());
  return [...tags].slice(0, 12);
}

function heuristicNote(rawText, overrides = {}) {
  const text = String(rawText || '').trim();
  const category = overrides.category || detectCategory(text);
  const project = overrides.project || detectProject(text);
  return {
    raw_text: text,
    clean_title: overrides.clean_title || firstLineTitle(text),
    summary: overrides.summary || text.replace(/\s+/g, ' ').slice(0, 260),
    category,
    tags: overrides.tags || detectTags(text, category, project),
    source: overrides.source || '',
    project,
    people: overrides.people || [],
    status: overrides.status || 'active',
    ai_confidence: overrides.ai_confidence ?? 0.35,
    linked_note_ids: overrides.linked_note_ids || [],
    created_at: nowIso(),
    updated_at: nowIso()
  };
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('No JSON object found.');
  }
}

async function groqJson(messages, temperature = 0.2) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${GROQ_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      response_format: { type: 'json_object' }
    })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${text}`);
  }
  const data = JSON.parse(text);
  return extractJson(data.choices?.[0]?.message?.content || '{}');
}

async function groqText(messages, temperature = 0.2) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${GROQ_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${text}`);
  }
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || '';
}

async function enrichNote(rawText, overrides = {}) {
  const fallback = heuristicNote(rawText, overrides);
  if (!hasGroq()) return fallback;
  try {
    const result = await groqJson([
      {
        role: 'system',
        content: [
          'You categorize messy personal notes for Buddy.',
          'Return JSON only with clean_title, summary, category, tags, source, project, people, status, ai_confidence.',
          'Keep guesses conservative. Categories should be human friendly.'
        ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify({ raw_text: rawText, overrides })
      }
    ]);
    return {
      ...fallback,
      clean_title: String(result.clean_title || fallback.clean_title).slice(0, 120),
      summary: String(result.summary || fallback.summary).slice(0, 700),
      category: String(overrides.category || result.category || fallback.category).slice(0, 80),
      tags: Array.isArray(result.tags) ? result.tags.map(String).slice(0, 16) : fallback.tags,
      source: String(overrides.source || result.source || fallback.source || '').slice(0, 120),
      project: String(overrides.project || result.project || fallback.project || '').slice(0, 120),
      people: Array.isArray(result.people) ? result.people.map(String).slice(0, 16) : [],
      status: String(result.status || fallback.status || 'active').slice(0, 40),
      ai_confidence: Number(result.ai_confidence || 0.75)
    };
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

function scoreNote(note, query) {
  const words = String(query || '').toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  const blob = [
    note.raw_text,
    note.clean_title,
    note.summary,
    note.category,
    note.project,
    ...(note.tags || [])
  ].join(' ').toLowerCase();
  return words.reduce((score, word) => score + (blob.includes(word) ? 1 : 0), 0);
}

function relevantNotes(notes, query, limit = 16) {
  return [...notes]
    .map((note) => ({ note, score: scoreNote(note, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.note);
}

async function answerFromMemory(message) {
  const notes = await listNotes({});
  const picked = relevantNotes(notes, message, 20);
  const diaryPages = await listDiaryPages(20);
  const diaryContext = diaryPages.filter((page) => {
    const blob = [
      page.diary_date,
      page.title,
      page.raw_text,
      page.ai_summary,
      ...(page.ai_categories || []),
      ...(page.important_thoughts || []),
      ...(page.decisions || []),
      ...(page.tasks || [])
    ].join(' ');
    return scoreNote({ raw_text: blob }, message) > 0;
  });
  const context = picked.length ? picked : notes.slice(0, 12);
  const diaryPicked = diaryContext.length ? diaryContext : diaryPages.slice(0, 8);
  if (!hasGroq()) {
    if (!context.length && !diaryPicked.length) return 'I do not have saved notes or diary pages yet. Add something first, then ask me again.';
    return [
      'I found this saved memory:',
      ...context.slice(0, 5).map((note) => `- ${note.clean_title}: ${note.summary}`),
      ...diaryPicked.slice(0, 3).map((page) => `- Diary ${page.diary_date}: ${page.ai_summary || page.raw_text || page.title}`)
    ].join('\n');
  }
  return groqText([
    {
      role: 'system',
      content: [
        'You are Buddy, a private AI notebook assistant.',
        'Answer from the supplied saved notes and diary pages first.',
        'If Ethan asks you to edit a diary page, describe the exact edit needed unless an edit API call is available.',
        'If the memory does not contain the answer, say that clearly and suggest what to capture next.',
        'Be concise and practical.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        question: message,
        saved_notes: context.map((note) => ({
          id: note.id,
          title: note.clean_title,
          summary: note.summary,
          category: note.category,
          project: note.project,
          tags: note.tags,
          raw_text: note.raw_text
        })),
        diary_pages: diaryPicked.map((page) => ({
          id: page.id,
          diary_date: page.diary_date,
          title: page.title,
          quote: page.quote,
          raw_text: page.raw_text,
          ai_summary: page.ai_summary,
          ai_categories: page.ai_categories,
          important_thoughts: page.important_thoughts,
          decisions: page.decisions,
          tasks: page.tasks
        }))
      })
    }
  ]);
}

function slugify(value) {
  const slug = String(value || 'buddy-project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || `project-${Date.now()}`;
}

function assertSafeRelativeFile(filePath) {
  const normalized = path.normalize(String(filePath || '')).replace(/^(\.\.[/\\])+/, '');
  if (!normalized || path.isAbsolute(normalized) || normalized.includes('..')) {
    throw new Error(`Unsafe file path: ${filePath}`);
  }
  return normalized;
}

async function generateProjectFiles(idea, noteIds = []) {
  const fallbackName = firstLineTitle(idea).replace(/[^\w\s-]/g, '').slice(0, 60) || 'Buddy Project';
  if (!hasGroq()) {
    return {
      name: fallbackName,
      summary: 'Starter project generated without AI because GROQ_API_KEY is not configured.',
      files: [
        {
          path: 'README.md',
          content: `# ${fallbackName}\n\n${idea}\n\nGenerated by Buddy.\n`
        },
        {
          path: 'index.html',
          content: '<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Buddy Project</title>\n</head>\n<body>\n  <main>\n    <h1>Buddy Project</h1>\n    <p>Edit this starter page in Buddy.</p>\n  </main>\n</body>\n</html>\n'
        }
      ]
    };
  }
  const notes = await listNotes({});
  const selectedNotes = notes.filter((note) => noteIds.includes(note.id));
  const result = await groqJson([
    {
      role: 'system',
      content: [
        'Generate a small safe code project for Buddy.',
        'Return JSON only: name, summary, files.',
        'files must be an array of {path, content}.',
        'Use plain HTML/CSS/JS or Node when possible. Do not include secrets.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({ idea, related_notes: selectedNotes })
    }
  ], 0.35);
  const files = Array.isArray(result.files) ? result.files : [];
  return {
    name: String(result.name || fallbackName).slice(0, 80),
    summary: String(result.summary || '').slice(0, 500),
    files: files.slice(0, 20).map((file) => ({
      path: assertSafeRelativeFile(file.path),
      content: String(file.content || '').slice(0, 60000)
    }))
  };
}

async function writeProjectWorkspace(slug, files) {
  const root = path.join(WORKSPACE_DIR, slug);
  const resolvedRoot = path.resolve(root);
  if (!resolvedRoot.startsWith(path.resolve(WORKSPACE_DIR))) {
    throw new Error('Project workspace escaped Buddy workspace.');
  }
  await mkdir(resolvedRoot, { recursive: true });
  for (const file of files) {
    const safePath = assertSafeRelativeFile(file.path);
    const target = path.resolve(resolvedRoot, safePath);
    if (!target.startsWith(resolvedRoot)) {
      throw new Error(`Unsafe file target: ${file.path}`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

function splitCommand(command) {
  const result = [];
  let current = '';
  let quote = '';
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (quote) {
      if (char === quote) quote = '';
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        result.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current) result.push(current);
  return result;
}

function commandPolicy(command) {
  const trimmed = String(command || '').trim();
  if (!trimmed) return { ok: false, reason: 'No command provided.' };
  if (/[|;&<>`]/.test(trimmed)) {
    return { ok: false, reason: 'Shell operators are blocked. Run one direct command at a time.' };
  }
  const lower = trimmed.toLowerCase();
  const blocked = [
    'rm ',
    'del ',
    'rmdir',
    'remove-item',
    'format',
    'shutdown',
    'reboot',
    'diskpart',
    'mkfs',
    'git reset --hard',
    'git clean',
    'icacls',
    'chmod -r',
    'chown -r',
    'setx ',
    'env:'
  ];
  if (blocked.some((item) => lower.includes(item))) {
    return { ok: false, reason: 'That command is blocked by Buddy terminal safety rules.' };
  }
  const parts = splitCommand(trimmed);
  const base = (parts[0] || '').toLowerCase();
  const allowed = new Set([
    'node',
    'npm',
    'npx',
    'pnpm',
    'git',
    'curl',
    'ping',
    'ls',
    'dir',
    'pwd',
    'echo',
    'cat',
    'type',
    'rg'
  ]);
  if (!allowed.has(base)) {
    return { ok: false, reason: `Command "${base}" is not in the Buddy allow list yet.` };
  }
  return { ok: true, parts };
}

function commandExecutable(base) {
  if (process.platform !== 'win32') return base;
  if (['npm', 'npx', 'pnpm'].includes(base)) return `${base}.cmd`;
  return base;
}

async function cwdForProject(projectId) {
  await mkdir(WORKSPACE_DIR, { recursive: true });
  if (!projectId) return WORKSPACE_DIR;
  const projects = await listProjects();
  const project = projects.find((item) => item.id === projectId);
  if (!project) return WORKSPACE_DIR;
  const target = path.resolve(WORKSPACE_DIR, project.slug);
  if (!target.startsWith(path.resolve(WORKSPACE_DIR))) return WORKSPACE_DIR;
  await mkdir(target, { recursive: true });
  return target;
}

async function runTerminalCommand(command, projectId) {
  if (!TERMINAL_ENABLED) {
    return { blocked: true, reason: 'Terminal is disabled. Set BUDDY_ALLOW_TERMINAL=true to enable it.' };
  }
  const policy = commandPolicy(command);
  if (!policy.ok) return { blocked: true, reason: policy.reason };
  const [base, ...args] = policy.parts;
  const cwd = await cwdForProject(projectId);
  return new Promise((resolve) => {
    const child = spawn(commandExecutable(base), args, {
      cwd,
      shell: false,
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    const limit = 12000;
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      stderr += `\nCommand timed out after ${COMMAND_TIMEOUT_MS}ms.`;
    }, COMMAND_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-limit);
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-limit);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ blocked: false, exit_code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ blocked: false, exit_code: code ?? 0, stdout, stderr });
    });
  });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  }[ext] || 'application/octet-stream';
}

async function serveStatic(req, res, pathname) {
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requestPath);
  const target = path.resolve(PUBLIC_DIR, `.${decoded}`);
  if (!target.startsWith(path.resolve(PUBLIC_DIR))) {
    sendError(res, 403, 'Forbidden.');
    return;
  }
  try {
    const file = await readFile(target);
    res.writeHead(200, { 'content-type': contentTypeFor(target) });
    res.end(file);
  } catch {
    sendError(res, 404, 'Not found.');
  }
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      supabase: hasSupabase(),
      supabase_url_set: Boolean(SUPABASE_URL),
      supabase_key_set: Boolean(SUPABASE_KEY),
      supabase_env_vars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      database_url_set: Boolean(DATABASE_URL),
      database_url_env_var: 'DATABASE_URL',
      groq: hasGroq(),
      model: GROQ_MODEL,
      terminal: TERMINAL_ENABLED,
      token_required: Boolean(ACCESS_TOKEN),
      env_file_loaded: ENV_FILE_LOADED
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/notes') {
    const notes = await listNotes({
      search: url.searchParams.get('search') || '',
      category: url.searchParams.get('category') || ''
    });
    sendJson(res, 200, { notes });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/notes') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const rawText = String(body.raw_text || body.rawText || '').trim();
    if (!rawText) {
      sendError(res, 400, 'Note text is required.');
      return;
    }
    const note = await enrichNote(rawText, {
      source: body.source,
      category: body.category,
      project: body.project
    });
    const saved = await saveNote(note);
    sendJson(res, 201, { note: saved });
    return;
  }

  const noteMatch = url.pathname.match(/^\/api\/notes\/([^/]+)$/);
  if (noteMatch && req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const patch = {
      raw_text: String(body.raw_text || '').trim(),
      clean_title: String(body.clean_title || 'Untitled note').slice(0, 120),
      summary: String(body.summary || '').slice(0, 1200),
      category: String(body.category || 'Random ideas').slice(0, 80),
      tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 16) : [],
      source: String(body.source || '').slice(0, 120),
      project: String(body.project || '').slice(0, 120),
      people: Array.isArray(body.people) ? body.people.map(String).slice(0, 16) : [],
      status: String(body.status || 'active').slice(0, 40),
      ai_confidence: Number(body.ai_confidence || 0)
    };
    const note = await updateNote(noteMatch[1], patch);
    if (!note) sendError(res, 404, 'Note not found.');
    else sendJson(res, 200, { note });
    return;
  }

  if (noteMatch && req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    const deleted = await deleteNote(noteMatch[1]);
    sendJson(res, 200, { deleted });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    if (!message) {
      sendError(res, 400, 'Message is required.');
      return;
    }
    const answer = await answerFromMemory(message);
    sendJson(res, 200, { answer });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/diary') {
    const date = normalizeDiaryDate(url.searchParams.get('date'));
    const diary = await getDiaryPage(date);
    sendJson(res, 200, diary);
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/api/diary') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const date = normalizeDiaryDate(body.diary_date || body.date);
    const diary = await saveDiaryPage(date, {
      title: String(body.title || `Diary - ${date}`).slice(0, 160),
      quote: String(body.quote || dailyQuote(date)).slice(0, 300),
      raw_text: String(body.raw_text || '').slice(0, 40000),
      ai_summary: String(body.ai_summary || '').slice(0, 4000),
      ai_categories: Array.isArray(body.ai_categories) ? body.ai_categories.map(String).slice(0, 24) : [],
      important_thoughts: Array.isArray(body.important_thoughts) ? body.important_thoughts.map(String).slice(0, 40) : [],
      decisions: Array.isArray(body.decisions) ? body.decisions.map(String).slice(0, 40) : [],
      tasks: Array.isArray(body.tasks) ? body.tasks.map(String).slice(0, 40) : []
    });
    sendJson(res, 200, diary);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/diary/organize') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const date = normalizeDiaryDate(body.diary_date || body.date);
    const diary = await organizeDiaryPage(date);
    sendJson(res, 200, diary);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/projects') {
    const projects = await listProjects();
    sendJson(res, 200, { projects });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/projects/generate') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const idea = String(body.idea || '').trim();
    const noteIds = Array.isArray(body.note_ids) ? body.note_ids.map(String) : [];
    if (!idea) {
      sendError(res, 400, 'Project idea is required.');
      return;
    }
    const generated = await generateProjectFiles(idea, noteIds);
    const slugBase = slugify(generated.name);
    const hash = createHash('sha1').update(`${idea}${Date.now()}`).digest('hex').slice(0, 6);
    const slug = `${slugBase}-${hash}`;
    await writeProjectWorkspace(slug, generated.files);
    const files = generated.files.map((file) => ({
      path: file.path,
      content: file.content,
      size: Buffer.byteLength(file.content)
    }));
    const project = await saveProject({
      name: generated.name,
      slug,
      idea,
      summary: generated.summary,
      note_ids: noteIds,
      files,
      created_at: nowIso(),
      updated_at: nowIso()
    });
    sendJson(res, 201, { project });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/terminal') {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const command = String(body.command || '').trim();
    const projectId = body.project_id ? String(body.project_id) : '';
    const result = await runTerminalCommand(command, projectId);
    await logCommand({
      project_id: projectId || null,
      command,
      exit_code: result.exit_code ?? null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      blocked: Boolean(result.blocked),
      reason: result.reason || null,
      created_at: nowIso()
    });
    const status = result.blocked ? 400 : 200;
    sendJson(res, status, result);
    return;
  }

  sendError(res, 404, 'API route not found.');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error.message || 'Server error.');
  }
});

server.listen(PORT, () => {
  console.log(`Buddy running on http://localhost:${PORT}`);
});
