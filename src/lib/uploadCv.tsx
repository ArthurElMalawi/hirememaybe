import { createClientBrowser } from '@/lib/supabase/client';
export async function uploadCv(file: File, path?: string) {
  if (file.type !== 'application/pdf') throw new Error('PDF only');
  const supabase = createClientBrowser();
  const key = path ?? `cvs/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from('cvs').upload(key, file, { upsert: true });
  if (error) throw error;
  return key;
}
