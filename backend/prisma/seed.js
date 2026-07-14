require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, push } = require('firebase/database');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const adminRef = push(ref(db, 'users'));
  const adminId = adminRef.key;
  await set(adminRef, {
    id: adminId,
    username: 'admin',
    email: 'admin@example.com',
    password: adminPassword,
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  });

  const userRef = push(ref(db, 'users'));
  const userId = userRef.key;
  await set(userRef, {
    id: userId,
    username: 'user',
    email: 'user@example.com',
    password: userPassword,
    role: 'USER',
    createdAt: new Date().toISOString(),
  });

  await set(ref(db, 'emailIndex/admin@example.com'.replace(/\./g, ',')), { userId: adminId, email: 'admin@example.com' });
  await set(ref(db, 'emailIndex/user@example.com'.replace(/\./g, ',')), { userId: userId, email: 'user@example.com' });
  await set(ref(db, 'usernameIndex/admin'), { userId: adminId, username: 'admin' });
  await set(ref(db, 'usernameIndex/user'), { userId: userId, username: 'user' });

  const task1Ref = push(ref(db, 'tasks'));
  await set(task1Ref, {
    id: task1Ref.key,
    name: 'Design Landing Page',
    category: 'Design',
    siteProject: 'Company Website',
    deadline: new Date('2026-08-01').toISOString(),
    priority: 'HIGH',
    description: 'Create a modern landing page design with Figma',
    status: 'AVAILABLE',
    createdById: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const task2Ref = push(ref(db, 'tasks'));
  await set(task2Ref, {
    id: task2Ref.key,
    name: 'Fix Login Bug',
    category: 'Development',
    siteProject: 'Web App',
    deadline: new Date('2026-07-20').toISOString(),
    priority: 'HIGH',
    description: 'Users cannot login with Google OAuth',
    status: 'AVAILABLE',
    createdById: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const task3Ref = push(ref(db, 'tasks'));
  await set(task3Ref, {
    id: task3Ref.key,
    name: 'Write API Documentation',
    category: 'Documentation',
    siteProject: 'API v2',
    deadline: new Date('2026-07-30').toISOString(),
    priority: 'MEDIUM',
    description: 'Document all REST API endpoints using Swagger',
    status: 'AVAILABLE',
    createdById: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log('Seed data created successfully!');
  console.log('');
  console.log('=== DEMO CREDENTIALS ===');
  console.log('Admin: admin@example.com / admin123');
  console.log('User:  user@example.com  / user123');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
