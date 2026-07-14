const { db, ref, get, push, set, update, remove, query, orderByChild, equalTo } = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { name, category, siteProject, deadline, priority, description } = req.body;
    const newTaskRef = push(ref(db, 'tasks'));
    const taskId = newTaskRef.key;

    const task = {
      id: taskId,
      name,
      category,
      siteProject,
      deadline: new Date(deadline).toISOString(),
      priority: priority || 'MEDIUM',
      description,
      status: 'AVAILABLE',
      createdById: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newTaskRef, task);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return res.json([]);

    const tasksData = snapshot.val();
    const tasks = Object.values(tasksData);

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const enriched = tasks.map(task => ({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
      assignedTo: task.assignedToId && users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
    }));

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailable = async (req, res) => {
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return res.json([]);

    const tasksData = snapshot.val();
    const tasks = Object.values(tasksData).filter(t => t.status === 'AVAILABLE');

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const enriched = tasks.map(task => ({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
    }));

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return res.json([]);

    const tasksData = snapshot.val();
    const tasks = Object.values(tasksData).filter(t => t.assignedToId === req.user.id);

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const enriched = tasks.map(task => ({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
      assignedTo: users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
    }));

    enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });

    const task = snapshot.val();

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const submissionsSnapshot = await get(ref(db, 'submissions'));
    let submissions = [];
    if (submissionsSnapshot.exists()) {
      submissions = Object.values(submissionsSnapshot.val())
        .filter(s => s.taskId === req.params.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(s => ({
          ...s,
          user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
        }));
    }

    res.json({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
      assignedTo: task.assignedToId && users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
      submissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });

    const { name, category, siteProject, deadline, priority, description, status } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (siteProject) updates.siteProject = siteProject;
    if (deadline) updates.deadline = new Date(deadline).toISOString();
    if (priority) updates.priority = priority;
    if (description) updates.description = description;
    if (status) updates.status = status;

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await remove(ref(db, `tasks/${req.params.id}`));
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.claim = async (req, res) => {
  try {
    const { userDeadline } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();
    if (task.status !== 'AVAILABLE') return res.status(400).json({ error: 'Task is not available' });

    const updates = {
      assignedToId: req.user.id,
      status: 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
    };
    if (userDeadline) updates.userDeadline = new Date(userDeadline).toISOString();

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.complete = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();
    if (task.assignedToId !== req.user.id) return res.status(403).json({ error: 'Not your task' });
    if (task.status !== 'ACCEPTED') return res.status(400).json({ error: 'Task must be accepted by admin first' });

    await update(taskRef, { status: 'COMPLETED', updatedAt: new Date().toISOString() });
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.pendingResubmit = async (req, res) => {
  try {
    const { pendingReason } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();
    if (task.assignedToId !== req.user.id) return res.status(403).json({ error: 'Not your task' });
    if (!pendingReason) return res.status(400).json({ error: 'Pending reason is required' });

    await update(taskRef, { status: 'PENDING_RESUBMIT', updatedAt: new Date().toISOString() });

    const newSubRef = push(ref(db, 'submissions'));
    await set(newSubRef, {
      id: newSubRef.key,
      taskId: req.params.id,
      userId: req.user.id,
      pendingReason,
      status: 'PENDING_RESUBMIT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingTasks = async (req, res) => {
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return res.json([]);

    const tasksData = snapshot.val();
    const tasks = Object.values(tasksData).filter(t => t.status === 'PENDING_RESUBMIT');

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const submissionsSnapshot = await get(ref(db, 'submissions'));
    const allSubs = submissionsSnapshot.exists() ? Object.values(submissionsSnapshot.val()) : [];

    const enriched = tasks.map(task => {
      const taskSubs = allSubs
        .filter(s => s.taskId === task.id && s.status === 'PENDING_RESUBMIT')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return {
        ...task,
        createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
        assignedTo: task.assignedToId && users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
        submissions: taskSubs,
      };
    });

    enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
