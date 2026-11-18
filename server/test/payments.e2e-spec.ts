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
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ClerkAuthGuard } from '../src/auth/guard/guard.guard.js';
import { env } from '../src/env.js';
import { EsewaClient } from '../src/payments/esewa.client.js';
import { KhaltiClient } from '../src/payments/khalti.client.js';
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

// Stands in for eSewa's server, so the tests need no network. Each test says what "eSewa" answers.
const fakeEsewa = { getStatus: vi.fn() };
const fakeKhalti = { initiate: vi.fn(), lookup: vi.fn() };

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
    .overrideProvider(EsewaClient)
    .useValue(fakeEsewa)
    .overrideProvider(KhaltiClient)
    .useValue(fakeKhalti)
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

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

// Builds the Base64 text eSewa puts in the address, signed the way eSewa signs it.
function esewaReply(
  transactionUuid: string,
  overrides: Record<string, string> = {},
  sign = true,
) {
  const names =
    'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names';
  const reply: Record<string, string> = {
    transaction_code: '000TEST1',
    status: 'COMPLETE',
    total_amount: '200',
    transaction_uuid: transactionUuid,
    product_code: env.esewa.productCode,
    signed_field_names: names,
    ...overrides,
  };
  const text = names
    .split(',')
    .map((name) => `${name}=${reply[name]}`)
    .join(',');
  reply['signature'] = sign
    ? createHmac('sha256', env.esewa.secretKey).update(text).digest('base64')
    : 'forged';
  return Buffer.from(JSON.stringify(reply)).toString('base64');
}

// Starts a payment through the real endpoint and returns what the test needs.
async function startPayment(clerkId: string) {
  const owner = await users.findOrCreateByClerkId(clerkId);
  const listing = await makeListing(owner.id, 'pending_payment');
  const response = await request(app.getHttpServer())
    .post('/payments/esewa/initiate')
    .set(as(clerkId))
    .send({ listingId: listing.id })
    .expect(200);
  return {
    listingId: listing.id,
    paymentId: response.body.paymentId as string,
    uuid: response.body.fields.transaction_uuid as string,
  };
}

const verify = (clerkId: string, data: string) =>
  request(app.getHttpServer())
    .post('/payments/esewa/verify')
    .set(as(clerkId))
    .send({ data });

const listingNow = (id: string) => db.orm.public.Listing.where({ id }).first();

