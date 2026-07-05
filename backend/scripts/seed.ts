import 'dotenv/config';
import readline from 'readline/promises';
import connectMongoDB from '../config/mongodb';
import User from '../models/user.model';

async function promptCredentials(): Promise<{ email: string; name: string }> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = await rl.question('Admin email (must be an existing user, e.g. one who already logged in via Google): ');
    const name = await rl.question('Admin display name (leave blank to keep existing): ');
    return { email: email.trim(), name: name.trim() };
  } finally {
    rl.close();
  }
}

async function main() {
  await connectMongoDB();

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.email}`);
    process.exit(0);
  }

  const { email, name } = await promptCredentials();
  const user = await User.findOne({ email });

  if (!user) {
    console.error(`No user found with email "${email}". The user must sign in via Google OAuth at least once before being promoted to admin.`);
    process.exit(1);
  }

  user.role = 'admin';
  if (name) user.name = name;
  await user.save();

  console.log(`Promoted "${user.email}" to admin.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
