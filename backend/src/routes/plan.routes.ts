import { Router } from 'express';
import { PlanController } from '../controllers/plan.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validate, validateIdParam } from '../middlewares/validate.middleware';
import { createPlanSchema, updatePlanSchema } from '../validations/plan.validation';

const router = Router();
const planController = new PlanController();

// Rutas de lectura: autenticadas para personal del gimnasio
router.use(authMiddleware);

router.get('/', planController.getPlans.bind(planController));
router.get('/:id', validateIdParam('id'), planController.getPlanById.bind(planController));

// Rutas de escritura y modificación: solo ADMIN
router.post('/', roleMiddleware(['ADMIN']), validate(createPlanSchema), planController.createPlan.bind(planController));
router.put('/:id', roleMiddleware(['ADMIN']), validateIdParam('id'), validate(updatePlanSchema), planController.updatePlan.bind(planController));
router.patch('/:id/toggle', roleMiddleware(['ADMIN']), validateIdParam('id'), planController.togglePlanStatus.bind(planController));

export default router;
