const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, taskController.getAll);
router.get('/available', authMiddleware, taskController.getAvailable);
router.get('/mine', authMiddleware, taskController.getMine);
router.get('/pending', authMiddleware, adminMiddleware, taskController.getPendingTasks);
router.get('/:id', authMiddleware, taskController.getById);
router.post('/', authMiddleware, adminMiddleware, taskController.create);
router.put('/:id', authMiddleware, adminMiddleware, taskController.update);
router.delete('/:id', authMiddleware, adminMiddleware, taskController.remove);
router.post('/:id/claim', authMiddleware, taskController.claim);
router.post('/:id/complete', authMiddleware, taskController.complete);
router.post('/:id/pending-resubmit', authMiddleware, taskController.pendingResubmit);

module.exports = router;
