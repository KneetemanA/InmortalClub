import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'InmortalGym API',
      version: '1.0.0',
      description: 'API para la gestión de gimnasio InmortalGym',
      contact: {
        name: 'InmortalGym',
        email: 'info@inmortal-gym.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Auth
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@gym.com' },
            password: { type: 'string', format: 'password', example: '123456' },
          },
          required: ['email', 'password'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                token: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
        // Member
        CreateMemberRequest: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'Juan' },
            lastName: { type: 'string', example: 'Pérez' },
            dni: { type: 'string', example: '12345678' },
            phone: { type: 'string', example: '1234567890' },
            email: { type: 'string', format: 'email', example: 'juan@email.com' },
            birthDate: { type: 'string', format: 'date', example: '1990-01-01' },
            planId: { type: 'string' },
            benefitId: { type: 'string' },
            paymentMethod: { type: 'string', enum: ['CASH', 'TRANSFER', 'MIXED'] },
          },
          required: ['firstName', 'lastName', 'dni', 'phone', 'planId', 'paymentMethod'],
        },
        MemberResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                dni: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
                enrollmentDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        // Payment
        CreatePaymentRequest: {
          type: 'object',
          properties: {
            memberId: { type: 'string' },
            planId: { type: 'string' },
            paymentMethod: { type: 'string', enum: ['CASH', 'TRANSFER', 'MIXED'] },
            appliedBenefitId: { type: 'string' },
          },
          required: ['memberId', 'planId', 'paymentMethod'],
        },
        // Financial
        CreateIncomeRequest: {
          type: 'object',
          properties: {
            categoryId: { type: 'string' },
            amount: { type: 'number', example: 15000 },
            description: { type: 'string', example: 'Venta de bebidas' },
            movementDate: { type: 'string', format: 'date' },
          },
          required: ['categoryId', 'amount'],
        },
        CreateExpenseRequest: {
          type: 'object',
          properties: {
            categoryId: { type: 'string' },
            amount: { type: 'number', example: 50000 },
            description: { type: 'string', example: 'Pago de alquiler' },
            movementDate: { type: 'string', format: 'date' },
          },
          required: ['categoryId', 'amount'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Buscar anotaciones en las rutas
};

export const swaggerSpec = swaggerJsdoc(options);