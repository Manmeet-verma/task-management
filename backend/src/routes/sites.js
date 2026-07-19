const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, siteController.getAll);
router.post('/', authMiddleware, adminMiddleware, siteController.create);
router.put('/:id', authMiddleware, adminMiddleware, siteController.update);
router.delete('/:id', authMiddleware, adminMiddleware, siteController.remove);

module.exports = router;
