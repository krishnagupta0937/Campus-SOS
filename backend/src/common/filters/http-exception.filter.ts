import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const requestId = request.headers?.['x-request-id'] || uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'object' && exResponse !== null) {
        const res = exResponse as any;
        code = res.code || res.error || this.statusToCode(status);
        message = res.message || exception.message;
        details = res.details;

        // Handle class-validator errors
        if (Array.isArray(res.message)) {
          code = 'VALIDATION_FAILED';
          message = 'Validation failed';
          details = res.message.map((msg: string) => ({ issue: msg }));
        }
      } else {
        code = this.statusToCode(status);
        message = exResponse as string;
      }
    } else if (exception instanceof Error) {
      console.error('Unhandled exception:', exception);
      message = 'An unexpected error occurred';
    }

    response.status(status).send({
      error: {
        code,
        message,
        details,
        request_id: requestId,
      },
    });
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400: return 'VALIDATION_FAILED';
      case 401: return 'UNAUTHENTICATED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 413: return 'FILE_TOO_LARGE';
      case 415: return 'UNSUPPORTED_MEDIA_TYPE';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'RATE_LIMITED';
      default: return 'INTERNAL_ERROR';
    }
  }
}
