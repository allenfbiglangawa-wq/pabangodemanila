import { toggleWishlist } from "@/app/actions/wishlist";
import { HeartIcon } from "../Icons";

export function WishlistButton({ productId, wished, back = "/shop" }: { productId: string; wished: boolean; back?: string }) {
  return (
    <form action={toggleWishlist}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="back" value={back} />
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-pearl/90 backdrop-blur transition-colors hover:text-champagne-deep"
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
      >
        <HeartIcon className="h-4 w-4" filled={wished} />
      </button>
    </form>
  );
}
