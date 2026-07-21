require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, remove } = require('firebase/database');

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
  console.log('Clearing old data...');

  await remove(ref(db, 'users'));
  await remove(ref(db, 'emailIndex'));
  await remove(ref(db, 'usernameIndex'));
  await remove(ref(db, 'tasks'));
  await remove(ref(db, 'submissions'));
  await remove(ref(db, 'notifications'));

  console.log('Old data cleared.');

  const superAdminPassword = await bcrypt.hash('super123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Super Admin
  const superAdminId = 'super-admin-001';
  await set(ref(db, `users/${superAdminId}`), {
    id: superAdminId,
    username: 'superadmin',
    email: 'super@example.com',
    password: superAdminPassword,
    role: 'ADMIN',
    isMaster: true,
    createdAt: new Date().toISOString(),
  });
  await set(ref(db, 'emailIndex/super@example,com'), { userId: superAdminId, email: 'super@example.com' });
  await set(ref(db, 'usernameIndex/superadmin'), { userId: superAdminId, username: 'superadmin' });

  // Admin
  const adminId = 'admin-001';
  await set(ref(db, `users/${adminId}`), {
    id: adminId,
    username: 'admin',
    email: 'admin@example.com',
    password: adminPassword,
    role: 'ADMIN',
    isMaster: false,
    createdAt: new Date().toISOString(),
  });
  await set(ref(db, 'emailIndex/admin@example,com'), { userId: adminId, email: 'admin@example.com' });
  await set(ref(db, 'usernameIndex/admin'), { userId: adminId, username: 'admin' });

  // User
  const userId = 'user-001';
  await set(ref(db, `users/${userId}`), {
    id: userId,
    username: 'user',
    email: 'user@example.com',
    password: userPassword,
    role: 'USER',
    createdAt: new Date().toISOString(),
  });
  await set(ref(db, 'emailIndex/user@example,com'), { userId: userId, email: 'user@example.com' });
  await set(ref(db, 'usernameIndex/user'), { userId: userId, username: 'user' });

  // Sample tasks
  const task1Ref = ref(db, 'tasks/task-001');
  await set(task1Ref, {
    id: 'task-001',
    name: 'Design Landing Page',
    category: 'Design',
    siteProject: 'Company Website',
    deadline: new Date('2026-08-01').toISOString(),
    priority: 'HIGH',
    description: 'Create a modern landing page design with Figma',
    status: 'AVAILABLE',
    extensionCount: 0,
    locked: false,
    assignedToIds: [],
    createdById: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const task2Ref = ref(db, 'tasks/task-002');
  await set(task2Ref, {
    id: 'task-002',
    name: 'Fix Login Bug',
    category: 'Development',
    siteProject: 'Web App',
    deadline: new Date('2026-07-20').toISOString(),
    priority: 'HIGH',
    description: 'Users cannot login with Google OAuth',
    status: 'ASSIGNED',
    extensionCount: 0,
    locked: false,
    assignedToId: userId,
    assignedToIds: [userId],
    assignedByName: 'superadmin',
    createdById: superAdminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const task3Ref = ref(db, 'tasks/task-003');
  await set(task3Ref, {
    id: 'task-003',
    name: 'Write API Documentation',
    category: 'Documentation',
    siteProject: 'API v2',
    deadline: new Date('2026-07-30').toISOString(),
    priority: 'MEDIUM',
    description: 'Document all REST API endpoints using Swagger',
    status: 'AVAILABLE',
    extensionCount: 0,
    locked: false,
    assignedToIds: [],
    createdById: adminId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log('');
  console.log('=========================================');
  console.log('   DATABASE RESET COMPLETE');
  console.log('=========================================');
  console.log('Super Admin: super@example.com / super123');
  console.log('Admin:       admin@example.com / admin123');
  console.log('User:        user@example.com  / user123');
  console.log('=========================================');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
