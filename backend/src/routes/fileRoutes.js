const express = require('express');
const router = express.Router();
const { 
    getFiles, 
    uploadFile, 
    deleteFile, 
    createFolder,
    getTrashFiles,
    restoreFile,
    permanentDeleteFile,
    moveFile,
    bulkDeleteFiles,
    bulkMoveFiles,
    bulkRestoreFiles,
    bulkPermanentDeleteFiles
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Matches /api/file
router.get('/', protect, getFiles);

// Upload & Folder
router.post('/upload', protect, upload.array('file'), uploadFile);
router.post('/folder', protect, createFolder);

// Trash Routes
router.get('/trash', protect, getTrashFiles);

// Bulk Routes (POST for actions with body)
router.post('/bulk/delete', protect, bulkDeleteFiles);
router.post('/bulk/move', protect, bulkMoveFiles);
router.post('/bulk/restore', protect, bulkRestoreFiles);
router.post('/bulk/permanent', protect, bulkPermanentDeleteFiles);

// Individual operations
router.put('/restore/:id', protect, restoreFile);
router.delete('/permanent/:id', protect, permanentDeleteFile);

// Soft delete
router.delete('/:id', protect, deleteFile);

// Move file
router.put('/move/:id', protect, moveFile);

module.exports = router;
