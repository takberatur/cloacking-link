import type { RequestEvent } from '@sveltejs/kit';
import { ServerBase } from './server.js';
import { RedisClient } from './redis.js';
import { SessionService } from './session.js';

export class ServiceHelper extends ServerBase {
  public readonly dbService: InstanceType<typeof ServerBase>;
  public readonly sessionService: InstanceType<typeof SessionService>;
  public readonly redisService: InstanceType<typeof RedisClient>;
  constructor(event: RequestEvent) {
    super(event);
    this.dbService = new ServerBase(event);
    this.sessionService = new SessionService(event);
    this.redisService = new RedisClient(event);
  }
}