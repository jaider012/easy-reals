import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({ description: 'Error message', example: 'Bad Request' })
  message: string | string[];

  @ApiPropertyOptional({ description: 'Detailed error description' })
  error?: string;

  @ApiPropertyOptional({ description: 'Request timestamp' })
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Request path' })
  path?: string;

  @ApiPropertyOptional({ description: 'Validation errors details' })
  details?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 422 })
  statusCode: 422;

  @ApiProperty({ description: 'Validation error message' })
  message: string[];

  @ApiProperty({ description: 'Error type', example: 'Validation Error' })
  error: 'Validation Error';

  @ApiProperty({ description: 'Detailed validation errors' })
  details: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}
