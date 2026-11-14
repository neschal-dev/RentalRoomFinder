// A listing row as loaded from the database: facilities arrive as join rows,
// each pointing at the facility itself.
export interface WithFacilityLinks {
  facilities: Array<{ facility: { id: string; name: string } | null }>;
}
