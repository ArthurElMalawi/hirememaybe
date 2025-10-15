// app/recruiter/actions.ts
'use server'

import { createClientAction } from '@/lib/supabase/clients'

export async function upsertRecruiterProfile(formData: FormData) {
  const supabase = await createClientAction()
  const company = String(formData.get('company') || '').trim()
  const role = String(formData.get('role') || '').trim()

  if (!company) {
    return { ok: false, error: 'Le nom de l’entreprise est requis.' }
  }

  // Ensure row exists
  const { error: rpcError } = await supabase.rpc('ensure_recruiter')
  if (rpcError) return { ok: false, error: rpcError.message }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié.' }

  const { error } = await supabase
    .from('recruiters')
    .upsert({ user_id: user.id, company, role }, { onConflict: 'user_id' })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
