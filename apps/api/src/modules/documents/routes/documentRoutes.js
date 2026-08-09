const express = require('express');
const { varifyToken } = require('../../../core/security/authenticate');
const { checkModuleAccess } = require('../../../core/security/moduleGate');
const { uploadTemplateMemory } = require('../../../core/http/upload.disk');
const documentController = require('../controllers/documentController');
const documentConfigController = require('../controllers/documentConfigController');

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied: admin only' });
  next();
};

// checkModuleAccess reads req.schoolId, so it must run AFTER varifyToken sets it —
// mounted before, it hit its no-school-context escape and never gated anything
router.use(varifyToken, requireAdmin);
router.use(checkModuleAccess('documents'));

router.get('/template-config/library', documentConfigController.getFieldLibrary);
router.get('/template-config/:type', documentConfigController.getTemplateConfig);
router.put('/template-config/:type', documentConfigController.saveTemplateConfig);
router.get('/new/:type/:studentId', documentConfigController.getNewDocumentContext);
router.post('/generated', documentConfigController.createGeneratedDocument);
router.get('/generated/:id', documentConfigController.getGeneratedDocument);

// Every route below must stay above the '/:type/:studentId' catch-all: two-segment
// paths like '/templates/TC' match it first and would silently run getDocument
router.get('/templates/:type',           documentController.getTemplate);
router.post('/templates/upload-image',   uploadTemplateMemory.single('templateFile'), documentController.uploadTemplateImage);
router.put('/templates/:id/fields',      documentController.saveTemplateFields);
router.put('/templates/:id/layout',      documentController.saveTemplateLayout);
router.delete('/templates/:id',          documentController.deleteTemplate);

router.post('/generate/:studentId/:type', documentController.generateFromTemplate);
router.post('/generate-bulk/:type',       documentController.generateBulkFromTemplate);

router.get('/pdf/:id',                   documentController.downloadCertificatePdf);

router.get('/:type/:studentId',      documentController.getDocument);
router.post('/',                     documentController.createDocument);
router.put('/:id',                   documentController.updateDocument);
router.post('/lock/:id',             documentController.lockDocument);
router.post('/unlock/:id',           documentController.unlockDocument);

module.exports = router;
