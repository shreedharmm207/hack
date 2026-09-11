import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function farmGridDbPlugin(): Plugin {
  const dbPath = path.resolve(__dirname, './data/farmgrid.json');

  function readDb(): Record<string, any[]> {
    try {
      if (fs.existsSync(dbPath)) {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      }
    } catch (e) {
      console.error('Error reading DB:', e);
    }
    return {
      profiles: [],
      farmers: [],
      organizations: [],
      resources: [],
      requests: [],
      allocations: [],
      conflicts: [],
      audit_logs: [],
      notifications: [],
      fairness_events: [],
    };
  }

  function writeDb(db: Record<string, any[]>) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing DB:', e);
    }
  }

  return {
    name: 'farmgrid-db-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Only handle /api/db and /api/auth
        if (!url.startsWith('/api/db') && !url.startsWith('/api/auth')) {
          return next();
        }

        // Helper to parse JSON body
        const getBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        const sendJson = (data: any, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(data));
        };

        const db = readDb();
        const cleanUrl = url.split('?')[0];
        const searchParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');

        // ─── AUTH: SIGN UP (NO EMAIL CONFIRMATION REQUIRED) ─────────────────────
        if (cleanUrl === '/api/auth/signup' && req.method === 'POST') {
          const body = await getBody();
          const { email, password, role, full_name, phone, profile_data } = body;
          const emailLower = (email || '').trim().toLowerCase();

          // Check if user exists
          const existing = db.profiles.find((p: any) => p.email.toLowerCase() === emailLower);
          if (existing) {
            return sendJson({ error: 'User with this email already exists.' }, 400);
          }

          const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const newProfile = {
            id: userId,
            email: emailLower,
            password: password || 'Default@123',
            role: role || 'farmer',
            full_name: full_name || '',
            phone: phone || '',
            created_at: new Date().toISOString(),
          };
          db.profiles.push(newProfile);

          if (role === 'farmer') {
            const farmerId = 'f_' + Date.now();
            const newFarmer = {
              id: farmerId,
              user_id: userId,
              name: full_name || '',
              email: emailLower,
              phone: phone || '',
              village: profile_data?.village || 'Mandya Rural',
              district: profile_data?.district || 'Mandya',
              state: profile_data?.state || 'Karnataka',
              lat: 12.5222,
              lng: 76.8978,
              farm_size_acres: profile_data?.farm_size_acres || 4.5,
              primary_crop: profile_data?.primary_crop || 'Paddy',
              crop_stage: profile_data?.crop_stage || 'harvesting',
              allocation_attempts: 0,
              successful_allocations: 0,
              consecutive_losses: 0,
              created_at: new Date().toISOString(),
            };
            db.farmers.push(newFarmer);
          } else if (role === 'organization') {
            const orgId = 'o_' + Date.now();
            const newOrg = {
              id: orgId,
              user_id: userId,
              org_name: full_name || profile_data?.org_name || 'Agri Organization',
              contact_person: profile_data?.contact_person || full_name,
              contact_number: phone || '',
              operational_region: profile_data?.operational_region || 'Karnataka Region',
              address: profile_data?.address || '',
              org_type: profile_data?.org_type || 'cooperative',
              is_approved: true,
              created_at: new Date().toISOString(),
            };
            db.organizations.push(newOrg);
          }

          db.audit_logs.unshift({
            id: 'audit_' + Date.now(),
            actor_name: full_name || emailLower,
            actor_role: role,
            action: 'USER_REGISTERED_DIRECT',
            entity_type: 'user',
            entity_id: userId,
            details: `New ${role} registered directly (instant access): ${emailLower}`,
            created_at: new Date().toISOString(),
          });

          writeDb(db);
          return sendJson({ user: newProfile });
        }

        // ─── AUTH: LOGIN (EMAIL + PASSWORD) ─────────────────────────────────────
        if (cleanUrl === '/api/auth/login' && req.method === 'POST') {
          const body = await getBody();
          const { email, password, expectedRole } = body;
          const emailLower = (email || '').trim().toLowerCase();

          const user = db.profiles.find((p: any) => p.email.toLowerCase() === emailLower);
          if (!user) {
            return sendJson({ error: 'Invalid email or password.' }, 401);
          }
          if (user.password && user.password !== password) {
            return sendJson({ error: 'Invalid email or password.' }, 401);
          }
          if (expectedRole && expectedRole !== 'admin' && user.role !== expectedRole) {
            return sendJson({ error: `This account is registered as "${user.role}", not "${expectedRole}".` }, 403);
          }

          return sendJson({ user });
        }

        // ─── DB: GET TABLE / QUERY ──────────────────────────────────────────────
        const dbTableMatch = cleanUrl.match(/^\/api\/db\/([a-zA-Z0-9_]+)(?:\/([a-zA-Z0-9_-]+))?$/);
        if (dbTableMatch) {
          const table = dbTableMatch[1];
          const recordId = dbTableMatch[2];

          if (!db[table]) {
            db[table] = [];
          }

          if (req.method === 'GET') {
            if (recordId) {
              const item = db[table].find((x: any) => x.id === recordId);
              return sendJson(item || null, item ? 200 : 404);
            }

            let results = [...db[table]];

            // Apply filter queries (e.g. ?farmer_id=..., ?organization_id=...)
            searchParams.forEach((val, key) => {
              if (key === 'order' || key === 'limit') return;
              results = results.filter((item: any) => String(item[key]) === String(val));
            });

            // If table is requests, join farmer, organization, resource
            if (table === 'requests') {
              results = results.map(r => {
                const farmer = db.farmers.find(f => f.id === r.farmer_id) || null;
                const org = db.organizations.find(o => o.id === r.organization_id) || null;
                const res = db.resources.find(res => res.id === r.resource_id) || null;
                return {
                  ...r,
                  farmer: farmer ? { name: farmer.name, village: farmer.village, district: farmer.district } : null,
                  farmerName: farmer?.name || r.farmerName || 'Farmer',
                  organization: org ? { org_name: org.org_name } : null,
                  orgName: org?.org_name || r.orgName || '',
                  resource: res ? { name: res.name, category: res.category } : null,
                  resourceName: res?.name || r.resourceName || r.resource_type || 'Resource',
                };
              });
            } else if (table === 'allocations') {
              results = results.map(a => {
                const farmer = db.farmers.find(f => f.id === a.farmer_id) || null;
                const org = db.organizations.find(o => o.id === a.organization_id) || null;
                const res = db.resources.find(res => res.id === a.resource_id) || null;
                return {
                  ...a,
                  farmer: farmer ? { name: farmer.name } : null,
                  farmerName: farmer?.name || 'Farmer',
                  organization: org ? { org_name: org.org_name } : null,
                  providerName: org?.org_name || 'Provider',
                  resource: res ? { name: res.name, category: res.category } : null,
                  resourceName: res?.name || 'Resource',
                };
              });
            } else if (table === 'resources') {
              results = results.map(r => {
                const org = db.organizations.find(o => o.id === r.organization_id) || null;
                return {
                  ...r,
                  organization: org ? { org_name: org.org_name } : null,
                  providerName: org?.org_name || 'Provider',
                };
              });
            }

            // Order by created_at desc by default
            results.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

            return sendJson(results);
          }

          // ─── DB: INSERT RECORD ────────────────────────────────────────────────
          if (req.method === 'POST') {
            const body = await getBody();
            const newRecord = {
              id: body.id || (table.slice(0, 3) + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
              ...body,
              created_at: body.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // If inserting a request, associate with matched resource/org and handle auto-allocation
            if (table === 'requests') {
              // Find matching organization if not provided
              if (!newRecord.organization_id) {
                const matchingOrg = db.organizations[0];
                if (matchingOrg) newRecord.organization_id = matchingOrg.id;
              }
              // Find matching resource
              const matchingRes = db.resources.find((r: any) =>
                r.category === newRecord.resource_type &&
                (!newRecord.organization_id || r.organization_id === newRecord.organization_id)
              );
              if (matchingRes) {
                newRecord.resource_id = matchingRes.id;
              }

              // Set default status if not given
              if (!newRecord.status) newRecord.status = 'submitted';

              // Create matching allocation if available
              if (matchingRes && (newRecord.status === 'submitted' || newRecord.status === 'allocated' || newRecord.status === 'scheduled')) {
                newRecord.status = 'scheduled';
                newRecord.allocation_method = 'auto';

                const newAlloc = {
                  id: 'alloc_' + Date.now(),
                  request_id: newRecord.id,
                  resource_id: matchingRes.id,
                  farmer_id: newRecord.farmer_id,
                  organization_id: newRecord.organization_id,
                  scheduled_start: newRecord.earliest_start,
                  scheduled_end: newRecord.latest_end,
                  status: 'scheduled',
                  priority_score: newRecord.priority_score || 85,
                  priority_breakdown: newRecord.priority_breakdown || {},
                  allocation_method: 'auto',
                  created_at: new Date().toISOString(),
                };
                db.allocations.unshift(newAlloc);
              }
            }

            db[table].unshift(newRecord);
            writeDb(db);
            return sendJson(newRecord, 201);
          }

          // ─── DB: UPDATE RECORD ────────────────────────────────────────────────
          if (req.method === 'PUT' || req.method === 'PATCH') {
            const body = await getBody();
            const idx = db[table].findIndex((x: any) => x.id === (recordId || body.id));
            if (idx >= 0) {
              db[table][idx] = {
                ...db[table][idx],
                ...body,
                updated_at: new Date().toISOString(),
              };
              writeDb(db);
              return sendJson(db[table][idx]);
            }
            return sendJson({ error: 'Record not found' }, 404);
          }

          // ─── DB: DELETE RECORD ────────────────────────────────────────────────
          if (req.method === 'DELETE') {
            db[table] = db[table].filter((x: any) => x.id !== recordId);
            writeDb(db);
            return sendJson({ success: true });
          }
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), farmGridDbPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
})
