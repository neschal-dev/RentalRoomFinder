import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ClerkAuthGuard } from '../src/auth/guard/guard.guard.js';
import { env } from '../src/env.js';
import { db } from '../src/prisma/db.js';
import { UsersService } from '../src/users/users.service.js';

// These tests ERASE every table. Never point them at your real development database.
if (!/_test\b/.test(env.databaseUrl)) {
  throw new Error(
    'Refusing to run: DATABASE_URL must point at a database whose name ends in "_test".',
  );
}

// Stands in for ClerkAuthGuard. A test says who it is with the "x-test-clerk-id" header,
// and the guard loads (or creates) that user, exactly like the real guard does after Clerk.
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

let app: INestApplication;
let users: UsersService;
let facilityIds: { wifi: string; water: string };

// A listing that passes validation. Tests override the fields they care about.
function payload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Sunny room near Banepa bus park',
    description:
      'A clean, sunny room with a shared kitchen and a good water supply.',
    propertyType: 'room',
    bedrooms: 1,
    rentPrice: 8000,
    city: 'Banepa',
    area: 'Banepa Bazaar',
    latitude: 27.6298,
    longitude: 85.5218,
    availableFrom: '2026-12-01',
    ...overrides,
  };
}

// Makes sure a user exists. verified = has a verified phone number.
async function makeUser(clerkId: string, verified: boolean) {
  const user = await users.findOrCreateByClerkId(clerkId);
  if (verified) {
    await db.orm.public.User.where({ id: user.id }).update({
      phoneVerified: true,
    });
  }
  return user;
}

// Sort helper so sorted lists compare the same way every time.
const byText = (a: string, b: string) => a.localeCompare(b);

const as = (clerkId: string) => ({ 'x-test-clerk-id': clerkId });

// Empties the tables (children first because of the foreign keys).
async function wipe() {
  await db.orm.public.ListingMedia.where((m) => m.id.isNotNull()).deleteAll();
  await db.orm.public.ListingFacility.where((f) =>
    f.listingId.isNotNull(),
  ).deleteAll();
  await db.orm.public.Listing.where((l) => l.id.isNotNull()).deleteAll();
  await db.orm.public.Facility.where((f) => f.id.isNotNull()).deleteAll();
  await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ClerkAuthGuard)
    .useClass(FakeAuthGuard)
    .compile();

  app = moduleRef.createNestApplication();
  await app.init();
  users = moduleRef.get(UsersService);

  // Do not call the real Clerk API. "Phone verified" is whatever the database says.
  vi.spyOn(UsersService.prototype, 'refreshPhoneVerified').mockImplementation(
    async (user) => user.phoneVerified,
  );

  await wipe();
  const wifi = await db.orm.public.Facility.create({ name: 'WiFi' });
  const water = await db.orm.public.Facility.create({ name: '24h water' });
  facilityIds = { wifi: wifi.id, water: water.id };
});

afterAll(async () => {
  await app.close();
});

const http = () => request(app.getHttpServer());

