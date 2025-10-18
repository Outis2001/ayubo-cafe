import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://chxflnoqbapoywpibeba.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoeGZsbm9xYmFwb3l3cGliZWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODA4MTcsImV4cCI6MjA3NTc1NjgxN30.UCG58nLvxLthBNFp7WQd7N8F9uJ33oZ8uCv-YZP8hO4';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);