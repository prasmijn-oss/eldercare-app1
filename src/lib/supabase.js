import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kpwzeawgrqdsezflvjkm.supabase.co";
const ANON_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd3plYXdncnFkc2V6Zmx2amttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzc1MzIsImV4cCI6MjA5NTExMzUzMn0.-fvmwgZqwyddWyq1IJ4vcHvsTVMpPmhI72p4hyCtC6E";

export const supabase      = createClient(SUPABASE_URL, ANON_KEY);
// supabaseAdmin: service role key is NOT stored in the frontend bundle.
// User creation / auth management go through Supabase Edge Functions.
export const supabaseAdmin = supabase;
