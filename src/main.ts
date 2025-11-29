import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WebsocketAdapter } from './websockets/websocket.adapter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors()
  // patchNestJsSwagger()
  const config = new DocumentBuilder()
    .setTitle('Nest example')
    .setDescription('The cats API description')
    .setVersion('1.0').addBearerAuth().addApiKey({
      name: 'authorization',
      type: 'apiKey',
      in: 'headers'
      
    }, 'payment-api-key')
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, cleanupOpenApiDoc(documentFactory), {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  const websocketAdapter = new WebsocketAdapter(app)
  await websocketAdapter.connectToRedis()
  app.useWebSocketAdapter(websocketAdapter)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

// 636