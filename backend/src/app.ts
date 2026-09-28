import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import './types';

// Importar rutas
import authRoutes from './routes/auth.routes';
import memberRoutes from './routes/member.routes';
import paymentRoutes from './routes/payment.routes';
import financialRoutes from './routes/financial.routes';
import dashboardRoutes from './routes/dashboard.routes';
import planRoutes from './routes/plan.routes';
import benefitRoutes from './routes/benefit.routes';
import auditRoutes from './routes/audit.routes';

const app: Express = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/benefits', benefitRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// En Render, el backend también publica la versión compilada de React.
const frontendDist = path.resolve(__dirname, '../../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/health' || !req.accepts('html')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
  });
});

// Middleware de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

// Iniciar servidor
const PORT = env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Swagger: http://localhost:${PORT}/api-docs`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`👥 Members: http://localhost:${PORT}/api/members`);
  console.log(`💳 Payments: http://localhost:${PORT}/api/payments`);
  console.log(`💰 Financial: http://localhost:${PORT}/api/financial`);
  console.log(`📈 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`📋 Plans: http://localhost:${PORT}/api/plans`);
  console.log(`🎁 Benefits: http://localhost:${PORT}/api/benefits`);
  console.log(`🛡️ Audit: http://localhost:${PORT}/api/audit`);
});

export default app;
