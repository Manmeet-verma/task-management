const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const submissionController = require('../controllers/submissionController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get('/', authMiddleware, adminMiddleware, submissionController.getAllSubmissions);
router.get('/:taskId', authMiddleware, submissionController.getTaskSubmissions);
router.post('/:taskId/submit', authMiddleware, upload.single('report'), submissionController.submit);
router.put('/:id/review', authMiddleware, adminMiddleware, submissionController.review);

module.exports = router;
