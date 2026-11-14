import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and } from '@prisma/orm-postgres/orm-client';
import type { LocalUser } from '../auth/types/local-user.type.js';
import { db } from '../prisma/db.js';
import { UsersService } from '../users/users.service.js';
import type { CreateListingDto } from './dto/create-listing.dto.js';
import type { SearchListingsDto } from './dto/search-listings.dto.js';
import type { UpdateListingDto } from './dto/update-listing.dto.js';
import type { WithFacilityLinks } from './interfaces/with-facility-links.interface.js';
import {
  DEFAULT_PAGE_SIZE,
  LISTING_DURATION_DAYS,
  MY_LISTINGS_LIMIT,
} from './listings.constants.js';

// Makes text safe to put inside a LIKE pattern: "50%" must not mean "50 and anything".
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// The moment, in `days` days from now, when a listing stops being shown.
function expiryFromNow(days: number) {
  return Temporal.Now.instant().add({ hours: days * 24 });
}

@Injectable()
export class ListingsService {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(user: LocalUser, input: CreateListingDto) {
    const facilityIds = [...new Set(input.facilityIds ?? [])];
    await this.assertFacilitiesExist(facilityIds);

    // The free first post needs a verified phone number. Clerk is the source of truth for that,
    // so we ask it before opening the database transaction (a network call should not hold one open).
    const phoneVerified = await this.isPhoneVerified(user);
    const mayUseFreePost = !user.freePostUsed && phoneVerified;

    const listingId = await db.transaction(async (tx) => {
      // Claim the free post. The UPDATE only matches while freePostUsed is still false,
      // so if two requests arrive together, only one of them wins.
      let isFree = false;
      if (mayUseFreePost) {
        const claimed = await tx.orm.public.User.where((u) =>
          and(u.id.eq(user.id), u.freePostUsed.eq(false)),
        ).update({ freePostUsed: true });
        isFree = claimed !== null;
      }

      const listing = await tx.orm.public.Listing.create({
        ownerId: user.id,
        title: input.title,
        description: input.description,
        propertyType: input.propertyType,
        bedrooms: input.bedrooms,
        sizeSqft: input.sizeSqft ?? null,
        furnishing: input.furnishing ?? 'none',
        parking: input.parking ?? 'none',
        smokingAllowed: input.smokingAllowed ?? false,
        alcoholAllowed: input.alcoholAllowed ?? false,
        petsAllowed: input.petsAllowed ?? false,
        rentPrice: input.rentPrice,
        city: input.city,
        area: input.area,
        latitude: input.latitude,
        longitude: input.longitude,
        availableFrom: Temporal.PlainDate.from(input.availableFrom),
        // A free post goes live at once. Otherwise the listing waits for payment,
        // and the payment module sets status "active" and the expiry date.
        status: isFree ? 'active' : 'pending_payment',
        expiresAt: isFree ? expiryFromNow(LISTING_DURATION_DAYS) : null,
      });

      for (const facilityId of facilityIds) {
        await tx.orm.public.ListingFacility.create({
          listingId: listing.id,
          facilityId,
        });
      }

      const media = input.media ?? [];
      for (const [index, item] of media.entries()) {
        await tx.orm.public.ListingMedia.create({
          listingId: listing.id,
          url: item.url,
          mediaType: item.mediaType,
          sortOrder: index,
        });
      }

      return listing.id;
    });

    return this.getFull(listingId);
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  // Public search page. Only listings that are active and not expired.
  async search(query: SearchListingsDto) {
    // Missing query values fall back to defaults.
    const sort = query.sort ?? 'newest';
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        'minPrice must not be greater than maxPrice',
      );
    }

    const now = Temporal.Now.instant();

    const filtered = db.orm.public.Listing.where((l) => {
      const conditions = [l.status.eq('active'), l.expiresAt.gt(now)];

      if (query.city) conditions.push(l.city.eq(query.city));
      if (query.area)
        conditions.push(l.area.ilike(`%${escapeLike(query.area)}%`));
      if (query.propertyType)
        conditions.push(l.propertyType.eq(query.propertyType));
      if (query.minPrice !== undefined)
        conditions.push(l.rentPrice.gte(query.minPrice));
      if (query.maxPrice !== undefined)
        conditions.push(l.rentPrice.lte(query.maxPrice));
      if (query.bedrooms !== undefined)
        conditions.push(l.bedrooms.gte(query.bedrooms));
      if (query.furnishing) conditions.push(l.furnishing.eq(query.furnishing));
      if (query.parking) conditions.push(l.parking.eq(query.parking));
      // "?petsAllowed=true" means "must allow pets". "false" adds no filter,
      // because a listing that allows pets is still fine for someone without a pet.
      if (query.petsAllowed) conditions.push(l.petsAllowed.eq(true));
      if (query.smokingAllowed) conditions.push(l.smokingAllowed.eq(true));
      if (query.alcoholAllowed) conditions.push(l.alcoholAllowed.eq(true));

      return and(...conditions);
    });

    const { total } = await filtered.aggregate((a) => ({ total: a.count() }));

    // The id is the last sort key so listings with equal price or time keep a stable order
    // between pages.
    const items = await filtered
      .orderBy(
        sort === 'price_asc'
          ? [(l) => l.rentPrice.asc(), (l) => l.id.asc()]
          : sort === 'price_desc'
            ? [(l) => l.rentPrice.desc(), (l) => l.id.asc()]
            : [(l) => l.createdAt.desc(), (l) => l.id.asc()],
      )
      // Each card shows only the first photo.
      .include('media', (m) => m.orderBy((x) => x.sortOrder.asc()).limit(1))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();

