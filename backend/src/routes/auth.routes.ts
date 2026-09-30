import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema, changePasswordSchema, updateUserSchema } from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

// Rutas públicas
router.post('/login', validate(loginSchema), authController.login.bind(authController));

// Rutas protegidas
router.get('/users', authMiddleware, roleMiddleware(['ADMIN']), authController.listUsers.bind(authController));
router.patch('/users/:id', authMiddleware, roleMiddleware(['ADMIN']), validate(updateUserSchema), authController.updateUser.bind(authController));
router.delete('/users/:id', authMiddleware, roleMiddleware(['ADMIN']), authController.deleteUser.bind(authController));
router.post('/register', authMiddleware, roleMiddleware(['ADMIN']), validate(registerSchema), authController.register.bind(authController));
router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword.bind(authController));
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));

export default router;
