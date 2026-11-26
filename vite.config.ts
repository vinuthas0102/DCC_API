import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';

const RULES_FILE = fileURLToPath(new URL('./public/data/dcc-rules.json', import.meta.url));
const LOOKUPS_FILE = fileURLToPath(new URL('./public/data/dcc-lookups.json', import.meta.url));

interface RulesFile {
  version?: string;
  updatedAt?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules: any[];
}

function readRulesFile(): RulesFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    return { version: parsed.version, updatedAt: parsed.updatedAt, rules: parsed.rules ?? [] };
  } catch {
    return { rules: [] };
  }
}

function writeRulesFile(file: RulesFile) {
  fs.writeFileSync(
    RULES_FILE,
    JSON.stringify({ version: file.version ?? '1.0.0', updatedAt: new Date().toISOString(), rules: file.rules }, null, 2) + '\n',
  );
}

function json(res: Connect.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c: string) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

// Mock REST API persisting directly to public/data/dcc-rules.json — no external database.
function dccApiPlugin(): Plugin {
  return {
    name: 'dcc-mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];

        if (req.method === 'GET' && url === '/api/dcc/lookups') {
          try {
            const raw = fs.readFileSync(LOOKUPS_FILE, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(raw);
          } catch {
            json(res, 500, { error: 'dcc-lookups.json not readable' });
          }
          return;
        }

        const match = url.match(/^\/api\/dcc\/rules(?:\/([^/]+))?$/);
        if (!match) return next();

        const ruleNo = match[1] ? decodeURIComponent(match[1]) : null;

        if (req.method === 'GET' && !ruleNo) {
          const { rules } = readRulesFile();
          const q = new URLSearchParams((req.url ?? '').split('?')[1] ?? '');
          const search = (q.get('search') ?? '').toLowerCase();
          const filtered = rules.filter((r) => {
            if (search && ![r.generationRuleNo, r.targetObject, r.targetObjectId, r.demandType, r.tpaUrlId]
              .some((v: unknown) => String(v ?? '').toLowerCase().includes(search))) return false;
            return true;
          });
          return json(res, 200, { data: filtered, count: filtered.length, total: rules.length });
        }

        if (req.method === 'GET' && ruleNo) {
          const rule = readRulesFile().rules.find((r) => r.generationRuleNo === ruleNo);
          if (!rule) return json(res, 404, { error: `Rule ${ruleNo} not found` });
          return json(res, 200, { data: rule });
        }

        if (req.method === 'POST' && !ruleNo) {
          const body = await readBody(req);
          if (!body?.generationRuleNo) return json(res, 400, { error: 'generationRuleNo is required' });
          const file = readRulesFile();
          if (file.rules.some((r) => r.generationRuleNo === body.generationRuleNo))
            return json(res, 409, { error: `Rule ${body.generationRuleNo} already exists` });
          file.rules.push(body);
          writeRulesFile(file);
          return json(res, 201, { data: body });
        }

        if (req.method === 'PUT' && ruleNo) {
          const body = await readBody(req);
          const file = readRulesFile();
          const idx = file.rules.findIndex((r) => r.generationRuleNo === ruleNo);
          if (idx === -1) return json(res, 404, { error: `Rule ${ruleNo} not found` });
          file.rules[idx] = { ...file.rules[idx], ...body, generationRuleNo: ruleNo };
          writeRulesFile(file);
          return json(res, 200, { data: file.rules[idx] });
        }

        if (req.method === 'DELETE' && ruleNo) {
          const file = readRulesFile();
          const removed = file.rules.find((r) => r.generationRuleNo === ruleNo);
          if (!removed) return json(res, 404, { error: `Rule ${ruleNo} not found` });
          file.rules = file.rules.filter((r) => r.generationRuleNo !== ruleNo);
          writeRulesFile(file);
          return json(res, 200, { data: removed });
        }
        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dccApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
