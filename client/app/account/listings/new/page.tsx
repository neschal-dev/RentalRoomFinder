import { ListingForm } from "@/components/listing-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewListingPage() {
  return (
    <>
      <PageHeader
        title="Post a place"
        description="Add the details renters will see. You can edit them later."
      />
      <ListingForm />
    </>
  );
}
