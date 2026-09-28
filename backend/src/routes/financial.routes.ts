import { Router } from 'express';
import { FinancialController } from '../controllers/financial.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validate, validateIdParam, validateQuery } from '../middlewares/validate.middleware';
import { createIncomeSchema, createExpenseSchema, financialSummarySchema, periodSummarySchema, createCategorySchema } from '../validations/financial.validation';

const router = Router();
const financialController = new FinancialController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de categorías
router.get('/categories', financialController.getCategories.bind(financialController));
router.post('/categories', roleMiddleware(['ADMIN']), validate(createCategorySchema), financialController.createCategory.bind(financialController));

// Rutas de movimientos
router.get('/movements', financialController.getMovements.bind(financialController));

// Registrar ingresos y egresos
router.post('/income', validate(createIncomeSchema), financialController.createIncome.bind(financialController));
router.post('/expense', validate(createExpenseSchema), financialController.createExpense.bind(financialController));

// Reportes y balances
router.get('/summary', validateQuery(financialSummarySchema), financialController.getFinancialSummary.bind(financialController));
router.get('/periods', validateQuery(periodSummarySchema), financialController.getPeriodSummaries.bind(financialController));
router.get('/daily-balance', financialController.getDailyBalance.bind(financialController));
router.get('/monthly-balance', financialController.getMonthlyBalance.bind(financialController));

// Eliminar movimiento
router.delete('/movements/:id', validateIdParam('id'), financialController.deleteMovement.bind(financialController));

export default router;