describe('creating a listing', () => {
  it('rejects a visitor who is not logged in', async () => {
    await http().post('/listings').send(payload()).expect(401);
  });

  it('rejects bad data with a list of what is wrong', async () => {
    await makeUser('creator-validation', true);
    const res = await http()
      .post('/listings')
      .set(as('creator-validation'))
      .send(
        payload({
          rentPrice: 10,
          city: 'Pokhara',
          latitude: 5,
          status: 'active',
        }),
      )
      .expect(400);

    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain('rentPrice'); // too cheap
    expect(fields).toContain('city'); // not a supported city
    expect(fields).toContain('latitude'); // not in Nepal
    expect(JSON.stringify(res.body.errors)).toContain('status'); // owner may not set status
  });

  it('puts the first post of a verified user live for free', async () => {
    const user = await makeUser('creator-free', true);
    const res = await http()
      .post('/listings')
      .set(as('creator-free'))
      .send(
        payload({
          facilityIds: [facilityIds.wifi, facilityIds.water],
          media: [
            { url: 'https://example.com/a.jpg', mediaType: 'image' },
            { url: 'https://example.com/b.jpg', mediaType: 'image' },
          ],
        }),
      )
      .expect(201);

    expect(res.body.status).toBe('active');
    expect(res.body.ownerId).toBe(user.id);
    expect(res.body.availableFrom).toBe('2026-12-01');
    expect(
      res.body.facilities.map((f: { name: string }) => f.name).sort(byText),
    ).toEqual(['24h water', 'WiFi']);
    expect(res.body.media.map((m: { url: string }) => m.url)).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
    ]);

    // About 30 days from now.
    const days = (Date.parse(res.body.expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after?.freePostUsed).toBe(true);
  });

  it('makes the second post wait for payment', async () => {
    const res = await http()
      .post('/listings')
      .set(as('creator-free'))
      .send(payload({ title: 'Second property of the same owner' }))
      .expect(201);

    expect(res.body.status).toBe('pending_payment');
    expect(res.body.expiresAt).toBeNull();
  });

  it('does not use the free post for a user without a verified phone', async () => {
    const user = await makeUser('creator-unverified', false);
    const res = await http()
      .post('/listings')
      .set(as('creator-unverified'))
      .send(payload())
      .expect(201);

    expect(res.body.status).toBe('pending_payment');
    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after?.freePostUsed).toBe(false); // the free post is still there for later
  });

  it('gives the free post to only one of two simultaneous requests', async () => {
    await makeUser('creator-race', true);
    const [a, b] = await Promise.all([
      http()
        .post('/listings')
        .set(as('creator-race'))
        .send(payload({ title: 'Race listing one' })),
      http()
        .post('/listings')
        .set(as('creator-race'))
        .send(payload({ title: 'Race listing two' })),
    ]);

    expect([a.status, b.status]).toEqual([201, 201]);
    expect([a.body.status, b.body.status].sort(byText)).toEqual([
      'active',
      'pending_payment',
    ]);
  });

  it('answers 503 when Clerk cannot be reached, and creates nothing', async () => {
    await makeUser('creator-clerk-down', false);
    const before = await db.orm.public.Listing.aggregate((a) => ({
      total: a.count(),
    }));

    const spy = vi
      .spyOn(UsersService.prototype, 'refreshPhoneVerified')
      .mockRejectedValueOnce(new Error('clerk down'));
    await http()
      .post('/listings')
      .set(as('creator-clerk-down'))
      .send(payload())
      .expect(503);
    spy.mockClear();

    const after = await db.orm.public.Listing.aggregate((a) => ({
      total: a.count(),
    }));
    expect(after.total).toBe(before.total);
  });

  it('rejects a facility id that does not exist', async () => {
    await makeUser('creator-bad-facility', true);
    await http()
      .post('/listings')
      .set(as('creator-bad-facility'))
      .send(payload({ facilityIds: ['0b6f1f4e-8f58-4e2f-9d6e-5a2c2d1b7c11'] }))
      .expect(400);
  });
});

