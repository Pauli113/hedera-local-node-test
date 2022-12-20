import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class APIKeyAuthGuard extends AuthGuard('api-key') {}
