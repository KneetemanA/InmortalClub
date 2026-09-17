import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema, changePasswordSchema } from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

// Rutas públicas
router.post('/login', validate(loginSchema), authController.login.bind(authController));

// Rutas protegidas
router.post('/register', authMiddleware, validate(registerSchema), authController.register.bind(authController));
router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword.bind(authController));
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));

export default router;