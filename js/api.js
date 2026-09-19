import { data } from './state.js';

export const SUPABASE_URL = 'https://ywuzwxdetfiguaqdoctt.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dXp3eGRldGZpZ3VhcWRvY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTExMTIsImV4cCI6MjEwNTM4NzExMn0.NGWqSMsToYY7VPgLNnqK30Tg4LYL6QdswzNPRW8TDmQ';

let _supabaseClient = null;

export function get_supabase() {
  if (!_supabaseClient) {
    if (!window.supabase) throw new Error('Supabase library not loaded');
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabaseClient;
}

export function getHeaders(extra = {}) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${data.accessToken || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra
  };
}

export async function dbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: getHeaders(), ...opts });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function dbInsert(table, rows) {
  const result = await dbFetch(table, { method: 'POST', body: JSON.stringify(rows) });
  return Array.isArray(rows) ? result : result[0];
}

export async function dbUpdate(table, id, patch) {
  const result = await dbFetch(`${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return result[0];
}

export async function dbDelete(table, id) {
  await dbFetch(`${table}?id=eq.${id}`, { method: 'DELETE', headers: getHeaders({ 'Prefer': 'return=minimal' }) });
}

export async function signInWithGoogle() {
  const sb = get_supabase();
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
}

export async function signOut() {
  const sb = get_supabase();
  await sb.auth.signOut();
  location.reload();
}
