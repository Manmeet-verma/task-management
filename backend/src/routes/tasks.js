const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, taskController.getAll);
router.get('/available', authMiddleware, taskController.getAvailable);
router.get('/mine', authMiddleware, taskController.getMine);
router.get('/claimed', authMiddleware, taskController.getClaimed);
router.get('/pending', authMiddleware, adminMiddleware, taskController.getPendingTasks);
router.get('/stats', authMiddleware, taskController.getStats);
router.get('/:id', authMiddleware, taskController.getById);

router.post('/', authMiddleware, adminMiddleware, taskController.create);
router.put('/:id', authMiddleware, adminMiddleware, taskController.update);
router.delete('/:id', authMiddleware, adminMiddleware, taskController.remove);

router.post('/:id/claim', authMiddleware, taskController.claim);
router.post('/:id/accept', authMiddleware, adminMiddleware, taskController.accept);
router.post('/:id/reject', authMiddleware, adminMiddleware, taskController.reject);
router.post('/:id/pending', authMiddleware, taskController.pending);
router.post('/:id/complete', authMiddleware, taskController.complete);
router.post('/:id/pending-resubmit', authMiddleware, taskController.pendingResubmit);
router.post('/:id/approve-complete', authMiddleware, adminMiddleware, taskController.approveComplete);
router.post('/:id/extend-date', authMiddleware, taskController.extendDate);
router.post('/:id/approve-extend', authMiddleware, adminMiddleware, taskController.approveExtend);
router.post('/:id/reject-extend', authMiddleware, adminMiddleware, taskController.rejectExtend);
router.post('/:id/lock', authMiddleware, adminMiddleware, taskController.lock);
router.post('/:id/reassign', authMiddleware, adminMiddleware, taskController.reassign);

module.exports = router;
