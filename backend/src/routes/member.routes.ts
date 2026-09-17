import { Router } from 'express';
import { MemberController } from '../controllers/member.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate, validateIdParam } from '../middlewares/validate.middleware';
import { createMemberSchema, updateMemberSchema } from '../validations/member.validation';

const router = Router();
const memberController = new MemberController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas principales
router.get('/', memberController.getActiveMembers.bind(memberController));
router.post('/', validate(createMemberSchema), memberController.createMember.bind(memberController));

// Búsqueda y estadísticas
router.get('/search', memberController.searchMembers.bind(memberController));
router.get('/stats', memberController.getMemberStats.bind(memberController));

// Rutas con ID
router.get('/:id', validateIdParam('id'), memberController.getMemberById.bind(memberController));
router.put('/:id', validateIdParam('id'), validate(updateMemberSchema), memberController.updateMember.bind(memberController));
router.patch('/:id/deactivate', validateIdParam('id'), memberController.deactivateMember.bind(memberController));
router.patch('/:id/activate', validateIdParam('id'), memberController.activateMember.bind(memberController));
router.get('/:id/status', validateIdParam('id'), memberController.checkMemberStatus.bind(memberController));

export default router;