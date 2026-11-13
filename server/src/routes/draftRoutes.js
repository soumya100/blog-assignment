const express = require('express');
const draftController = require('../controllers/draftController');
const { requireAuth } = require('../middleware/auth');
const { contentCreationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(requireAuth);
router.get('/', draftController.listDrafts);
router.post('/', contentCreationLimiter, draftController.saveDraft);
router.get('/:id', draftController.getDraft);
router.patch('/:id', draftController.updateDraft);
router.post('/:id/collaborators', draftController.addCollaborator);
router.delete('/:id/collaborators/:userId', draftController.removeCollaborator);
router.post('/:id/publish', contentCreationLimiter, draftController.publishDraft);
router.delete('/:id', draftController.deleteDraft);

module.exports = router;
