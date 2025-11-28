import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const method = request.method;
        const url = request.url;

        console.log(`[JwtAuthGuard] canActivate: ${method} ${url}`);

        if (!authHeader) {
            console.error(`[JwtAuthGuard] canActivate: No authorization header found for ${method} ${url}`);
            throw new UnauthorizedException('No authorization header found');
        }

        const [bearer, token] = authHeader.split(' ');

        if (bearer !== 'Bearer' || !token) {
            console.error(`[JwtAuthGuard] canActivate: Invalid authorization format for ${method} ${url}`);
            throw new UnauthorizedException('Invalid authorization format. Use: Bearer <token>');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_ACCESS_SECRET,
            });

            request.user = payload;
            console.log(`[JwtAuthGuard] canActivate: Token verified successfully for userId=${payload.userId}, ${method} ${url}`);
            return true;
        } catch (error) {
            console.error(`[JwtAuthGuard] canActivate: Token verification failed for ${method} ${url}:`, error);
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
