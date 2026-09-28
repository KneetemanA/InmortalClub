import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate, validateIdParam } from '../middlewares/validate.middleware';
import { createPaymentSchema, renewPlanSchema, cancelPaymentSchema } from '../validations/payment.validation';

const router = Router();
const paymentController = new PaymentController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas principales
router.get('/', paymentController.getPayments.bind(paymentController));
router.post('/', validate(createPaymentSchema), paymentController.createPayment.bind(paymentController));

// Estadísticas
router.get('/stats', paymentController.getPaymentStats.bind(paymentController));

// Miembros con pagos vencidos y próximos a vencer
router.get('/overdue', paymentController.getMembersWithOverduePayments.bind(paymentController));
router.get('/upcoming', paymentController.getUpcomingExpirations.bind(paymentController));

// Rutas con ID
router.get('/:id/member', validateIdParam('id'), paymentController.getMemberPayments.bind(paymentController));
router.get('/:id/status', validateIdParam('id'), paymentController.checkMemberPaymentStatus.bind(paymentController));
router.post('/:id/renew', validateIdParam('id'), validate(renewPlanSchema), paymentController.renewPlan.bind(paymentController));
router.patch('/:id/cancel', validateIdParam('id'), validate(cancelPaymentSchema), paymentController.cancelPayment.bind(paymentController));

export default router;