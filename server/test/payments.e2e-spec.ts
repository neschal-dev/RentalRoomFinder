import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  Inject,
  Injectable,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ClerkAuthGuard } from '../src/auth/guard/guard.guard.js';
import { env } from '../src/env.js';
import { db } from '../src/prisma/db.js';
import { UsersService } from '../src/users/users.service.js';

if (!/_test\b/.test(env.databaseUrl)) {
  throw new Error(
    'Refusing to run: DATABASE_URL must point at a database whose name ends in "_test".',
  );
}

// Stands in for ClerkAuthGuard: the "x-test-clerk-id" header says who is calling.
@Injectable()
class FakeAuthGuard implements CanActivate {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const clerkId = req.headers['x-test-clerk-id'];
    if (!clerkId) throw new UnauthorizedException('Please sign in');
    req.currentUser = await this.users.findOrCreateByClerkId(String(clerkId));
    return true;
  }
}

const as = (clerkId: string) => ({ 'x-test-clerk-id': clerkId });

let app: INestApplication;
let users: UsersService;

async function wipe() {
  await db.orm.public.Payment.where((p) => p.id.isNotNull()).deleteAll();
  await db.orm.public.ListingMedia.where((m) => m.id.isNotNull()).deleteAll();
  await db.orm.public.ListingFacility.where((f) =>
    f.listingId.isNotNull(),
  ).deleteAll();
  await db.orm.public.Listing.where((l) => l.id.isNotNull()).deleteAll();
  await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
}

// A listing straight in the database, with the status the test needs.
async function makeListing(
  ownerId: string,
  status: 'pending_payment' | 'active',
) {
  return db.orm.public.Listing.create({
    ownerId,
    title: 'Room for payment tests',
    description: 'A room used only by the payment tests.',
    propertyType: 'room',
    bedrooms: 1,
    rentPrice: 8000,
    city: 'Banepa',
    area: 'Banepa Bazaar',
    latitude: 27.6298,
    longitude: 85.5218,
    availableFrom: Temporal.PlainDate.from('2026-12-01'),
    status,
  });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ClerkAuthGuard)
    .useClass(FakeAuthGuard)
    .compile();

  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  users = moduleRef.get(UsersService);
  await wipe();
});

afterAll(async () => {
  await wipe();
  await app.close();
});

describe('POST /payments/esewa/initiate', () => {
  it('needs a login', async () => {
    await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .send({ listingId: '00000000-0000-4000-8000-000000000001' })
      .expect(401);
  });

  it('returns a signed eSewa form for a listing waiting for payment', async () => {
    const owner = await users.findOrCreateByClerkId('pay_owner');
    const listing = await makeListing(owner.id, 'pending_payment');

    const response = await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('pay_owner'))
      .send({ listingId: listing.id })
      .expect(200);

    const { fields, formUrl, paymentId } = response.body;
    expect(formUrl).toBe(env.esewa.formUrl);
    // The server decided the amount, not the browser.
    expect(fields.total_amount).toBe('200');
    expect(fields.amount).toBe('200');
    expect(fields.product_code).toBe(env.esewa.productCode);
    expect(fields.tax_amount).toBe('0');
    expect(fields.signed_field_names).toBe(
      'total_amount,transaction_uuid,product_code',
    );

    // The signature is what eSewa will recompute on its side.
    const expected = createHmac('sha256', env.esewa.secretKey)
      .update(
        `total_amount=200,transaction_uuid=${fields.transaction_uuid},product_code=${env.esewa.productCode}`,
      )
      .digest('base64');
    expect(fields.signature).toBe(expected);

    // A payment record exists, still "started".
    const saved = await db.orm.public.Payment.where({ id: paymentId }).first();
    expect(saved?.status).toBe('started');
    expect(saved?.amount).toBe(200);
    expect(saved?.transactionUuid).toBe(fields.transaction_uuid);
  });

  it('uses a new transaction id on every try', async () => {
    const owner = await users.findOrCreateByClerkId('pay_owner');
    const listing = await makeListing(owner.id, 'pending_payment');
    const call = () =>
      request(app.getHttpServer())
        .post('/payments/esewa/initiate')
        .set(as('pay_owner'))
        .send({ listingId: listing.id })
        .expect(200);

    const first = await call();
    const second = await call();
    expect(first.body.fields.transaction_uuid).not.toBe(
      second.body.fields.transaction_uuid,
    );
  });

  it('ignores an amount sent by the browser', async () => {
    const owner = await users.findOrCreateByClerkId('pay_owner');
    const listing = await makeListing(owner.id, 'pending_payment');

    await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('pay_owner'))
      .send({ listingId: listing.id, amount: 1 })
      .expect(400); // unknown field, rejected by the validation pipe
  });

  it("refuses someone else's listing", async () => {
    const owner = await users.findOrCreateByClerkId('pay_owner');
    await users.findOrCreateByClerkId('pay_stranger');
    const listing = await makeListing(owner.id, 'pending_payment');

    await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('pay_stranger'))
      .send({ listingId: listing.id })
      .expect(403);
  });

  it('refuses a listing that is already active', async () => {
    const owner = await users.findOrCreateByClerkId('pay_owner');
    const listing = await makeListing(owner.id, 'active');

    await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('pay_owner'))
      .send({ listingId: listing.id })
      .expect(400);
  });

  it('returns 404 for a listing that does not exist', async () => {
    await users.findOrCreateByClerkId('pay_owner');
    await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('pay_owner'))
      .send({ listingId: '00000000-0000-4000-8000-000000000099' })
      .expect(404);
  });

  it('rejects a listing id that is not a UUID', async () => {
    await users.findOrCreateByClerkId('pay_owner');
    await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('pay_owner'))
      .send({ listingId: 'abc' })
      .expect(400);
  });
});
