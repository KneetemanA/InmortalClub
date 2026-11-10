import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSaleSchema } from '../validations/sale.validation';

// Recepción carga ventas como ingresos, sin acceso al panel ni a los totales de Finanzas.
const router = Router();
const saleController = new SaleController();

router.use(authMiddleware, roleMiddleware(['ADMIN', 'RECEPTIONIST']));

router.get('/categories', saleController.getCategories.bind(saleController));
router.get('/mine', saleController.getMyTodaySales.bind(saleController));
router.post('/', validate(createSaleSchema), saleController.createSale.bind(saleController));

export default router;
