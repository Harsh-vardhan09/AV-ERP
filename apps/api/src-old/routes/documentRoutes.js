const express = require('express');
const { varifyToken } = require('../middlewares/varifyToken');
const documentController = require('../controller/documentController');
const documentConfigController = require('../controller/documentConfigController');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');

const router = express.Router();

/** Admin-only guard */
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied: admin only' });
  next();
};

// ─── Module Guard ─────────────────────────────────────────────────────────────
router.use(checkModuleAccess('documents'));

router.use(varifyToken, requireAdmin);


// ── Field-config Dynamic Document Generator routes ───────────────────────────
router.get('/template-config/library', documentConfigController.getFieldLibrary);
router.get('/template-config/:type', documentConfigController.getTemplateConfig);
router.put('/template-config/:type', documentConfigController.saveTemplateConfig);
router.get('/new/:type/:studentId', documentConfigController.getNewDocumentContext);
router.post('/generated', documentConfigController.createGeneratedDocument);
router.get('/generated/:id', documentConfigController.getGeneratedDocument);

// ── Existing document CRUD ───────────────────────────────────────────────────
router.get('/:type/:studentId',      documentController.getDocument);
router.post('/',                     documentController.createDocument);
router.put('/:id',                   documentController.updateDocument);
router.post('/lock/:id',             documentController.lockDocument);
router.post('/unlock/:id',           documentController.unlockDocument);

module.exports = router;