describe('POST /payments/esewa/verify', () => {
  beforeEach(() => {
    fakeEsewa.getStatus.mockReset();
  });

  it('needs a login', async () => {
    await request(app.getHttpServer())
      .post('/payments/esewa/verify')
      .send({ data: 'abc' })
      .expect(401);
  });

  it('rejects text that is not a valid reply', async () => {
    await users.findOrCreateByClerkId('v_owner');
    await verify('v_owner', 'not base64 json').expect(400);
    await verify('v_owner', Buffer.from('{"a":1}').toString('base64')).expect(
      400,
    );
  });

  it('rejects a forged signature and never asks eSewa', async () => {
    const { uuid, listingId } = await startPayment('v_owner');
    await verify('v_owner', esewaReply(uuid, {}, false)).expect(400);
    expect(fakeEsewa.getStatus).not.toHaveBeenCalled();
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
  });

  it('rejects a reply whose fields were changed after signing', async () => {
    const { uuid } = await startPayment('v_owner');
    const good = JSON.parse(
      Buffer.from(esewaReply(uuid), 'base64').toString('utf8'),
    );
    good.total_amount = '1';
    const tampered = Buffer.from(JSON.stringify(good)).toString('base64');
    await verify('v_owner', tampered).expect(400);
  });

  it('returns 404 for a payment we never started', async () => {
    await users.findOrCreateByClerkId('v_owner');
    await verify(
      'v_owner',
      esewaReply('11111111-1111-4111-8111-111111111111'),
    ).expect(404);
  });

  it("refuses someone else's payment", async () => {
    const { uuid } = await startPayment('v_owner');
    await users.findOrCreateByClerkId('v_stranger');
    await verify('v_stranger', esewaReply(uuid)).expect(403);
  });

  it('activates the listing for 30 days when eSewa confirms the full amount', async () => {
    const { uuid, listingId, paymentId } = await startPayment('v_owner');
    fakeEsewa.getStatus.mockResolvedValue({
      status: 'COMPLETE',
      totalAmount: 200,
      refId: '0009ABC',
    });

    const response = await verify('v_owner', esewaReply(uuid)).expect(200);
    expect(response.body.paymentStatus).toBe('success');
    expect(response.body.listingStatus).toBe('active');

    // eSewa was asked about OUR stored amount.
    expect(fakeEsewa.getStatus).toHaveBeenCalledWith(uuid, 200);

    const listing = await listingNow(listingId);
    expect(listing?.status).toBe('active');
    const days =
      (new Date(listing!.expiresAt!.toString()).getTime() - Date.now()) /
      86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);

    const payment = await db.orm.public.Payment.where({
      id: paymentId,
    }).first();
    expect(payment?.status).toBe('success');
    expect(payment?.transactionId).toBe('0009ABC');
  });

  it('does nothing the second time (a page reload)', async () => {
    const { uuid, listingId } = await startPayment('v_owner');
    fakeEsewa.getStatus.mockResolvedValue({
      status: 'COMPLETE',
      totalAmount: 200,
      refId: '0009DEF',
    });
    await verify('v_owner', esewaReply(uuid)).expect(200);
    const first = (await listingNow(listingId))!.expiresAt!.toString();

    fakeEsewa.getStatus.mockClear();
    const again = await verify('v_owner', esewaReply(uuid)).expect(200);
    expect(again.body.paymentStatus).toBe('success');
    // No second call to eSewa, and the expiry did not move.
    expect(fakeEsewa.getStatus).not.toHaveBeenCalled();
    expect((await listingNow(listingId))!.expiresAt!.toString()).toBe(first);
  });

  it('does not activate when eSewa says a different amount was paid', async () => {
    const { uuid, listingId, paymentId } = await startPayment('v_owner');
    fakeEsewa.getStatus.mockResolvedValue({
      status: 'COMPLETE',
      totalAmount: 20,
      refId: 'X',
    });

    const response = await verify('v_owner', esewaReply(uuid)).expect(200);
    expect(response.body.paymentStatus).toBe('failed');
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
    expect(
      (await db.orm.public.Payment.where({ id: paymentId }).first())?.status,
    ).toBe('failed');
  });

  it('does not trust the reply when eSewa says the payment was not found', async () => {
    const { uuid, listingId } = await startPayment('v_owner');
    fakeEsewa.getStatus.mockResolvedValue({
      status: 'NOT_FOUND',
      totalAmount: null,
      refId: null,
    });

    // The reply says COMPLETE and is correctly signed, but eSewa's own answer wins.
    const response = await verify('v_owner', esewaReply(uuid)).expect(200);
    expect(response.body.paymentStatus).toBe('failed');
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
  });

  it('leaves everything as it is while eSewa says PENDING', async () => {
    const { uuid, listingId, paymentId } = await startPayment('v_owner');
    fakeEsewa.getStatus.mockResolvedValue({
      status: 'PENDING',
      totalAmount: 200,
      refId: null,
    });

    const response = await verify('v_owner', esewaReply(uuid)).expect(200);
    expect(response.body.paymentStatus).toBe('pending');
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
    expect(
      (await db.orm.public.Payment.where({ id: paymentId }).first())?.status,
    ).toBe('started');
  });

  it('answers 503 and changes nothing when eSewa cannot be reached', async () => {
    const { uuid, listingId, paymentId } = await startPayment('v_owner');
    fakeEsewa.getStatus.mockRejectedValue(new Error('network down'));

    await verify('v_owner', esewaReply(uuid)).expect(503);
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
    expect(
      (await db.orm.public.Payment.where({ id: paymentId }).first())?.status,
    ).toBe('started');
  });

  it('a paid-for listing can be paid again after it expired', async () => {
    const owner = await users.findOrCreateByClerkId('v_owner');
    const listing = await makeListing(owner.id, 'pending_payment');
    await db.orm.public.Listing.where({ id: listing.id }).update({
      status: 'expired',
    });
    const start = await request(app.getHttpServer())
      .post('/payments/esewa/initiate')
      .set(as('v_owner'))
      .send({ listingId: listing.id })
      .expect(200);
    fakeEsewa.getStatus.mockResolvedValue({
      status: 'COMPLETE',
      totalAmount: 200,
      refId: 'RENEW1',
    });

    await verify(
      'v_owner',
      esewaReply(start.body.fields.transaction_uuid),
    ).expect(200);
    expect((await listingNow(listing.id))?.status).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// Khalti
// ---------------------------------------------------------------------------

// Starts a Khalti payment through the real endpoint. The fake Khalti answers with a pidx.
async function startKhalti(clerkId: string) {
  const owner = await users.findOrCreateByClerkId(clerkId);
  const listing = await makeListing(owner.id, 'pending_payment');
  fakeKhalti.initiate.mockResolvedValueOnce({
    pidx: `pidx-${listing.id}`,
    paymentUrl: 'https://test-pay.khalti.com/?pidx=abc',
  });
  const response = await request(app.getHttpServer())
    .post('/payments/khalti/initiate')
    .set(as(clerkId))
    .send({ listingId: listing.id })
    .expect(200);
  const payment = await db.orm.public.Payment.where({
    id: response.body.paymentId,
  }).first();
  return {
    listingId: listing.id,
    paymentId: response.body.paymentId as string,
    purchaseOrderId: payment!.transactionUuid,
    pidx: `pidx-${listing.id}`,
  };
}

const verifyKhalti = (clerkId: string, purchaseOrderId: string) =>
  request(app.getHttpServer())
    .post('/payments/khalti/verify')
    .set(as(clerkId))
    .send({ purchaseOrderId });

describe('POST /payments/khalti/initiate', () => {
  beforeEach(() => {
    fakeKhalti.initiate.mockReset();
    fakeKhalti.lookup.mockReset();
  });

  it('needs a login', async () => {
    await request(app.getHttpServer())
      .post('/payments/khalti/initiate')
      .send({ listingId: '00000000-0000-4000-8000-000000000001' })
      .expect(401);
  });

  it('starts a payment on Khalti and returns the page address', async () => {
    const { paymentId, purchaseOrderId, pidx } = await startKhalti('k_owner');

    // Khalti was asked for NPR 200, in paisa, using OUR payment id.
    const call = fakeKhalti.initiate.mock.calls[0]![0];
    expect(call.amountPaisa).toBe(20000);
    expect(call.purchaseOrderId).toBe(purchaseOrderId);
    expect(call.returnUrl).toBe(`${env.clientUrl}/payment/khalti/success`);

    const saved = await db.orm.public.Payment.where({ id: paymentId }).first();
    expect(saved?.provider).toBe('khalti');
    expect(saved?.amount).toBe(200);
    expect(saved?.status).toBe('started');
    // Khalti's id is remembered so verify can use it.
    expect(saved?.transactionId).toBe(pidx);
  });

  it('ignores an amount sent by the browser', async () => {
    const owner = await users.findOrCreateByClerkId('k_owner');
    const listing = await makeListing(owner.id, 'pending_payment');
    await request(app.getHttpServer())
      .post('/payments/khalti/initiate')
      .set(as('k_owner'))
      .send({ listingId: listing.id, amount: 1 })
      .expect(400);
    expect(fakeKhalti.initiate).not.toHaveBeenCalled();
  });

  it("refuses someone else's listing and an active listing", async () => {
    const owner = await users.findOrCreateByClerkId('k_owner');
    await users.findOrCreateByClerkId('k_stranger');
    const pending = await makeListing(owner.id, 'pending_payment');
    const active = await makeListing(owner.id, 'active');
    const call = (clerkId: string, listingId: string) =>
      request(app.getHttpServer())
        .post('/payments/khalti/initiate')
        .set(as(clerkId))
        .send({ listingId });

    await call('k_stranger', pending.id).expect(403);
    await call('k_owner', active.id).expect(400);
    expect(fakeKhalti.initiate).not.toHaveBeenCalled();
  });

  it('answers 503 and marks the try failed when Khalti cannot start it', async () => {
    const owner = await users.findOrCreateByClerkId('k_owner');
    const listing = await makeListing(owner.id, 'pending_payment');
    fakeKhalti.initiate.mockRejectedValue(new Error('Khalti down'));

    await request(app.getHttpServer())
      .post('/payments/khalti/initiate')
      .set(as('k_owner'))
      .send({ listingId: listing.id })
      .expect(503);

    const payments = await db.orm.public.Payment.where({
      listingId: listing.id,
    }).all();
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe('failed');
    expect((await listingNow(listing.id))?.status).toBe('pending_payment');
  });
});

describe('POST /payments/khalti/verify', () => {
  beforeEach(() => {
    fakeKhalti.initiate.mockReset();
    fakeKhalti.lookup.mockReset();
  });

  it('needs a login', async () => {
    await request(app.getHttpServer())
      .post('/payments/khalti/verify')
      .send({ purchaseOrderId: '11111111-1111-4111-8111-111111111111' })
      .expect(401);
  });

  it('rejects an id that is not a UUID', async () => {
    await users.findOrCreateByClerkId('k_owner');
    await verifyKhalti('k_owner', 'abc').expect(400);
  });

  it('returns 404 for a payment we never started', async () => {
    await users.findOrCreateByClerkId('k_owner');
    await verifyKhalti(
      'k_owner',
      '11111111-1111-4111-8111-111111111111',
    ).expect(404);
  });

  it('does not accept an eSewa payment on the Khalti endpoint', async () => {
    const { uuid } = await startPayment('k_owner');
    await verifyKhalti('k_owner', uuid).expect(404);
  });

  it("refuses someone else's payment", async () => {
    const { purchaseOrderId } = await startKhalti('k_owner');
    await users.findOrCreateByClerkId('k_stranger');
    await verifyKhalti('k_stranger', purchaseOrderId).expect(403);
    expect(fakeKhalti.lookup).not.toHaveBeenCalled();
  });

  it('activates the listing for 30 days when Khalti confirms the full amount', async () => {
    const { purchaseOrderId, listingId, paymentId, pidx } =
      await startKhalti('k_owner');
    fakeKhalti.lookup.mockResolvedValue({
      status: 'Completed',
      totalAmount: 20000,
      transactionId: 'KH-TXN-1',
    });

    const response = await verifyKhalti('k_owner', purchaseOrderId).expect(200);
    expect(response.body.paymentStatus).toBe('success');
    expect(response.body.listingStatus).toBe('active');
    // Khalti was asked about the pidx WE stored.
    expect(fakeKhalti.lookup).toHaveBeenCalledWith(pidx);

    const listing = await listingNow(listingId);
    const days =
      (new Date(listing!.expiresAt!.toString()).getTime() - Date.now()) /
      86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);

    const payment = await db.orm.public.Payment.where({
      id: paymentId,
    }).first();
    expect(payment?.status).toBe('success');
    expect(payment?.transactionId).toBe('KH-TXN-1');
  });

  it('does nothing the second time (a page reload)', async () => {
    const { purchaseOrderId, listingId } = await startKhalti('k_owner');
    fakeKhalti.lookup.mockResolvedValue({
      status: 'Completed',
      totalAmount: 20000,
      transactionId: 'KH-TXN-2',
    });
    await verifyKhalti('k_owner', purchaseOrderId).expect(200);
    const first = (await listingNow(listingId))!.expiresAt!.toString();

    fakeKhalti.lookup.mockClear();
    const again = await verifyKhalti('k_owner', purchaseOrderId).expect(200);
    expect(again.body.paymentStatus).toBe('success');
    expect(fakeKhalti.lookup).not.toHaveBeenCalled();
    expect((await listingNow(listingId))!.expiresAt!.toString()).toBe(first);
  });

  it('does not activate when Khalti says a different amount was paid', async () => {
    const { purchaseOrderId, listingId, paymentId } =
      await startKhalti('k_owner');
    fakeKhalti.lookup.mockResolvedValue({
      status: 'Completed',
      totalAmount: 2000,
      transactionId: 'X',
    });

    const response = await verifyKhalti('k_owner', purchaseOrderId).expect(200);
    expect(response.body.paymentStatus).toBe('failed');
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
    expect(
      (await db.orm.public.Payment.where({ id: paymentId }).first())?.status,
    ).toBe('failed');
  });

  it('treats a cancelled payment as failed', async () => {
    const { purchaseOrderId, listingId } = await startKhalti('k_owner');
    fakeKhalti.lookup.mockResolvedValue({
      status: 'User canceled',
      totalAmount: null,
      transactionId: null,
    });

    const response = await verifyKhalti('k_owner', purchaseOrderId).expect(200);
    expect(response.body.paymentStatus).toBe('failed');
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
  });

  it('leaves everything as it is while Khalti says Pending', async () => {
    const { purchaseOrderId, listingId, paymentId } =
      await startKhalti('k_owner');
    fakeKhalti.lookup.mockResolvedValue({
      status: 'Pending',
      totalAmount: 20000,
      transactionId: null,
    });

    const response = await verifyKhalti('k_owner', purchaseOrderId).expect(200);
    expect(response.body.paymentStatus).toBe('pending');
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
    expect(
      (await db.orm.public.Payment.where({ id: paymentId }).first())?.status,
    ).toBe('started');
  });

  it('answers 503 and changes nothing when Khalti cannot be reached', async () => {
    const { purchaseOrderId, listingId, paymentId } =
      await startKhalti('k_owner');
    fakeKhalti.lookup.mockRejectedValue(new Error('network down'));

    await verifyKhalti('k_owner', purchaseOrderId).expect(503);
    expect((await listingNow(listingId))?.status).toBe('pending_payment');
    expect(
      (await db.orm.public.Payment.where({ id: paymentId }).first())?.status,
    ).toBe('started');
  });
});
