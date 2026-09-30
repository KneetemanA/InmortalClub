import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Todas las rutas requieren autenticación
router.use(authMiddleware, roleMiddleware(['ADMIN']));

// Dashboard principal
router.get('/', dashboardController.getDashboardStats.bind(dashboardController));

// Estadísticas rápidas (para header)
router.get('/quick', dashboardController.getQuickStats.bind(dashboardController));

export default router;