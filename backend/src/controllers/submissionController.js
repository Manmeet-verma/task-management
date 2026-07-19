const { db, ref, get, push, set, update } = require('../config/db');

exports.submit = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { comments } = req.body;

    const taskRef = ref(db, `tasks/${taskId}`);
    const taskSnapshot = await get(taskRef);
    if (!taskSnapshot.exists()) return res.status(404).json({ error: 'Task not found' });
    const task = taskSnapshot.val();

    if (task.assignedToId !== req.user.id && !(task.assignedToIds || []).includes(req.user.id)) return res.status(403).json({ error: 'Not your task' });
    if (task.status !== 'IN_PROGRESS' && task.status !== 'REWORK' && task.status !== 'PENDING_RESUBMIT') {
      return res.status(400).json({ error: 'Task cannot be submitted' });
    }

    const reportUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const newSubRef = push(ref(db, 'submissions'));
    const submissionId = newSubRef.key;

    const submission = {
      id: submissionId,
      taskId,
      userId: req.user.id,
      reportUrl,
      comments: comments || '',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newSubRef, submission);
    await update(taskRef, { status: 'SUBMITTED', updatedAt: new Date().toISOString() });

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.review = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminComments } = req.body;

    const subRef = ref(db, `submissions/${id}`);
    const subSnapshot = await get(subRef);
    if (!subSnapshot.exists()) return res.status(404).json({ error: 'Submission not found' });
    const submission = subSnapshot.val();

    const taskRef = ref(db, `tasks/${submission.taskId}`);

    if (action === 'accept') {
      await update(subRef, { status: 'ACCEPTED', adminComments: adminComments || '', updatedAt: new Date().toISOString() });
      await update(taskRef, { status: 'ACCEPTED', updatedAt: new Date().toISOString() });
    } else if (action === 'reject') {
      await update(subRef, { status: 'REJECTED', adminComments: adminComments || '', updatedAt: new Date().toISOString() });
      await update(taskRef, { status: 'REWORK', updatedAt: new Date().toISOString() });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ message: `Submission ${action}ed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTaskSubmissions = async (req, res) => {
  try {
    const subsRef = ref(db, 'submissions');
    const snapshot = await get(subsRef);

    if (!snapshot.exists()) return res.json([]);

    const allSubs = Object.values(snapshot.val());
    const taskSubs = allSubs
      .filter(s => s.taskId === req.params.taskId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const enriched = taskSubs.map(s => ({
      ...s,
      user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllSubmissions = async (req, res) => {
  try {
    const subsRef = ref(db, 'submissions');
    const snapshot = await get(subsRef);

    if (!snapshot.exists()) return res.json([]);

    const allSubs = Object.values(snapshot.val());

    const usersSnapshot = await get(ref(db, 'users'));
    const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const tasksSnapshot = await get(ref(db, 'tasks'));
    const tasks = tasksSnapshot.exists() ? tasksSnapshot.val() : {};

    const enriched = allSubs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(s => ({
        ...s,
        task: tasks[s.taskId] ? { id: s.taskId, name: tasks[s.taskId].name } : null,
        user: users[s.userId] ? { id: s.userId, username: users[s.userId].username } : null,
      }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