    return {
      items: items.map(({ media, ...listing }) => ({
        ...listing,
        cover: media[0] ?? null,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // One listing page for the public. Hidden, expired and removed listings look like they do not exist.
  async findPublic(id: string) {
    const now = Temporal.Now.instant();
    const found = await db.orm.public.Listing.where((l) =>
      and(l.id.eq(id), l.status.eq('active'), l.expiresAt.gt(now)),
    ).first();

    if (!found) {
      throw new NotFoundException('Listing not found');
    }
    return this.getFull(id);
  }

  // Everything the logged-in user has posted, in every status except removed.
  async findMine(user: LocalUser) {
    const rows = await db.orm.public.Listing.where((l) =>
      and(l.ownerId.eq(user.id), l.status.neq('removed')),
    )
      .orderBy([(l) => l.createdAt.desc(), (l) => l.id.asc()])
      .include('media', (m) => m.orderBy((x) => x.sortOrder.asc()))
      .include('facilities', (f) => f.include('facility'))
      .limit(MY_LISTINGS_LIMIT)
      .all();

    return rows.map((row) => this.toView(row));
  }

  // -------------------------------------------------------------------------
  // Update / delete (owner only)
  // -------------------------------------------------------------------------

  async update(user: LocalUser, id: string, input: UpdateListingDto) {
    await this.assertOwner(user, id);

    const facilityIds = input.facilityIds
      ? [...new Set(input.facilityIds)]
      : undefined;
    if (facilityIds) {
      await this.assertFacilitiesExist(facilityIds);
    }

    // Only the fields the owner actually sent. Things like status or fair price are not in the
    // DTO, so the validation step rejects them before they get here.
    const {
      facilityIds: _facilityIds,
      media,
      availableFrom,
      ...fields
    } = input;
    // The validation step can leave unsent fields as undefined. Keep only the real values.
    const sent = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    const changes = {
      ...sent,
      ...(availableFrom !== undefined && {
        availableFrom: Temporal.PlainDate.from(availableFrom),
      }),
    };

    await db.transaction(async (tx) => {
      if (Object.keys(changes).length > 0) {
        // Owner id is in the filter too, so even a bug above cannot touch someone else's listing.
        await tx.orm.public.Listing.where((l) =>
          and(l.id.eq(id), l.ownerId.eq(user.id)),
        ).update(changes);
      }

      // Sending a new list replaces the old one. Leaving it out keeps the old one.
      if (facilityIds) {
        await tx.orm.public.ListingFacility.where({
          listingId: id,
        }).deleteAll();
        for (const facilityId of facilityIds) {
          await tx.orm.public.ListingFacility.create({
            listingId: id,
            facilityId,
          });
        }
      }

      if (media) {
        await tx.orm.public.ListingMedia.where({ listingId: id }).deleteAll();
        for (const [index, item] of media.entries()) {
          await tx.orm.public.ListingMedia.create({
            listingId: id,
            url: item.url,
            mediaType: item.mediaType,
            sortOrder: index,
          });
        }
      }
    });

    return this.getFull(id);
  }

  // "Delete" keeps the row and marks it removed. Payments and reports still point at it.
  async remove(user: LocalUser, id: string) {
    await this.assertOwner(user, id);

    await db.orm.public.Listing.where((l) =>
      and(l.id.eq(id), l.ownerId.eq(user.id)),
    ).update({
      status: 'removed',
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  // 404 when the listing does not exist (or was removed), 403 when it belongs to someone else.
  private async assertOwner(user: LocalUser, id: string) {
    const listing = await db.orm.public.Listing.where((l) =>
      and(l.id.eq(id), l.status.neq('removed')),
    ).first();

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.ownerId !== user.id) {
      throw new ForbiddenException('You can only change your own listings');
    }
  }

  private async assertFacilitiesExist(facilityIds: string[]) {
    if (facilityIds.length === 0) return;

    const found = await db.orm.public.Facility.where((f) =>
      f.id.in(facilityIds),
    ).all();
    if (found.length !== facilityIds.length) {
      throw new BadRequestException('One or more facilityIds do not exist');
    }
  }

  private async isPhoneVerified(user: LocalUser): Promise<boolean> {
    try {
      return await this.users.refreshPhoneVerified(user);
    } catch {
      // Clerk could not be reached. Do not guess: answering "not verified" would quietly push
      // the user into paying for a post that should have been free.
      throw new ServiceUnavailableException(
        'Could not check your phone verification right now. Please try again.',
      );
    }
  }

  // The listing with its photos and facility names.
  private async getFull(id: string) {
    const row = await db.orm.public.Listing.where({ id })
      .include('media', (m) => m.orderBy((x) => x.sortOrder.asc()))
      .include('facilities', (f) => f.include('facility'))
      .first();

    if (!row) {
      throw new NotFoundException('Listing not found');
    }
    return this.toView(row);
  }

  // Turns the join rows into a plain list: facilities: [{ id, name }].
  private toView<Row extends WithFacilityLinks>(row: Row) {
    return {
      ...row,
      facilities: row.facilities.flatMap((link) =>
        link.facility ? [link.facility] : [],
      ),
    };
  }
}
