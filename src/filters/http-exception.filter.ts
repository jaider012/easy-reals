import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../dto/common/error-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: ErrorResponseDto | ValidationErrorResponseDto;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle validation errors specifically
      if (
        status === HttpStatus.BAD_REQUEST &&
        this.isValidationError(exceptionResponse)
      ) {
        errorResponse = this.createValidationErrorResponse(
          exceptionResponse,
          request.url,
        );
      } else {
        errorResponse = this.createHttpErrorResponse(exception, request.url);
      }
    } else if (this.isPrismaError(exception)) {
      const prismaError = this.handlePrismaError(exception as any);
      status = prismaError.status;
      errorResponse = this.createGenericErrorResponse(
        prismaError.status,
        prismaError.message,
        'Database Error',
        request.url,
      );
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.createGenericErrorResponse(
        status,
        'Internal server error',
        'Internal Server Error',
        request.url,
      );

      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Log the error (except for 404s to avoid spam)
    if (status !== HttpStatus.NOT_FOUND) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${errorResponse.message}`,
        JSON.stringify({
          user: (request as any).user?.id,
          body: request.body,
          query: request.query,
          params: request.params,
        }),
      );
    }

    response.status(status).json(errorResponse);
  }

  private isValidationError(exceptionResponse: any): boolean {
    return (
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.every((msg: any) => typeof msg === 'string')
    );
  }

  private createValidationErrorResponse(
    exceptionResponse: any,
    path: string,
  ): ValidationErrorResponseDto {
    const messages = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message
      : [exceptionResponse.message];

    const details = messages.map((message: string) => {
      // Extract field name from validation message
      const fieldMatch = message.match(/^(\w+)\s+/);
      const field = fieldMatch ? fieldMatch[1] : 'unknown';

      return {
        field,
        message: message,
        value: undefined, // Could be enhanced to include the actual value
      };
    });

    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: messages,
      error: 'Validation Error',
      timestamp: new Date().toISOString(),
      path,
      details,
    };
  }

  private createHttpErrorResponse(
    exception: HttpException,
    path: string,
  ): ErrorResponseDto {
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const response = exceptionResponse as any;
      message = response.message || exception.message;
      error = response.error || exception.name;
    } else {
      message = exception.message;
      error = exception.name;
    }

    return {
      statusCode: exception.getStatus(),
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  private createGenericErrorResponse(
    statusCode: number,
    message: string,
    error: string,
    path: string,
  ): ErrorResponseDto {
    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  private isPrismaError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'PrismaClientKnownRequestError' ||
        exception.name === 'PrismaClientUnknownRequestError' ||
        exception.name === 'PrismaClientValidationError' ||
        exception.name === 'PrismaClientInitializationError')
    );
  }

  private handlePrismaError(error: any): { status: number; message: string } {
    switch (error.code) {
      case 'P2000':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The provided value for the column is too long',
        };
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${error.meta?.target || 'field'} already exists`,
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The change would violate the required relation constraint',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };
      case 'P2016':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Query interpretation error',
        };
      case 'P2021':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'The table does not exist in the current database',
        };
      case 'P2022':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'The column does not exist in the current database',
        };
      default:
        this.logger.error(
          `Unhandled Prisma error: ${error.code}`,
          error.message,
        );
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
        };
    }
  }
}
