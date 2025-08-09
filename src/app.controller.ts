import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({
    status: 200,
    description: 'Returns a hello message',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/protected')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Access protected endpoint with Supabase session token',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns success message with authenticated user info',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'AuthGuard works 🎉' },
        authenticated_user: {
          type: 'object',
          description: 'User information from JWT token',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async protected(@Req() req) {
    return {
      message: 'AuthGuard works 🎉',
      authenticated_user: req.user,
    };
  }
}
