import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class InternalAuthGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const queryParams = request.query;
        return queryParams?.internalSecret === process.env["INTERNAL_ENDPOINT_PASSWORD"];
    }
}
