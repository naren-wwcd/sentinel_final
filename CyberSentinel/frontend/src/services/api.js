const BASE = import.meta.env.VITE_API_URL || '/api'
async function req(path, method = 'GET', body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).detail || m } catch {} throw new Error(m) }
  return r.json()
}
export const api = {
  health: () => req('/health'), dashboard: () => req('/dashboard'), events: (n = 300) => req('/events?limit=' + n), alerts: () => req('/alerts'),
  incidents: () => req('/incidents'), incident: (id) => req('/incidents/' + id),
  simStart: (speed = 1) => req('/simulation/start', 'POST', { speed }), simStatus: () => req('/simulation/status'), simReset: () => req('/simulation/reset', 'POST'),
  investigate: (id) => req('/investigate/' + id, 'POST'), investigation: (id) => req('/investigation/' + id), risk: (id) => req('/risk/' + id),
  responses: () => req('/responses'), execute: (id) => req(`/responses/${id}/execute`, 'POST', {}),
  approvals: () => req('/approvals'), approve: (id) => req(`/approvals/${id}/approve`, 'POST', {}),
  reject: (id, note) => req(`/approvals/${id}/reject`, 'POST', { note }),
  audit: () => req('/audit?limit=500'), settings: () => req('/settings'), setSettings: (b) => req('/settings', 'POST', b),
}
