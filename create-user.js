// Script to create a user in Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUser() {
  try {
    console.log('Creating user in Supabase...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'mmccartney@cloud9assist.com',
      password: 'PeaveyHP!120',
      email_confirm: true
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('User created successfully:', data.user.email);
    console.log('User ID:', data.user.id);
  } catch (error) {
    console.error('Exception:', error);
  }
}

createUser();