describe('searching and viewing', () => {
  // A small known set of listings, each by its own verified owner so each one is active.
  const seed = [
    {
      who: 'seed-1',
      title: 'Cheap Banepa room one',
      city: 'Banepa',
      area: 'Banepa Bazaar',
      rentPrice: 5000,
      propertyType: 'room',
      bedrooms: 1,
    },
    {
      who: 'seed-2',
      title: 'Mid Banepa flat two',
      city: 'Banepa',
      area: 'Dhulikhel Road',
      rentPrice: 12000,
      propertyType: 'flat',
      bedrooms: 2,
      petsAllowed: true,
    },
    {
      who: 'seed-3',
      title: 'Pricey Kathmandu house',
      city: 'Kathmandu',
      area: 'Baneshwor 100%',
      rentPrice: 40000,
      propertyType: 'house',
      bedrooms: 4,
      furnishing: 'full',
    },
    {
      who: 'seed-4',
      title: 'Bhaktapur flat four',
      city: 'Bhaktapur',
      area: 'Suryabinayak',
      rentPrice: 15000,
      propertyType: 'flat',
      bedrooms: 3,
    },
  ];
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    await wipe();
    // wipe() removed the facilities, so create them again and remember the new ids.
    const wifi = await db.orm.public.Facility.create({ name: 'WiFi' });
    const water = await db.orm.public.Facility.create({ name: '24h water' });
    facilityIds = { wifi: wifi.id, water: water.id };
    for (const item of seed) {
      const { who, ...rest } = item;
      await makeUser(who, true);
      const res = await http()
        .post('/listings')
        .set(as(who))
        .send(payload(rest))
        .expect(201);
      ids[who] = res.body.id;
      expect(res.body.status).toBe('active');
    }
    // One listing that is not live: it must never show up in public results.
    await makeUser('seed-pending', false);
    await http()
      .post('/listings')
      .set(as('seed-pending'))
      .send(payload({ title: 'Waiting for payment' }))
      .expect(201);
  });

  const titles = (res: request.Response) =>
    res.body.items.map((i: { title: string }) => i.title);

  it('lists only live listings, newest first, with page info', async () => {
    const res = await http().get('/listings').expect(200);
    expect(res.body.total).toBe(4);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(12);
    expect(res.body.totalPages).toBe(1);
    expect(titles(res)).toEqual([
      'Bhaktapur flat four',
      'Pricey Kathmandu house',
      'Mid Banepa flat two',
      'Cheap Banepa room one',
    ]);
  });

  it('filters by city', async () => {
    const res = await http().get('/listings?city=Banepa').expect(200);
    expect(res.body.total).toBe(2);
  });

  it('filters by price range and sorts by price', async () => {
    const res = await http()
      .get('/listings?minPrice=10000&maxPrice=20000&sort=price_desc')
      .expect(200);
    expect(titles(res)).toEqual(['Bhaktapur flat four', 'Mid Banepa flat two']);
  });

  it('filters by property type and bedrooms', async () => {
    const flats = await http().get('/listings?propertyType=flat').expect(200);
    expect(flats.body.total).toBe(2);
    const big = await http().get('/listings?bedrooms=3').expect(200);
    expect(titles(big).sort(byText)).toEqual([
      'Bhaktapur flat four',
      'Pricey Kathmandu house',
    ]);
  });

  it('filters by rules and furnishing', async () => {
    const pets = await http().get('/listings?petsAllowed=true').expect(200);
    expect(titles(pets)).toEqual(['Mid Banepa flat two']);
    const furnished = await http().get('/listings?furnishing=full').expect(200);
    expect(titles(furnished)).toEqual(['Pricey Kathmandu house']);
  });

  it('searches part of an area name, ignoring case', async () => {
    const res = await http().get('/listings?area=bazaar').expect(200);
    expect(titles(res)).toEqual(['Cheap Banepa room one']);
  });

  it('treats % in an area search as a normal character', async () => {
    const hit = await http()
      .get('/listings')
      .query({ area: '100%' })
      .expect(200);
    expect(titles(hit)).toEqual(['Pricey Kathmandu house']);
    const wildcard = await http()
      .get('/listings')
      .query({ area: '%' })
      .expect(200);
    expect(wildcard.body.total).toBe(1); // only the area that really contains a "%"
  });

  it('pages through results without repeats', async () => {
    const one = await http()
      .get('/listings?pageSize=3&page=1&sort=price_asc')
      .expect(200);
    const two = await http()
      .get('/listings?pageSize=3&page=2&sort=price_asc')
      .expect(200);
    expect(one.body.totalPages).toBe(2);
    expect(titles(one)).toEqual([
      'Cheap Banepa room one',
      'Mid Banepa flat two',
      'Bhaktapur flat four',
    ]);
    expect(titles(two)).toEqual(['Pricey Kathmandu house']);
  });

  it('rejects bad search parameters', async () => {
    await http().get('/listings?minPrice=9000&maxPrice=100').expect(400);
    await http().get('/listings?pageSize=500').expect(400);
    await http().get('/listings?city=Mars').expect(400);
  });

  it('shows one live listing to anyone', async () => {
    const res = await http().get(`/listings/${ids['seed-1']}`).expect(200);
    expect(res.body.title).toBe('Cheap Banepa room one');
  });

  it('hides a listing that is not live, and rejects ids that are not uuids', async () => {
    const pending = await db.orm.public.Listing.where({
      status: 'pending_payment',
    }).first();
    await http().get(`/listings/${pending!.id}`).expect(404);
    await http()
      .get('/listings/0b6f1f4e-8f58-4e2f-9d6e-5a2c2d1b7c11')
      .expect(404);
    await http().get('/listings/not-a-uuid').expect(400);
  });

  it('stops showing a listing once it has expired', async () => {
    await db.orm.public.Listing.where({ id: ids['seed-4'] }).update({
      expiresAt: Temporal.Now.instant().subtract({ hours: 1 }),
    });
    const res = await http().get('/listings').expect(200);
    expect(res.body.total).toBe(3);
    await http().get(`/listings/${ids['seed-4']}`).expect(404);
  });

  it('lists my own listings in every status, but not removed ones', async () => {
    await http().get('/listings/mine').expect(401);

    const mine = await http()
      .get('/listings/mine')
      .set(as('seed-pending'))
      .expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].status).toBe('pending_payment');

    const other = await http()
      .get('/listings/mine')
      .set(as('seed-1'))
      .expect(200);
    expect(other.body).toHaveLength(1);
    expect(other.body[0].title).toBe('Cheap Banepa room one');
  });
});

