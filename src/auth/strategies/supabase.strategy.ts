import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
  public constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromHeader('authorization'),
        // Custom extractor for Supabase session cookie format
        (req) => {
          if (req.headers.cookie) {
            const cookies = req.headers.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'sb-dyfvtuxmimsufvsshozi-auth-token') {
                try {
                  // Extract the access_token from the base64 encoded cookie
                  const decodedCookie = Buffer.from(value, 'base64').toString();
                  const sessionData = JSON.parse(decodedCookie);
                  return sessionData.access_token;
                } catch (error) {
                  console.error(
                    'Error parsing Supabase session cookie:',
                    error,
                  );
                  return null;
                }
              }
            }
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<any> {
    return payload;
  }

  authenticate(req) {
    super.authenticate(req);
  }
}
