import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import nodemailer from 'nodemailer'

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

        // Helper to send OTP email
        const sendOtpEmail = async (toEmail: string, otp: string) => {
          const subject = 'Verify your FarmGrid account';
          const text = `Your FarmGrid verification code is: ${otp}\n\nThis code expires in 10 minutes.\nDo not share this code with anyone.`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
              <h2 style="color: #0d9488; margin-bottom: 8px;">FarmGrid — Account Verification</h2>
              <p style="color: #475569; font-size: 14px;">Thank you for registering with FarmGrid. Use the verification code below to activate your account:</p>
              <div style="background-color: #f0fdfa; border: 1px dashed #0d9488; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f766e;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
              <p style="color: #ef4444; font-size: 12px;">Do not share this code with anyone.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center;">FarmGrid Agricultural Resource Platform</p>
            </div>
          `;

          // Record in sent_emails for audit
          if (!db.sent_emails) db.sent_emails = [];
          db.sent_emails.unshift({
            to: toEmail,
            subject,
            otp,
            sent_at: new Date().toISOString(),
          });

          // Check for SMTP environment variables
          const smtpHost = process.env.SMTP_HOST;
          const smtpPort = Number(process.env.SMTP_PORT) || 587;
          const smtpUser = process.env.SMTP_USER;
          const smtpPass = process.env.SMTP_PASS;
          const smtpFrom = process.env.SMTP_FROM || 'no-reply@farmgrid.agri';

          if (smtpHost && smtpUser && smtpPass) {
            try {
              const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass },
              });
              await transporter.sendMail({
                from: `"FarmGrid" <${smtpFrom}>`,
                to: toEmail,
                subject,
                text,
                html,
              });
              console.log(`[FarmGrid Email] Successfully sent OTP email to ${toEmail} via SMTP`);
            } catch (smtpErr) {
              console.error(`[FarmGrid Email] SMTP delivery error:`, smtpErr);
            }
          } else {
            console.log(`\n======================================================`);
            console.log(`[FarmGrid Email Service] OTP Sent to: ${toEmail}`);
            console.log(`Subject: ${subject}`);
            console.log(`Verification Code: ${otp}`);
            console.log(`Expires in: 10 minutes`);
            console.log(`(Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for external relay)`);
            console.log(`======================================================\n`);
          }
        };

        const maskEmail = (emailStr: string) => {
          const parts = emailStr.split('@');
          if (parts.length < 2) return emailStr;
          const name = parts[0];
          const domain = parts[1];
          if (name.length <= 2) return `${name[0]}***@${domain}`;
          return `${name[0]}***${name[name.length - 1]}@${domain}`;
        };

        // ─── AUTH: SIGN UP (DIRECT LOGIN — NO OTP REQUIRED — OFFLINE READY) ────
        if (cleanUrl === '/api/auth/signup' && req.method === 'POST') {
          const body = await getBody();
          const { email, password, role, full_name, phone, profile_data } = body;
          const emailLower = (email || '').trim().toLowerCase();

          // 1. Validation
          if (!emailLower || !emailLower.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return sendJson({ error: 'Please enter a valid email address.' }, 400);
          }
          if (!password || password.length < 6) {
            return sendJson({ error: 'Password must be at least 6 characters long.' }, 400);
          }
          if (!full_name && !profile_data?.org_name) {
            return sendJson({ error: 'Please enter your name / organization name.' }, 400);
          }

          // 2. Check if user already exists
          const existingUser = db.profiles.find((p: any) => p.email.toLowerCase() === emailLower);
          if (existingUser) {
            return sendJson({ error: 'An account with this email already exists. Please log in directly.' }, 400);
          }

          // 3. Immediately create active user profile
          const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const userRole = role || 'farmer';
          const userName = full_name || profile_data?.org_name || 'FarmGrid User';

          const newProfile = {
            id: userId,
            email: emailLower,
            password,
            role: userRole,
            full_name: userName,
            phone: phone || '',
            email_verified: true,
            created_at: new Date().toISOString(),
          };
          db.profiles.push(newProfile);

          // 4. Create farmer or organization record
          if (userRole === 'farmer') {
            const farmerId = 'f_' + Date.now();
            db.farmers.push({
              id: farmerId,
              user_id: userId,
              name: userName,
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
            });
          } else if (userRole === 'organization') {
            const orgId = 'o_' + Date.now();
            db.organizations.push({
              id: orgId,
              user_id: userId,
              org_name: userName,
              contact_person: profile_data?.contact_person || userName,
              contact_number: phone || '',
              operational_region: profile_data?.operational_region || 'Karnataka Region',
              address: profile_data?.address || '',
              org_type: profile_data?.org_type || 'cooperative',
              is_approved: true,
              created_at: new Date().toISOString(),
            });
          }

          db.audit_logs.unshift({
            id: 'audit_' + Date.now(),
            actor_name: userName,
            actor_role: userRole,
            action: 'USER_REGISTERED_DIRECT',
            entity_type: 'user',
            entity_id: userId,
            details: `User registered and activated directly (offline-ready): ${emailLower}`,
            created_at: new Date().toISOString(),
          });

          writeDb(db);

          const safeUser = {
            id: userId,
            email: emailLower,
            role: userRole,
            full_name: userName,
            phone: phone || '',
            email_verified: true,
          };

          return sendJson({
            success: true,
            user: safeUser,
            session: { user: safeUser },
            message: 'Account created successfully! Logging you in directly.'
          });
        }

        // ─── AUTH: VERIFY OTP (COMPATIBILITY FALLBACK) ──────────────────────────
        if (cleanUrl === '/api/auth/verify-otp' && req.method === 'POST') {
          const body = await getBody();
          const { email } = body;
          const emailLower = (email || '').trim().toLowerCase();
          const profile = db.profiles.find((p: any) => p.email.toLowerCase() === emailLower);
          return sendJson({
            success: true,
            user: profile || null,
            message: 'Email verified directly.'
          });
        }

        // ─── AUTH: LOGIN (DIRECT LOGIN — NO OTP/EMAIL VERIFICATION REQUIRED) ────
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

          // Check if email is verified
          if (user.email_verified === false) {
            return sendJson({
              error: 'Please verify your email before logging in.',
              unverified: true,
              email: user.email,
              role: user.role,
            }, 403);
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
