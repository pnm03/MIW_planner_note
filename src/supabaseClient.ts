import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://ullukfbwkskcldmjjyfw.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbHVrZmJ3a3NrY2xkbWpqeWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTI5NzcsImV4cCI6MjA5NzUyODk3N30.05tA9p2L18XVui3PL4z4PEX2wb0Lj6INqgRcK2Do164";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
