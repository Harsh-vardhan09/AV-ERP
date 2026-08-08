import { page, pageWith } from '@shared/lib/lazyRoute';
import { ROLES } from '@shared/constants/roles';

const handle = { roles: [ROLES.ADMIN, ROLES.ADMISSION], module: 'documents' };

export const documentsRoutes = [
  { path: 'admin/documents', lazy: page(() => import('./pages/DocumentHub')), handle },
  {
    path: 'admin/documents/tc',
    lazy: pageWith(() => import('./pages/DocumentStudentList'), { documentType: 'TC', basePath: '/admin/documents/tc' }),
    handle,
  },
  {
    path: 'admin/documents/tc/:studentId',
    lazy: pageWith(() => import('./pages/NewDocumentForm'), { forcedType: 'TC' }),
    handle,
  },
  {
    path: 'admin/documents/migration',
    lazy: pageWith(() => import('./pages/DocumentStudentList'), { documentType: 'MIGRATION', basePath: '/admin/documents/migration' }),
    handle,
  },
  { path: 'admin/documents/migration/:studentId', lazy: page(() => import('./pages/MigrationCertificatePage')), handle },
  { path: 'admin/documents/template-config', lazy: page(() => import('./pages/TemplateConfigPage')), handle },
  { path: 'admin/documents/new/:type/:studentId', lazy: page(() => import('./pages/NewDocumentForm')), handle },
  { path: 'admin/documents/preview/:id', lazy: page(() => import('./pages/CertificatePreview')), handle },
];
