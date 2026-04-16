const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function checkTables() {
    console.log('Checking tables...');
    
    const tables = ['courses', 'batches'];
    
    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`Table "${table}" error: ${error.message}`);
            } else {
                console.log(`Table "${table}" exists!`);
            }
        } catch (e) {
            console.log(`Table "${table}" catch error: ${e.message}`);
        }
    }
}

checkTables();
