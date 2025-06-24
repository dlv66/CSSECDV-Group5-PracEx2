import { NextResponse } from 'next/server';
import { validatePasswordStrength, hashPassword } from '@/lib/password_auth';

// Temporary in-memory store; replace with actual DB
const users: any[] = [];

export async function POST(req: Request) {
  const { username, email, password } = await req.json();

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const error = validatePasswordStrength(password, username, email);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const emailExists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const usernameExists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (usernameExists) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
  }

  const password_hash = await hashPassword(password);

  users.push({
    id: Date.now(),
    username,
    displayName: username,
    email: email.toLowerCase(),
    password_hash,
    hash_algorithm: 'bcrypt',
    created_at: new Date(),
    updated_at: new Date()
  });

  return NextResponse.json({ message: 'User registered successfully', hashPreview: password_hash });
}