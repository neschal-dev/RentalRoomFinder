export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
   
      <main>{children}</main>
    </div>
  );
}