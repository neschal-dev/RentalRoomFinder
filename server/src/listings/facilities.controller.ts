import { Controller, Get, Inject } from '@nestjs/common';
import { ListingsService } from './listings.service.js';

// GET /facilities   (public) - the choices shown on the listing form.
@Controller('facilities')
export class FacilitiesController {
  constructor(
    @Inject(ListingsService) private readonly listings: ListingsService,
  ) {}

  @Get()
  findAll() {
    return this.listings.findFacilities();
  }
}
