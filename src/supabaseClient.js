import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lsgeecegiewnfdoxzcfd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZ2VlY2VnaWV3bmZkb3h6Y2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTYzMzAsImV4cCI6MjEwMjUzMjMzMH0.dQw-9rLwDtTexOmrXPmcrGRrzMX4TsI14NSj0EIfrPk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)