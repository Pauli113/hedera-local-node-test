import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy } from 'passport-http';
import { UserService } from './user.service';

@Injectable()
export class APIKeyAuth extends PassportStrategy(BasicStrategy, 'api-key') {
  constructor(private readonly userService: UserService) {
    super();
  }

  validate(username: string) {
    const user = this.userService.validateAPIKey(username);
    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
