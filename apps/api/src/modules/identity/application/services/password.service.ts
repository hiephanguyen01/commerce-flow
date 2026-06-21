import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON_OPTIONS: argon2.Options & {
  raw?: false;
} = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  private readonly dummyHashPromise = argon2.hash(
    randomBytes(32).toString('hex'),
    ARGON_OPTIONS,
  );

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async fakeVerify(password: string): Promise<void> {
    const dummyHash = await this.dummyHashPromise;

    await argon2.verify(dummyHash, password);
  }
}
