import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App') 
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/hello')
  @ApiOperation({ summary: 'Lấy lời chào từ server' }) 
  @ApiResponse({
    status: 200,
    description: 'Trả về lời chào từ AppService',
    schema: {
      example: { message: 'Hello World!' }, 
    },
  })
  getHello() {
    return { message: this.appService.getHello() };
  }
}
