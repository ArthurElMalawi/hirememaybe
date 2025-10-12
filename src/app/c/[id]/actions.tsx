'use server';
import { createClientServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function downloadCv(cv_path: string) {
  const supabase = await createClientServer();
  const { data, error } = await supabase.storage.from('cvs').createSignedUrl(cv_path, 60);
  if (error || !data?.signedUrl) throw new Error('Cannot get CV');
  redirect(data.signedUrl);
}
