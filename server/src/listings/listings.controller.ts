import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorator/current-user.decorator.js';
import { ClerkAuthGuard } from '../auth/guard/guard.guard.js';
import type { LocalUser } from '../auth/types/local-user.type.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { SearchListingsDto } from './dto/search-listings.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { ListingsService } from './listings.service.js';

// Every route here starts with /listings.
@Controller('listings')
export class ListingsController {
  constructor(
    @Inject(ListingsService) private readonly listings: ListingsService,
  ) {}

  // GET /listings?city=Banepa&maxPrice=15000&sort=price_asc   (public)
  @Get()
  search(@Query() query: SearchListingsDto) {
    return this.listings.search(query);
  }

  // GET /listings/mine   (login needed)
  // Must stay above ":id", or "mine" would be read as an id.
  @Get('mine')
  @UseGuards(ClerkAuthGuard)
  findMine(@CurrentUser() user: LocalUser) {
    return this.listings.findMine(user);
  }

  // GET /listings/:id   (public)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listings.findPublic(id);
  }

  // POST /listings   (login needed)
  @Post()
  @UseGuards(ClerkAuthGuard)
  create(@CurrentUser() user: LocalUser, @Body() body: CreateListingDto) {
    return this.listings.create(user, body);
  }

  // PATCH /listings/:id   (login needed, owner only)
  @Patch(':id')
  @UseGuards(ClerkAuthGuard)
  update(
    @CurrentUser() user: LocalUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateListingDto,
  ) {
    return this.listings.update(user, id, body);
  }

  // DELETE /listings/:id   (login needed, owner only)
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(ClerkAuthGuard)
  async remove(
    @CurrentUser() user: LocalUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listings.remove(user, id);
  }
}
