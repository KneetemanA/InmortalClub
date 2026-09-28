import { Router } from 'express';
import { BenefitController } from '../controllers/benefit.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validate, validateIdParam } from '../middlewares/validate.middleware';
import { createBenefitSchema } from '../validations/benefit.validation';

const router = Router();
const benefitController = new BenefitController();

// Rutas de beneficios autenticadas para personal del gimnasio
router.use(authMiddleware);

router.get('/', benefitController.getBenefits.bind(benefitController));
router.post('/', roleMiddleware(['ADMIN']), validate(createBenefitSchema), benefitController.createBenefit.bind(benefitController));
router.get('/:id', validateIdParam('id'), benefitController.getBenefitById.bind(benefitController));

export default router;
