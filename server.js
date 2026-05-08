const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PROVIDER_CONFIGS = [
  {
    id: 'groq',
    label: 'Groq',
    apiKeyEnv: 'GROQ_API_KEY',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  },
];

let systemContext = '';

function normalizeEnvValue(value) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function resolveAdvertisedUrl(port) {
  const configuredUrl = normalizeEnvValue(process.env.RAILWAY_URL);

  if (/^https?:\/\//i.test(configuredUrl)) {
    return configuredUrl;
  }

  return `http://localhost:${port}`;
}

function loadSystemContext() {
  const oldContext = systemContext;
  systemContext = '';

  try {
    const brainPath = path.join(__dirname, 'brain.md');
    if (fs.existsSync(brainPath)) {
      const brainContent = fs.readFileSync(brainPath, 'utf-8');
      systemContext += `${brainContent.substring(0, 3000)}\n\n[... brain.md continues ...]\n\n`;
    }

    const actionsPath = path.join(__dirname, 'Actions');
    if (fs.existsSync(actionsPath)) {
      const files = fs.readdirSync(actionsPath).filter((file) => file.endsWith('.md')).sort();
      for (const file of files) {
        const content = fs.readFileSync(path.join(actionsPath, file), 'utf-8');
        systemContext += `## ${file}\n${content.substring(0, 1000)}\n\n`;
      }
    }

    if (oldContext !== systemContext) {
      console.log('System context updated');
    }
  } catch (err) {
    console.error('Error loading system context:', err.message);
  }

  return systemContext;
}

function runHeartbeat() {
  const now = new Date();
  const timestamp = now.toLocaleString();
  
  // Reload context
  loadSystemContext();

  // Update timeline.md
  try {
    const timelinePath = path.join(__dirname, 'Actions', 'timeline.md');
    if (fs.existsSync(timelinePath)) {
      const entry = `- [${timestamp}] Heartbeat: Context reloaded. /ide is active.\n`;
      fs.appendFileSync(timelinePath, entry);
    }
  } catch (err) {
    console.error('Heartbeat timeline update failed:', err.message);
  }

  console.log(`Heartbeat completed at ${timestamp}`);
}

// Start heartbeat every 15 minutes as requested
const HEARTBEAT_INTERVAL = 15 * 60 * 1000;
setInterval(runHeartbeat, HEARTBEAT_INTERVAL);

const personas = {
  joe: { label: 'Joe' },
  davis: { label: 'Davis' },
};

function getProviders() {
  return PROVIDER_CONFIGS.map((provider) => ({
    ...provider,
    apiKey: normalizeEnvValue(process.env[provider.apiKeyEnv]),
    configured: Boolean(normalizeEnvValue(process.env[provider.apiKeyEnv])),
  }));
}

function getChatEndpoint(baseUrl) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL('chat/completions', normalizedBaseUrl).toString();
}

function buildPersonaPrompt(personaKey, workspaceContext) {
  const persona = personas[personaKey];

  if (!persona) {
    throw new Error('Invalid persona');
  }

  return `You are ${persona.label}, an expert coding assistant for Ethan's /ide workspace. Follow the workspace rules from brain.md and the Actions workflow. Respect the todo.md tracking rules, stay practical and honest, cite exact file paths when useful, and use the latest workspace markdown context below.\n\nWorkspace Context:\n${workspaceContext}`;
}

async function callProvider(provider, messages) {
  const response = await fetch(getChatEndpoint(provider.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const rawBody = await response.text();
  let payload = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      payload = { rawBody };
    }
  }

  if (!response.ok) {
    const detail =
      payload.error?.message ||
      payload.error ||
      payload.message ||
      rawBody ||
      `HTTP ${response.status}`;

    throw new Error(detail);
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Provider returned no assistant content.');
  }

  return {
    content,
    providerId: provider.id,
    providerLabel: provider.label,
    model: payload.model || provider.model,
  };
}

async function createChatResponse(messages) {
  const providers = getProviders().filter((provider) => provider.configured);

  if (providers.length === 0) {
    throw new Error('No Groq or DeepSeek API key is configured in /ide/.env.');
  }

  const failures = [];

  for (const provider of providers) {
    try {
      return await callProvider(provider, messages);
    } catch (error) {
      failures.push(`${provider.label}: ${error.message}`);
    }
  }

  throw new Error(failures.join(' | '));
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona = 'joe', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (!personas[persona]) {
      return res.status(400).json({ error: 'Invalid persona.' });
    }

    const workspaceContext = loadSystemContext();
    const messages = [
      { role: 'system', content: buildPersonaPrompt(persona, workspaceContext) },
      ...history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await createChatResponse(messages);

    res.json({
      role: 'assistant',
      content: response.content,
      persona,
      personaLabel: personas[persona].label,
      provider: response.providerId,
      providerLabel: response.providerLabel,
      model: response.model,
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({
      error: err.message,
      details: err.cause?.message || 'Unknown error',
    });
  }
});

app.get('/api/health', (req, res) => {
  const providers = getProviders();

  res.json({
    status: 'ok',
    primary: providers[0]?.label || null,
    fallback: providers[1]?.label || null,
    providers: providers.map((provider) => ({
      id: provider.id,
      label: provider.label,
      model: provider.model,
      configured: provider.configured,
    })),
    systemContextLoaded: Boolean(systemContext),
  });
});

loadSystemContext();
app.listen(PORT, () => {
  const providers = getProviders();
  console.log(`\nIDE Chat Server running at ${resolveAdvertisedUrl(PORT)}`);
  console.log(`Port: ${PORT}`);
  console.log(`Primary provider ready: ${providers[0]?.configured ? 'Yes' : 'No'}`);
  console.log(`Fallback provider ready: ${providers[1]?.configured ? 'Yes' : 'No'}`);
  console.log(`System context loaded: ${systemContext.length} characters\n`);
});
