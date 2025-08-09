import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Comprehensive Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Easy Reals API')
    .setDescription(
      `# Easy Reals - Faceless Video Platform API
      
A comprehensive API for automated video content creation and social media management.

## Features
- **User Management**: User profiles, subscriptions, and authentication
- **Content Series**: Template-based video series with automation settings  
- **Video Generation**: AI-powered video creation and management
- **Social Integration**: Multi-platform social media account management
- **Analytics**: Comprehensive performance tracking and insights

## Authentication
This API uses JWT authentication with Supabase. Include your Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## API Versioning
All endpoints are versioned and prefixed with \`/api/v1/\`

## Error Handling
The API returns standardized error responses with appropriate HTTP status codes:
- \`400\` - Bad Request (validation errors)
- \`401\` - Unauthorized (authentication required)
- \`403\` - Forbidden (insufficient permissions)
- \`404\` - Not Found (resource doesn't exist)
- \`409\` - Conflict (resource already exists)
- \`422\` - Unprocessable Entity (validation errors)
- \`500\` - Internal Server Error

## Rate Limiting
API calls are rate limited to prevent abuse. Contact support if you need higher limits.

## Support
For technical support, visit our [GitHub Issues](https://github.com/example/easy-reals/issues)
      `,
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:3005', 'Development Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Supabase JWT session token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Users', 'User profile and account management')
    .addTag('Series', 'Content series and template management')
    .addTag('Videos', 'Video creation, generation, and management')
    .addTag('Social Accounts', 'Social media platform integrations')
    .addTag('Auth', 'Authentication and authorization')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api-docs', app, document, {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'arta',
      },
    },
    customSiteTitle: 'Easy Reals API Documentation',
    customfavIcon: 'https://easyreals.com/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    });
  });

  const port = process.env.PORT || 3005;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(
    `📖 API Documentation available at: http://localhost:${port}/api-docs`,
  );
  logger.log(`❤️  Health check available at: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
