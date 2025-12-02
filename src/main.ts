import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Dating App API')
      .setDescription('API documentation for Dating App - Complete flow: Signup → Login → Update Profile')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth', // This name must match the @ApiBearerAuth() decorator
      )
      .addTag('Auth', 'Authentication endpoints - Login, Refresh Token')
      .addTag('User', 'User management - Signup (OTP), Get/Update Profile')
      .addTag('Profile', 'Profile management - Separate profile operations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Keep authorization when refresh page
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

  }

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