describe('editing and deleting', () => {
  let listingId: string;

  beforeAll(async () => {
    await makeUser('owner', true);
    await makeUser('stranger', true);
    const res = await http()
      .post('/listings')
      .set(as('owner'))
      .send(
        payload({
          title: 'Original title of the listing',
          facilityIds: [facilityIds.wifi],
        }),
      )
      .expect(201);
    listingId = res.body.id;
  });

  it('lets the owner change some fields and leaves the others alone', async () => {
    const before = await http().get(`/listings/${listingId}`).expect(200);

    const res = await http()
      .patch(`/listings/${listingId}`)
      .set(as('owner'))
      .send({
        title: 'A better title for the listing',
        rentPrice: 9500,
        availableFrom: '2027-01-15',
      })
      .expect(200);

    expect(res.body.title).toBe('A better title for the listing');
    expect(res.body.rentPrice).toBe(9500);
    expect(res.body.availableFrom).toBe('2027-01-15');
    // Untouched:
    expect(res.body.description).toBe(before.body.description);
    expect(res.body.city).toBe('Banepa');
    expect(res.body.status).toBe('active');
    expect(res.body.facilities.map((f: { name: string }) => f.name)).toEqual([
      'WiFi',
    ]);
    // The "last changed" time moved forward.
    expect(Date.parse(res.body.updatedAt)).toBeGreaterThan(
      Date.parse(before.body.updatedAt),
    );
  });

  it('replaces facilities and photos only when they are sent', async () => {
    const res = await http()
      .patch(`/listings/${listingId}`)
      .set(as('owner'))
      .send({
        facilityIds: [facilityIds.water],
        media: [{ url: 'https://example.com/new.jpg', mediaType: 'image' }],
      })
      .expect(200);

    expect(res.body.facilities.map((f: { name: string }) => f.name)).toEqual([
      '24h water',
    ]);
    expect(res.body.media.map((m: { url: string }) => m.url)).toEqual([
      'https://example.com/new.jpg',
    ]);

    const again = await http()
      .patch(`/listings/${listingId}`)
      .set(as('owner'))
      .send({ bedrooms: 2 })
      .expect(200);
    expect(again.body.facilities).toHaveLength(1); // not wiped by an unrelated edit
    expect(again.body.media).toHaveLength(1);
  });

  it('does not let the owner set status, owner or fair price', async () => {
    await http()
      .patch(`/listings/${listingId}`)
      .set(as('owner'))
      .send({ status: 'active' })
      .expect(400);
    await http()
      .patch(`/listings/${listingId}`)
      .set(as('owner'))
      .send({ ownerId: '0b6f1f4e-8f58-4e2f-9d6e-5a2c2d1b7c11' })
      .expect(400);
    await http()
      .patch(`/listings/${listingId}`)
      .set(as('owner'))
      .send({ fairPriceLabel: 'below' })
      .expect(400);
  });

  it('keeps strangers out', async () => {
    await http()
      .patch(`/listings/${listingId}`)
      .set(as('stranger'))
      .send({ rentPrice: 1000 })
      .expect(403);
    await http()
      .delete(`/listings/${listingId}`)
      .set(as('stranger'))
      .expect(403);
    await http()
      .patch(`/listings/${listingId}`)
      .send({ rentPrice: 1000 })
      .expect(401);

    const unchanged = await http().get(`/listings/${listingId}`).expect(200);
    expect(unchanged.body.rentPrice).toBe(9500);
  });

  it('answers 404 for a listing that does not exist', async () => {
    await http()
      .patch('/listings/0b6f1f4e-8f58-4e2f-9d6e-5a2c2d1b7c11')
      .set(as('owner'))
      .send({ rentPrice: 1000 })
      .expect(404);
  });

  it('removes a listing for the owner, and it vanishes everywhere', async () => {
    await http().delete(`/listings/${listingId}`).set(as('owner')).expect(204);

    await http().get(`/listings/${listingId}`).expect(404);
    const mine = await http()
      .get('/listings/mine')
      .set(as('owner'))
      .expect(200);
    expect(mine.body.map((l: { id: string }) => l.id)).not.toContain(listingId);
    await http().delete(`/listings/${listingId}`).set(as('owner')).expect(404); // already gone

    // The row is kept (marked removed), so payments and reports can still point at it.
    const row = await db.orm.public.Listing.where({ id: listingId }).first();
    expect(row?.status).toBe('removed');
  });
});
