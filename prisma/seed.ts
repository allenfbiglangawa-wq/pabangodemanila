/**
 * Seeds an empty database with:
 *  - the first owner account (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *  - the candidate categories from the brief (confirm with the owner)
 *  - the retail products and prices from the owner's business plan, with the
 *    scents and photos the owner supplied (candle and reed diffuser photos and
 *    scents still to come; stock counts still to be entered)
 *  - published Press & Events entries for the owner's verified features
 *  - the owner's photos registered in the Media Library
 * No reviews, orders, testimonials or business figures are created.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "owner@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Store Owner", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });

  // Categories and retail products from the owner's business plan (Table 12 price list),
  // with scent names and photos supplied by the owner.
  const categories = [
    { slug: "scented-candles", name: "Scented Candles", imageUrl: "/brand/candles/london-bloom.jpg", sortOrder: 1, description: "Hand-poured soy candles, cured for 3–7 days for a cleaner burn and fuller scent throw." },
    { slug: "room-linen-sprays", name: "Room & Linen Sprays", imageUrl: "/brand/room-linen-sprays.jpg", sortOrder: 2, description: "Phthalate-free perfumed sprays for rooms and linens." },
    { slug: "reed-diffusers", name: "Reed Diffusers", imageUrl: "/placeholders/diffuser.svg", sortOrder: 3, description: "Steady, flameless scent diffusion for any room." },
    { slug: "humidifier-oils", name: "Aroma Diffuser Oils", imageUrl: "/brand/aroma-diffuser-oils.jpg", sortOrder: 4, description: "Fragrance oils made for humidifiers and electric aroma diffusers." },
    { slug: "gift-sets", name: "Gift Sets", imageUrl: "/placeholders/giftbox.svg", sortOrder: 5, description: "Gift sets in handmade paper maché boxes from Pakil, Laguna." },
  ];
  for (const c of categories) {
    const existing = await db.category.findUnique({ where: { slug: c.slug } });
    if (!existing) await db.category.create({ data: c });
    // Swap in real photos (and the new name) only where the owner has not changed them.
    else if (existing.imageUrl?.startsWith("/placeholders/") && !c.imageUrl.startsWith("/placeholders/"))
      await db.category.update({ where: { id: existing.id }, data: { imageUrl: c.imageUrl, name: existing.name === "Humidifier Oils" ? c.name : existing.name, description: c.description } });
  }
  // Retire categories and sample products from earlier seeds.
  await db.category.updateMany({ where: { slug: { in: ["fine-fragrances", "home-diffusers", "gift-collections"] } }, data: { isActive: false } });
  await db.product.updateMany({ where: { slug: { startsWith: "sample-" } }, data: { status: "ARCHIVED" } });
  const cat = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  // Stock counts are not in the plan: products start at 0 unless SEED_DEMO_STOCK=1 (demo only).
  const demoStock = process.env.SEED_DEMO_STOCK === "1" ? 20 : 0;
  type V = { sku: string; name: string; price: number };
  type P = {
    slug: string; name: string; cat: string; images: { url: string; alt: string }[]; featured?: boolean; best?: boolean;
    description: string; variants: V[]; retire?: string[];
    family?: string; top?: string; heart?: string; base?: string; shippingInfo?: string;
  };
  const spray = (code: string, scent: string): V => ({ sku: `PDM-SPRY85-${code}`, name: `${scent} · 85 ml`, price: 24800 });
  const oil = (code: string, scent: string): V => ({ sku: `PDM-OIL30-${code}`, name: `${scent} · 30 ml`, price: 28800 });
  const products: P[] = [
    { slug: "scented-soy-candle", name: "Scented Soy Candle", cat: "scented-candles", featured: true, best: true,
      images: [{ url: "/placeholders/candle.svg", alt: "Scented Soy Candle (placeholder image)" }],
      variants: [{ sku: "PDM-CNDL-150", name: "150 g", price: 31800 }],
      description: "Our classic candle, hand-poured in small batches with a soy wax blend, Philippine coconut oil and phthalate-free fragrance oils, then cured for 3–7 days for a cleaner burn and a fuller scent throw." },
    { slug: "perfumed-room-and-linen-spray", name: "Perfumed Room & Linen Spray", cat: "room-linen-sprays", featured: true, best: true,
      images: [{ url: "/brand/room-linen-sprays.jpg", alt: "Pabango de Manila perfumed room and linen sprays in six scents" }],
      variants: [spray("LAV", "Provence Lavender"), spray("LEM", "Capri Lemon"), spray("TEA", "Imperial Tea"), spray("RIV", "French Riviera"), spray("MNT", "Mint Blanc"), spray("STR", "Starry Night")],
      retire: ["PDM-SPRY-85"],
      description: "A phthalate-free perfumed mist for rooms, linens and fabrics, formulated for long-lasting freshness. 85 ml, in six signature scents." },
    { slug: "reed-diffuser", name: "Reed Diffuser", cat: "reed-diffusers", featured: true,
      images: [{ url: "/placeholders/diffuser.svg", alt: "Reed Diffuser (placeholder image)" }],
      variants: [{ sku: "PDM-DIFF-100", name: "100 ml", price: 44800 }],
      description: "Flameless home fragrance crafted for steady, even scent diffusion, tested in our studio for consistent throw." },
    { slug: "aroma-diffuser-oil", name: "Aroma Diffuser Oil", cat: "humidifier-oils", featured: true,
      images: [
        { url: "/brand/aroma-diffuser-oils.jpg", alt: "Pabango de Manila aroma diffuser oils in dropper bottles" },
        { url: "/brand/diffuser-oil-dropper.jpg", alt: "Aroma diffuser oil being added to a diffuser" },
      ],
      variants: [oil("TEA", "Imperial Tea"), oil("ZEN", "Zen Forest"), oil("PEP", "Peppermint Blanc"), oil("HIN", "Hinoki Wood")],
      description: "Fragrance oil for humidifiers and electric aroma diffusers, blended in-house for a clean, consistent scent. 30 ml dropper bottle." },
  ];
  // Perfumed Candle collection, from the owner's Instagram captions. Each is a 300 g wood-wick candle;
  // the price is the business plan's 300 g candle price (₱498) until the owner confirms otherwise.
  // Notes are listed exactly as on each label; the top/heart/base split is ours.
  const candle = (code: string, slug: string, name: string, family: string, top: string, heart: string, base: string, description: string, featured = false): P => ({
    slug, name, cat: "scented-candles", featured, family, top, heart, base, description,
    images: [{ url: `/brand/candles/${slug.replace(/-perfumed-candle$/, "")}.jpg`, alt: `${name} perfumed candle by Pabango de Manila` }],
    variants: [{ sku: `PDM-PC300-${code}`, name: "300 g", price: 49800 }],
    shippingInfo: "Hand-poured in Manila with a wooden wick. Trim the wick and let the wax melt to the edges on the first burn.",
  });
  products.push(
    candle("OAS", "oasis-perfumed-candle", "Oasis", "White Floral", "White Lily", "Jasmine, Tuberose", "Sandalwood, Musk",
      "Inspired by the elegance of five-star suites and the quiet stillness of spa mornings, Oasis wraps your senses in delicate white florals, creamy sandalwood and sheer musk.\n\nIt smells like peace: the feeling of stepping into a grand hotel lobby, leaving the noise behind, and simply breathing. Mood: hotel luxury, inner calm, soft power.", true),
    candle("LDN", "london-bloom-perfumed-candle", "London Bloom", "Fruity Floral", "English Pear", "Freesia, Rose", "Soft Woods, Amber",
      "The first drop in our collection of scent stories. Inspired by quiet English gardens, crisp English pear and freesia in full bloom.\n\nRomantic, elegant and softly unforgettable, a scent that lingers like a beautiful memory.", true),
    candle("TEA", "imperial-tea-perfumed-candle", "Imperial Tea", "Tea & Citrus", "Lemon Zest", "Oolong Tea, White Tea", "Amber",
      "For anyone who romanticises their mornings with a hot cup of oolong. It opens with a light zest of lemon, then settles into calming oolong and white tea: soft, clean and comforting.\n\nImagine stepping into a quiet Japanese tea house, the air still, the floor warm, and a cup of oolong waiting for you.", true),
    candle("HIN", "hinoki-wood-perfumed-candle", "Hinoki Wood", "Woody", "Bergamot", "Cypress, Cedarwood", "Oakmoss, Amber",
      "A grounded blend of cedarwood, cypress, oakmoss, bergamot and amber, inspired by the serene depth of Japanese hinoki trees. It evokes the stillness of ancient forests and slow, intentional living.\n\nFor those who seek quiet moments in a noisy world: presence, in fragrance form.", true),
    candle("ZEN", "zen-forest-perfumed-candle", "Zen Forest", "Green", "Lime, Fresh Bamboo", "Chrysanthemum", "Moss",
      "A reimagined version of our bestselling Fresh Bamboo from the Classic Collection, now with a deeper, greener soul. Imagine walking through a bamboo forest after rain: crisp, quiet and grounding.\n\nNotes of fresh bamboo, soft moss, lime and chrysanthemum bring clarity, lightness and peace into any space. Perfect for everyday rituals, post-shower moments, or whenever you need to breathe."),
    candle("PRV", "provence-lavender-perfumed-candle", "Provence Lavender", "Aromatic Herbal", "Bergamot", "Lavender, Rosemary", "Chamomile",
      "Your passport to Southern France: calm, romantic and herbal. Think golden hour in a French lavender field, a silk robe, a book in one hand and a glass of wine in the other.\n\nYou don't need to fly to Provence. Light this and let your space say: je suis délicate, but I'm in control."),
    candle("TOB", "tuscan-orange-blossom-perfumed-candle", "Tuscan Orange Blossom", "Floral Citrus", "Orange Blossom", "Jasmine, Freesia", "Soft Woods, Musk",
      "Inspired by the warm breeze of a sunlit garden in the heart of Tuscany. A radiant medley of orange blossom, jasmine and freesia wrapped in soft woods and musk, a scent that wears like a silk dress on a summer afternoon.\n\nJoyful, sun-kissed and feminine."),
    candle("CDM", "cafe-de-manila-perfumed-candle", "Café de Manila", "Gourmand", "Coffee Bean", "Almond", "Vanilla Bean",
      "Always a favourite, formerly called French Vanilla and now lovingly renamed Café de Manila. It captures the cozy moment of grinding beans in the morning, the first pour of espresso, and the sweet comfort of vanilla in the air.\n\nWarm, familiar and grounded, just like your favourite neighbourhood café. Perfect for slow mornings, journaling or late-night thoughts."),
  );
  // The generic "Luxe Scented Soy Candle" (300 g) is replaced by the named Perfumed Candles above.
  await db.product.updateMany({ where: { slug: "luxe-scented-soy-candle", images: { every: { url: { startsWith: "/placeholders/" } } } }, data: { status: "ARCHIVED" } });

  // The earlier "Humidifier Oil" listing is replaced by "Aroma Diffuser Oil".
  await db.product.updateMany({ where: { slug: "humidifier-oil" }, data: { status: "ARCHIVED" } });
  await db.productVariant.updateMany({ where: { sku: "PDM-HOIL-30" }, data: { isActive: false } });

  for (const p of products) {
    let product = await db.product.findUnique({ where: { slug: p.slug }, include: { images: true } });
    if (!product) {
      product = await db.product.create({
        data: {
          slug: p.slug, name: p.name, description: p.description, categoryId: cat[p.cat], status: "ACTIVE",
          isFeatured: Boolean(p.featured), isBestseller: Boolean(p.best),
          fragranceFamily: p.family, topNotes: p.top, heartNotes: p.heart, baseNotes: p.base, shippingInfo: p.shippingInfo,
          images: { create: p.images.map((img, i) => ({ ...img, sortOrder: i })) },
        },
        include: { images: true },
      });
    } else if (product.images.every((img) => img.url.startsWith("/placeholders/")) && !p.images[0].url.startsWith("/placeholders/")) {
      await db.productImage.deleteMany({ where: { productId: product.id } });
      await db.productImage.createMany({ data: p.images.map((img, i) => ({ ...img, productId: product!.id, sortOrder: i })) });
      if (product.description === p.description.replace(/ (85|30) ml.*$/, "")) await db.product.update({ where: { id: product.id }, data: { description: p.description } });
    }
    for (const [i, v] of p.variants.entries()) {
      if (await db.productVariant.findUnique({ where: { sku: v.sku } })) continue;
      const created = await db.productVariant.create({ data: { ...v, productId: product.id, stockOnHand: demoStock, lowStockThreshold: 5, sortOrder: i } });
      if (demoStock) {
        await db.inventoryMovement.create({ data: { variantId: created.id, type: "ADJUSTMENT", quantityChange: demoStock, previousOnHand: 0, newOnHand: demoStock, previousReserved: 0, newReserved: 0, reason: "DEMO stock from seed — replace with a real count" } });
      }
    }
    if (p.retire) await db.productVariant.updateMany({ where: { sku: { in: p.retire }, productId: product.id }, data: { isActive: false } });
  }

  if ((await db.shippingRule.count()) === 0) {
    await db.shippingRule.create({ data: { name: "PLACEHOLDER — set your shipping rates in Admin › Settings", region: null, fee: 0 } });
  }

  // Press & events from the owner's photos. An existing entry is only overwritten while it still
  // holds the original DRAFT text, so edits made in the admin are never lost.
  const press = [
    {
      slug: "perfect-mornings-one-ph", previousSlug: "tv5-interview", kind: "TV", sortOrder: 1, featureOnHome: true,
      title: "Negosyo Thursday on Perfect Mornings",
      programName: "Perfect Mornings with Cheryl Cosim, One PH",
      eventDate: null,
      description: "Our founder joined the Negosyo Thursday segment of Perfect Mornings with Cheryl Cosim on One PH to share how Pabango de Manila began and how each candle, spray and diffuser oil is made by hand.",
      coverImage: "/brand/perfect-mornings-set.jpg",
      images: [{ url: "/brand/perfect-mornings-display.jpg", caption: "Our candles, sprays and oils on the Perfect Mornings set" }],
    },
    {
      slug: "malaya-business-insight-success-in-scents", kind: "INTERVIEW", sortOrder: 2, featureOnHome: false,
      title: "“Success in Scents”",
      programName: "Malaya Business Insight",
      eventDate: new Date("2026-02-21T00:00:00+08:00"),
      description: "Pabango de Manila was featured in Malaya Business Insight's “Success in Scents”, published February 21, 2026.",
      coverImage: "/brand/malaya-business-insight.jpg",
      images: [],
    },
    {
      slug: "zeinab-harake-27th-birthday", kind: "EVENT", sortOrder: 3, featureOnHome: true,
      title: "Zeinab Harake's 27th Birthday",
      programName: null,
      eventDate: null,
      description: "A Pabango de Manila candle and fragrance display for guests at Zeinab Harake's 27th birthday celebration.",
      coverImage: "/brand/zeinab-harake-27th-birthday.jpg",
      images: [],
    },
    {
      slug: "urban-smiles-clinic-thanksgiving", previousSlug: "urban-smile-event", kind: "EVENT", sortOrder: 4, featureOnHome: true,
      title: "Urban Smiles Clinic Thanksgiving",
      programName: null,
      eventDate: null,
      description: "Pabango de Manila gift bags and a candle display for guests at the Urban Smiles Clinic thanksgiving celebration.",
      coverImage: "/brand/event-guests-gift-bags.jpg",
      images: [{ url: "/brand/events-collage.jpg", caption: "Moments from our recent events" }],
    },
  ];
  for (const { previousSlug, images, ...entry } of press) {
    const existing =
      (await db.pressEntry.findUnique({ where: { slug: entry.slug } })) ??
      (previousSlug ? await db.pressEntry.findUnique({ where: { slug: previousSlug } }) : null);
    if (existing && !existing.description.startsWith("DRAFT")) continue;
    const data = { ...entry, isPublished: true };
    const saved = existing ? await db.pressEntry.update({ where: { id: existing.id }, data }) : await db.pressEntry.create({ data });
    await db.pressImage.deleteMany({ where: { pressEntryId: saved.id } });
    if (images.length) await db.pressImage.createMany({ data: images.map((img, i) => ({ ...img, pressEntryId: saved.id, sortOrder: i })) });
  }

  // Register the owner's photos in the Media Library so they can be reused and re-captioned.
  const brandDir = path.join(process.cwd(), "public", "brand");
  if (fs.existsSync(brandDir)) {
    for (const filename of fs.readdirSync(brandDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
      const url = `/brand/${filename}`;
      if (await db.mediaAsset.findFirst({ where: { url } })) continue;
      const alt = filename.replace(/\.\w+$/, "").replace(/-/g, " ");
      await db.mediaAsset.create({ data: { url, filename, mimeType: filename.endsWith(".png") ? "image/png" : "image/jpeg", sizeBytes: fs.statSync(path.join(brandDir, filename)).size, alt } });
    }
  }

  console.log(`Seed complete. Admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
