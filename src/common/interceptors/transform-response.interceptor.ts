import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    statusCode: number;
    message?: string;
    data: T;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || HttpStatus.OK;

        return next.handle().pipe(
            map((data) => {
                if (data && typeof data === 'object' && 'success' in data) {
                    return data;
                }

                return {
                    success: statusCode >= 200 && statusCode < 300,
                    statusCode,
                    data: data || null,
                };
            }),
        );
    }
}

