// @ts-nocheck
import fs from 'fs';
import path from 'path';

const STORE_FILE = path.resolve(process.cwd(), '.aegis_sync_store.json');

// Default initial state for store if no existing file is found
const DEFAULT_STORE = {
  UserLocation: [],
  SOSAlert: [],
  HazardReport: [],
  SafetyCheckIn: [],
  Household: [
    {
      id: 'hh-demo-1',
      name: 'Dela Cruz & Santos Demo Household',
      address: 'Poblacion Central, Tupi, South Cotabato',
      evacuation_meeting_point: 'Tupi Municipal Gym & Open Grounds',
      member_user_ids: ['demo-user-1', 'demo-user-2'],
      created_by_id: 'demo-user-1',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    }
  ],
  EmergencyContact: [],
  Announcement: [],
};

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STORE, ...parsed };
    }
  } catch (err) {
    console.warn('[aegis-sync] Failed to load store from disk, using default:', err.message);
  }
  return { ...DEFAULT_STORE };
}

let saveTimeout = null;
function persistStore(store) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[aegis-sync] Failed to save store to disk:', err.message);
    }
  }, 100);
}

export function createAegisSyncPlugin() {
  let store = loadStore();
  const sseClients = new Set();

  function broadcast(eventData) {
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  return {
    name: 'aegis-sync-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        // Only handle /aegis-sync routes
        if (!url.pathname.startsWith('/aegis-sync')) {
          return next();
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        // 1. Real-time SSE Stream
        if (url.pathname === '/aegis-sync/stream') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          });
          res.write(': connected\n\n');

          // Send current state on connection
          res.write(`data: ${JSON.stringify({ type: 'init', store })}\n\n`);

          sseClients.add(res);

          const keepAlive = setInterval(() => {
            try {
              res.write(': ping\n\n');
            } catch {
              clearInterval(keepAlive);
              sseClients.delete(res);
            }
          }, 15000);

          req.on('close', () => {
            clearInterval(keepAlive);
            sseClients.delete(res);
          });
          return;
        }

        // 2. Fetch full store or single entity list
        if (req.method === 'GET') {
          const entity = url.searchParams.get('entity');
          res.setHeader('Content-Type', 'application/json');

          if (!entity || entity === 'all') {
            return res.end(JSON.stringify(store));
          }

          const items = store[entity] || [];
          return res.end(JSON.stringify(items));
        }

        // 3. Mutation: POST /aegis-sync
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const { entity, action = 'upsert', data, id } = parsed;

              if (!entity) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Missing entity' }));
              }

              if (!store[entity]) {
                store[entity] = [];
              }

              let list = store[entity];
              let affectedItem = null;

              if (action === 'create' || action === 'upsert') {
                const now = new Date().toISOString();
                const itemData = {
                  ...data,
                  updated_date: now,
                  created_date: data?.created_date || now,
                };

                // Match existing item: by explicit id or for UserLocation by created_by_id / user_id
                let existingIndex = -1;
                if (data?.id) {
                  existingIndex = list.findIndex(i => String(i.id) === String(data.id));
                }
                if (existingIndex === -1 && entity === 'UserLocation' && (data?.created_by_id || data?.user_id)) {
                  const uid = String(data.created_by_id || data.user_id);
                  existingIndex = list.findIndex(i => String(i.created_by_id || i.user_id) === uid);
                }

                if (existingIndex !== -1) {
                  // Merge with existing
                  list[existingIndex] = {
                    ...list[existingIndex],
                    ...itemData,
                    id: list[existingIndex].id,
                  };
                  affectedItem = list[existingIndex];
                } else {
                  // Create new
                  if (!itemData.id) {
                    itemData.id = `${entity.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  }
                  list.unshift(itemData);
                  affectedItem = itemData;
                }
              } else if (action === 'update') {
                const targetId = id || data?.id;
                const index = list.findIndex(i => String(i.id) === String(targetId));
                if (index !== -1) {
                  list[index] = {
                    ...list[index],
                    ...data,
                    updated_date: new Date().toISOString(),
                  };
                  affectedItem = list[index];
                } else {
                  res.statusCode = 404;
                  return res.end(JSON.stringify({ error: 'Item not found' }));
                }
              } else if (action === 'delete') {
                const targetId = id || data?.id;
                store[entity] = list.filter(i => String(i.id) !== String(targetId));
                affectedItem = { id: targetId, deleted: true };
              } else if (action === 'bulk_set') {
                if (Array.isArray(data)) {
                  store[entity] = data;
                  affectedItem = data;
                }
              }

              persistStore(store);

              // Broadcast update to all connected browsers immediately!
              broadcast({
                type: 'entity_changed',
                entity,
                action,
                item: affectedItem,
                items: store[entity],
                timestamp: Date.now(),
              });

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, item: affectedItem, count: store[entity].length }));
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}
