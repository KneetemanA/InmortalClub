import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const auditController = new AuditController();

// Todas las rutas de auditoría requieren autenticación y rol ADMIN
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', auditController.getLogs.bind(auditController));

export default router;
