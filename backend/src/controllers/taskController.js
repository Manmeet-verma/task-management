const { db, ref, get, push, set, update, remove } = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { name, category, siteProject, deadline, priority, description, assignedToIds } = req.body;
    const newTaskRef = push(ref(db, 'tasks'));
    const taskId = newTaskRef.key;

    const task = {
      id: taskId,
      name,
      category,
      siteProject,
      deadline: new Date(deadline).toISOString(),
      priority: priority || 'MEDIUM',
      description: description || '',
      status: assignedToIds && assignedToIds.length > 0 ? 'ASSIGNED' : 'AVAILABLE',
      createdById: req.user.id,
      assignedToIds: assignedToIds || [],
      assignedToId: assignedToIds && assignedToIds.length > 0 ? assignedToIds[0] : null,
      extensionCount: 0,
      history: [{ date: new Date().toISOString(), action: 'Created', details: `Task created by ${req.user.username}`, performedBy: req.user.id }],
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
      assignedToUsers: (task.assignedToIds || []).map(uid => users[uid] ? { id: uid, username: users[uid].username } : null).filter(Boolean),
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
    const tasks = Object.values(tasksData).filter(t => {
      const assignedToIds = t.assignedToIds || [];
      return t.assignedToId === req.user.id || assignedToIds.includes(req.user.id);
    });

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const enriched = tasks.map(task => ({
      ...task,
      createdBy: users[task.createdById] ? { id: task.createdById, username: users[task.createdById].username } : null,
      assignedTo: users[task.assignedToId] ? { id: task.assignedToId, username: users[task.assignedToId].username } : null,
      assignedToUsers: (task.assignedToIds || []).map(uid => users[uid] ? { id: uid, username: users[uid].username } : null).filter(Boolean),
    }));

    enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClaimed = async (req, res) => {
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) return res.json([]);

    const tasksData = snapshot.val();
    const tasks = Object.values(tasksData).filter(t => {
      const assignedToIds = t.assignedToIds || [];
      return (t.assignedToId === req.user.id || assignedToIds.includes(req.user.id)) && t.status !== 'AVAILABLE';
    });

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
      assignedToUsers: (task.assignedToIds || []).map(uid => users[uid] ? { id: uid, username: users[uid].username } : null).filter(Boolean),
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

    const { name, category, siteProject, deadline, priority, description, status, assignedToIds } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    const history = snapshot.val().history || [];

    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (siteProject !== undefined) updates.siteProject = siteProject;
    if (deadline !== undefined) updates.deadline = new Date(deadline).toISOString();
    if (priority !== undefined) updates.priority = priority;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) {
      updates.status = status;
      history.push({ date: new Date().toISOString(), action: 'Status Changed', details: `Status changed to ${status}`, performedBy: req.user.id });
    }
    if (assignedToIds !== undefined) {
      updates.assignedToIds = assignedToIds;
      updates.assignedToId = assignedToIds.length > 0 ? assignedToIds[0] : null;
      if (assignedToIds.length > 0 && (!snapshot.val().assignedToId || snapshot.val().status === 'AVAILABLE')) {
        updates.status = 'ASSIGNED';
      }
    }

    updates.history = history;
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

    const assignedToIds = task.assignedToIds || [];
    if (!assignedToIds.includes(req.user.id)) assignedToIds.push(req.user.id);

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Claimed', details: `Task claimed by ${req.user.username}`, performedBy: req.user.id });

    const updates = {
      assignedToId: req.user.id,
      assignedToIds,
      status: 'IN_PROGRESS',
      history,
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

exports.accept = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });

    const history = snapshot.val().history || [];
    history.push({ date: new Date().toISOString(), action: 'Accepted', details: `Task accepted`, performedBy: req.user.id });

    await update(taskRef, { status: 'ACCEPTED', history, updatedAt: new Date().toISOString() });
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const { reason } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });

    const history = snapshot.val().history || [];
    history.push({ date: new Date().toISOString(), action: 'Rejected', details: `Task rejected. Reason: ${reason || 'None'}`, performedBy: req.user.id });

    const updates = {
      status: 'REJECTED',
      rejectReason: reason || '',
      history,
      updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.pending = async (req, res) => {
  try {
    const { reason } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();
    if (task.assignedToId !== req.user.id && !(task.assignedToIds || []).includes(req.user.id)) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Marked Pending', details: `Marked pending. Reason: ${reason || 'None'}`, performedBy: req.user.id });

    const updates = {
      status: 'PENDING',
      pendingReason: reason || '',
      history,
      updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updates);

    const newSubRef = push(ref(db, 'submissions'));
    await set(newSubRef, {
      id: newSubRef.key,
      taskId: req.params.id,
      userId: req.user.id,
      pendingReason: reason || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.complete = async (req, res) => {
  try {
    const { remarks } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();
    if (task.assignedToId !== req.user.id && !(task.assignedToIds || []).includes(req.user.id)) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Completed', details: `Task completed. Remarks: ${remarks || 'None'}`, performedBy: req.user.id });

    const updates = {
      status: 'COMPLETED',
      completedRemarks: remarks || '',
      completedAt: new Date().toISOString(),
      history,
      updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updates);

    const newSubRef = push(ref(db, 'submissions'));
    await set(newSubRef, {
      id: newSubRef.key,
      taskId: req.params.id,
      userId: req.user.id,
      comments: remarks || '',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveComplete = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });

    const history = snapshot.val().history || [];
    history.push({ date: new Date().toISOString(), action: 'Approved & Locked', details: `Task approved and locked by admin`, performedBy: req.user.id });

    await update(taskRef, { status: 'VERIFIED', locked: true, history, updatedAt: new Date().toISOString() });
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.extendDate = async (req, res) => {
  try {
    const { newDeadline, reason } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();
    if (task.assignedToId !== req.user.id && !(task.assignedToIds || []).includes(req.user.id)) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const extCount = (task.extensionCount || 0) + 1;
    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Extension Requested', details: `Extension #${extCount} requested. New deadline: ${newDeadline}. Reason: ${reason || 'None'}`, performedBy: req.user.id });

    const updates = {
      extensionCount: extCount,
      extendDeadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      extendReason: reason || '',
      extendStatus: 'PENDING',
      lastExtReason: reason || '',
      history,
      updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveExtend = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Extension Approved', details: `Extension request approved by admin`, performedBy: req.user.id });

    const updates = {
      extendStatus: 'APPROVED',
      history,
      updatedAt: new Date().toISOString(),
    };
    if (task.extendDeadline) {
      updates.deadline = task.extendDeadline;
    }

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectExtend = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = snapshot.val();

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Extension Rejected', details: `Extension request rejected by admin`, performedBy: req.user.id });

    const updates = {
      extendStatus: 'REJECTED',
      history,
      updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updates);
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.lock = async (req, res) => {
  try {
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });

    const history = snapshot.val().history || [];
    history.push({ date: new Date().toISOString(), action: 'Locked', details: `Task locked by admin`, performedBy: req.user.id });

    await update(taskRef, { locked: true, status: 'LOCKED', history, updatedAt: new Date().toISOString() });
    const updated = (await get(taskRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reassign = async (req, res) => {
  try {
    const { assignedToId, reason } = req.body;
    const taskRef = ref(db, `tasks/${req.params.id}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    if (!assignedToId) return res.status(400).json({ error: 'User ID required' });

    const task = snapshot.val();
    const assignedToIds = task.assignedToIds || [];
    if (!assignedToIds.includes(assignedToId)) assignedToIds.push(assignedToId);

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};
    const newAssignee = users[assignedToId] ? users[assignedToId].username : assignedToId;

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Reassigned', details: `Task reassigned to ${newAssignee}. Reason: ${reason || 'None'}`, performedBy: req.user.id });

    const updates = {
      assignedToId,
      assignedToIds,
      status: 'ASSIGNED',
      reassignReason: reason || '',
      reassignedBy: req.user.username || req.user.id,
      history,
      updatedAt: new Date().toISOString(),
    };

    await update(taskRef, updates);
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
    if (task.assignedToId !== req.user.id && !(task.assignedToIds || []).includes(req.user.id)) {
      return res.status(403).json({ error: 'Not your task' });
    }
    if (!pendingReason) return res.status(400).json({ error: 'Pending reason is required' });

    const history = task.history || [];
    history.push({ date: new Date().toISOString(), action: 'Pending Resubmit', details: `Pending resubmit requested`, performedBy: req.user.id });

    await update(taskRef, { status: 'PENDING_RESUBMIT', history, updatedAt: new Date().toISOString() });

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

exports.getStats = async (req, res) => {
  try {
    const tasksRef = ref(db, 'tasks');
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) {
      return res.json({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        extensionRequests: 0,
        overdueTasks: 0,
      });
    }

    const tasks = Object.values(snapshot.val());
    const now = new Date();

    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VERIFIED').length,
      pendingTasks: tasks.filter(t => t.status === 'PENDING' || t.status === 'PENDING_RESUBMIT').length,
      inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED' || t.status === 'ASSIGNED').length,
      extensionRequests: tasks.filter(t => t.extendStatus === 'PENDING').length,
      overdueTasks: tasks.filter(t => new Date(t.deadline) < now && t.status !== 'COMPLETED' && t.status !== 'VERIFIED' && t.status !== 'LOCKED').length,
    };

    res.json(stats);
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
        assignedToUsers: (task.assignedToIds || []).map(uid => users[uid] ? { id: uid, username: users[uid].username } : null).filter(Boolean),
        submissions: taskSubs,
      };
    });

    enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
