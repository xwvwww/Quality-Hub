import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const config = {
  apiBaseUrl: (process.env.QUALITY_HUB_API_URL || 'http://localhost:4000/api').replace(/\/$/, ''),
  apiKey: process.env.QUALITY_HUB_API_KEY,
  pollMs: Number(process.env.QUALITY_HUB_POLL_MS || 5000),
  workspace: process.env.QUALITY_HUB_WORKSPACE || tmpdir(),
  workdir: process.env.QUALITY_HUB_WORKDIR || process.cwd(),
  allowedRepositoryHosts: new Set((process.env.QUALITY_HUB_ALLOWED_REPOSITORY_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)),
  allowedCommands: new Set((process.env.QUALITY_HUB_ALLOWED_COMMANDS || 'pnpm,npm,npx,pytest,mvn,gradle,node').split(',').map((command) => command.trim().toLowerCase()).filter(Boolean)),
  timeoutMs: Number(process.env.QUALITY_HUB_COMMAND_TIMEOUT_MS || 1_800_000),
  once: process.argv.includes('--once'),
};

function printHelp() {
  console.log(`Quality Hub Automation Agent

Required:
  QUALITY_HUB_API_KEY       API key created in Integrations

Optional:
  QUALITY_HUB_API_URL       API base URL (default: http://localhost:4000/api)
  QUALITY_HUB_POLL_MS       Poll interval in milliseconds (default: 5000)
  QUALITY_HUB_WORKSPACE     Temporary checkout parent directory
  QUALITY_HUB_WORKDIR        Working directory when repository is not configured
  QUALITY_HUB_ALLOWED_REPOSITORY_HOSTS
                            Comma-separated HTTPS repository host allowlist
  QUALITY_HUB_ALLOWED_COMMANDS
                            Comma-separated executable allowlist

Examples:
  $env:QUALITY_HUB_API_KEY = "qh_..."
  corepack pnpm agent
  corepack pnpm agent -- --once
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }
  if (!response.ok) {
    throw new Error(`Quality Hub API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

function commandParts(command) {
  const parts = command.match(/"[^"]*"|'[^']*'|[^\s]+/g)?.map((part) => part.replace(/^(['"])|(['"])$/g, '')) || [];
  if (!parts.length) throw new Error('Suite command cannot be empty');
  const executable = parts[0].split(/[\\/]/).pop().replace(/\.cmd$/i, '').toLowerCase();
  if (!config.allowedCommands.has(executable)) throw new Error(`Command "${executable}" is not allowed by this Agent`);
  return [process.platform === 'win32' && ['pnpm', 'npm', 'npx', 'yarn'].includes(executable) ? `${executable}.cmd` : parts[0], parts.slice(1)];
}

function safeEnvironment(extra = {}) {
  const environment = {};
  for (const name of ['PATH', 'SystemRoot', 'ComSpec', 'TEMP', 'TMP', 'USERPROFILE', 'HOME']) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  return { ...environment, ...extra };
}

function runCommand(command, cwd, env, timeoutMs = config.timeoutMs) {
  return new Promise((resolve) => {
    const [executable, args] = commandParts(command);
    const child = spawn(executable, args, { cwd, env, shell: false, windowsHide: true });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    let output = '';
    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > 12000) output = output.slice(-12000);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', (error) => resolve({ code: 1, output: `${output}\n${error.message}` }));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output: code === null ? `${output}\nCommand timed out after ${timeoutMs}ms` : output });
    });
  });
}

function cloneRepository(repository, branch, directory) {
  return new Promise((resolve) => {
    const child = spawn('git', ['clone', '--depth', '1', '--branch', branch, repository, '.'], {
      cwd: directory,
      env: safeEnvironment(),
      windowsHide: true,
    });
    let output = '';
    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > 12000) output = output.slice(-12000);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', (error) => resolve({ code: 1, output: `${output}\n${error.message}` }));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

async function checkout(run) {
  if (!run.suite.repository) return { directory: config.workdir, temporary: false };
  let repositoryUrl;
  try {
    repositoryUrl = new URL(run.suite.repository);
  } catch {
    throw new Error('Repository URL must be a valid HTTPS URL');
  }
  if (repositoryUrl.protocol !== 'https:' || !config.allowedRepositoryHosts.has(repositoryUrl.hostname.toLowerCase())) {
    throw new Error('Repository host is not in QUALITY_HUB_ALLOWED_REPOSITORY_HOSTS');
  }
  await mkdir(config.workspace, { recursive: true });
  const directory = await mkdtemp(join(config.workspace, 'quality-hub-agent-'));
  const ref = run.suite.branch || 'main';
  const result = await cloneRepository(run.suite.repository, ref, directory);
  if (result.code !== 0) {
    await rm(directory, { recursive: true, force: true });
    throw new Error(`Repository checkout failed:\n${result.output}`);
  }
  return { directory, temporary: true };
}

async function execute(run) {
  const checkoutResult = await checkout(run);
  const startedAt = Date.now();
  try {
    const env = {
      ...safeEnvironment(),
      QUALITY_HUB_RUN_ID: run.id,
      QUALITY_HUB_PROJECT_ID: run.projectId,
      QUALITY_HUB_FRAMEWORK: run.framework,
      QUALITY_HUB_ENVIRONMENT: run.environment || '',
    };
    const result = await runCommand(run.suite.command, checkoutResult.directory, env);
    const status = result.code === 0 ? 'PASSED' : 'FAILED';
    await request(`/automation/agent/runs/${run.id}`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        durationMs: Date.now() - startedAt,
        error: status === 'FAILED' ? result.output.slice(-2000) : undefined,
      }),
    });
    console.log(`[${status}] ${run.suite.name} (${run.id})`);
  } catch (error) {
    await request(`/automation/agent/runs/${run.id}`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'FAILED',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message.slice(-2000) : String(error),
      }),
    });
    console.error(`[FAILED] ${run.suite.name}:`, error);
  } finally {
    if (checkoutResult.temporary) await rm(checkoutResult.directory, { recursive: true, force: true });
  }
}

async function poll() {
  const run = await request('/automation/agent/claim', { method: 'POST', body: '{}' });
  if (run) await execute(run);
  return Boolean(run);
}

async function main() {
  if (process.argv.includes('--help')) return printHelp();
  if (!config.apiKey) throw new Error('QUALITY_HUB_API_KEY is required');
  console.log(`Quality Hub Agent polling ${config.apiBaseUrl}`);
  do {
    try {
      const claimed = await poll();
      if (!claimed && !config.once) await sleep(config.pollMs);
      if (config.once && !claimed) return;
    } catch (error) {
      console.error('[agent]', error);
      if (config.once) process.exitCode = 1;
      else await sleep(config.pollMs);
    }
  } while (!config.once);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
