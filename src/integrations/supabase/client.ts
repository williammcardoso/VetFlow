// Integration client for Supabase — uses Vite env vars.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Do not throw here to avoid breaking static analysis in non-browser environments.
  // Runtime will surface missing vars when operations are attempted.
  // eslint-disable-next-line no-console
  console.warn("[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set");
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(String(SUPABASE_URL), String(SUPABASE_PUBLISHABLE_KEY));