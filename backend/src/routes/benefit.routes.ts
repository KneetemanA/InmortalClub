import { Router } from 'express';
import { BenefitController } from '../controllers/benefit.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validate, validateIdParam } from '../middlewares/validate.middleware';
import { createBenefitSchema, updateBenefitSchema } from '../validations/benefit.validation';

const router = Router();
const benefitController = new BenefitController();

// Rutas de beneficios autenticadas para personal del gimnasio
router.use(authMiddleware);

router.get('/', benefitController.getBenefits.bind(benefitController));
router.post('/', roleMiddleware(['ADMIN']), validate(createBenefitSchema), benefitController.createBenefit.bind(benefitController));
router.patch('/:id', roleMiddleware(['ADMIN']), validateIdParam('id'), validate(updateBenefitSchema), benefitController.updateBenefit.bind(benefitController));
router.delete('/:id', roleMiddleware(['ADMIN']), validateIdParam('id'), benefitController.deleteBenefit.bind(benefitController));
router.get('/:id', validateIdParam('id'), benefitController.getBenefitById.bind(benefitController));

export default router;
