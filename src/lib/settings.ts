import "server-only";
import { cache } from "react";
import { db } from "./db";

/**
 * Owner-editable site content and configuration. Every value below is a
 * default used until the owner saves their own version in Admin › Website
 * Content or Admin › Settings. Copy marked "PLACEHOLDER" must be replaced
 * with verified, owner-approved text before launch.
 */
export const SETTING_DEFAULTS = {
  announcement: {
    enabled: true,
    messages: [
      "Hand-poured in small batches in Parañaque City",
      "Now available at Landmark Department Stores",
      "Private label and business scenting — inquire today",
    ],
  },
  hero: {
    headline: "Every Scent Tells a Story.",
    subheadline: "Discover the art of fragrance with Pabango de Manila.",
    primaryLabel: "Explore Collection",
    primaryHref: "/shop",
    secondaryLabel: "Discover Our Story",
    secondaryHref: "/our-story",
    videoUrl: "",
    posterImage: "/brand/aroma-diffuser-oils.jpg",
    tagline: "A Philosophy of Scented Living",
  },
  story: {
    heading: "The Art of Pabango de Manila",
    body: [
      "Pabango de Manila began in 2021, during the pandemic lockdown, in a 30-square-metre condo in Makati. Our founder, Jules, was struggling with sleepless nights and turned to candles for calm, only to find that store-bought candles were overpriced and lacked the scent throw she was looking for.",
      "Drawing on her background in science, she began experimenting in her small condo kitchen: wax types, fragrance ratios, wick performance. Countless test burns later, she arrived at her own blend, with an exceptional hot throw and a cleaner burn. What began as a remedy for sleepless nights became a homegrown fragrance house.",
      "Today every Pabango de Manila piece is formulated with laboratory discipline and finished by hand. Jules’s grounding in chemistry, from a 720-hour internship at the Philippine Textile Research Institute of the DOST, and her training in scent creation under certified perfumer Ms. Bernadette Lim guide a quality-controlled process, from pour temperature and wick testing to cure time and burn performance.",
      "We work with soy wax, beeswax and Philippine coconut oil, phthalate-free fragrance oils, and cotton or wooden wicks. Our gift boxes are made of paper maché by artisans in Pakil, Laguna, and our team includes working students, single parents and homemakers returning to work. We believe fragrance can do more than scent a room: it can soothe minds and transform lives.",
    ].join("\n\n"),
    image: "/brand/diffuser-oil-dropper.jpg",
    isPlaceholder: false,
  },
  eventScenting: {
    heading: "Create an Unforgettable Atmosphere",
    description: "Elevate meaningful moments with a thoughtfully curated fragrance experience.",
    intro: "Scent is the most powerful trigger of memory. Guests may forget the visuals, but never the scent.\n\nEvent Scentscaping by Pabango de Manila fills your venue with a signature fragrance from the PdM Scent Library, diffused by professional-grade scent machines that our team installs, monitors and removes. We don't just diffuse scent. We curate experiences.",
    steps: [
      "Share your event details through the inquiry form.",
      "We review your venue, guest count and preferred fragrance style.",
      "You receive a tailored quotation.",
      "Your date is secured once you accept the quotation and the ₱5,000 reservation fee is verified.",
    ],
    heroImage: "/brand/event-guests-rooftop.jpg",
    priceHeadline: "PHP 25,000",
    priceNote: "For every 500 sqm of venue coverage",
    reservation: [
      "Reservation & save-the-date fee of ₱5,000, paid upon confirmation to secure our services for your date.",
      "The reservation fee is non-refundable but deductible from the total package fee.",
      "For a proper quotation, send us your event date, venue size, number of guests and the exact venue address.",
    ],
    inclusions: [
      "Professional-grade scent machines strategically installed for the venue",
      "A signature fragrance from the PdM Scent Library",
      "On-site installation and setup before the event",
      "Continuous fragrance diffusion throughout the event",
      "Technical support team on standby",
      "Post-event removal and venue restoration",
    ],
    inclusionsNote: "Additional fees may apply for a custom scent and for events outside Metro Manila.",
    whyUs: [
      "Your milestone is our milestone | We treat every event as if it were our own, so fragrance becomes part of your most cherished memories.",
      "Available beyond Manila | Our ambiance fragrance services travel, from Metro Manila to venues abroad.",
      "Niche expertise since 2021 | Every scent is formulated and tested in our own studio.",
      "Premium service | End-to-end support: installation, monitoring and post-event restoration.",
    ],
    gallery: [
      "/brand/zeinab-harake-27th-birthday.jpg | Pabango de Manila scent styling at Zeinab Harake's 27th birthday",
      "/brand/event-guests-gift-bags.jpg | Guests with Pabango de Manila gift bags at the Urban Smiles Clinic thanksgiving",
      "/brand/perfect-mornings-display.jpg | Pabango de Manila display on the Perfect Mornings set",
    ],
  },
  // Homepage media sections. Image lines are "image URL | caption"; the owner will manage these
  // from the Media Library (upload) and Website Content (choose and caption) without code changes.
  spotlight: {
    eyebrow: "In the Spotlight",
    heading: "A Story Worth Sharing",
    intro: "Pabango de Manila began in 2021 in a small condo in Makati, when our founder Jules turned her background in science into hand-poured candles with a cleaner burn and a fuller scent throw. Since then, our story of homegrown Filipino fragrance has been shared on television and in print.",
    image: "/brand/perfect-mornings-set.jpg | Our founder with the host on the set of Perfect Mornings, One PH",
    secondaryImage: "/brand/perfect-mornings-display.jpg | Pabango de Manila candles, sprays and oils on the Perfect Mornings set",
    videoUrl: "", // the official interview link; the Watch button stays hidden until this is set
  },
  moments: {
    eyebrow: "Moments & Milestones",
    heading: "Where Fragrance Meets Memorable Moments",
    featured: "/brand/zeinab-harake-27th-birthday.jpg | The Pabango de Manila fragrance display at Zeinab Harake's 27th birthday celebration",
    gallery: [
      "/brand/event-guests-gift-bags.jpg | Guests with Pabango de Manila gift bags",
      "/brand/event-guests-rooftop.jpg | Celebrating with a guest at a Pabango de Manila event",
    ],
  },
  stockists: {
    heading: "Find Us In Store",
    body: "Pabango de Manila is available in the Home Fragrance section of Landmark Department Stores.",
    locations: ["Landmark Trinoma", "Landmark Makati", "Landmark BGC", "Landmark Alabang", "Landmark Nuvali"],
    shopeeUrl: "https://shopee.ph/pabangodemanila",
    tiktokUrl: "https://tinyurl.com/TiktokPDM",
  },
  business: {
    heading: "For Brands, Hotels & Businesses",
    intro: "Most of what we make today is for partners: private-label lines for local brands, signature scents for hotels and resorts, custom candles for cafés and restaurants, and corporate gifts. Every formula is developed and tested in our own studio.",
    services: [
      "Private & white label | Launch your own candle or home fragrance line. We handle formulation, production and packaging.",
      "Business scent subscription | A scent machine, atomizer and reed diffusers for your space, with monthly oil refills.",
      "Hotels & hospitality | Signature scents and room amenities for hotels, resorts and residences.",
      "Cafés & restaurants | Custom candles and hand soaps that carry your brand into every table.",
      "Corporate gifting | Gift sets in handmade paper maché boxes from Pakil, Laguna.",
    ],
  },
  instagram: {
    profileUrl: "https://www.instagram.com/pabangodemanila/",
    images: [
      { url: "/brand/room-linen-sprays.jpg", alt: "Pabango de Manila perfumed room and linen sprays", link: "" },
      { url: "/brand/zeinab-harake-27th-birthday.jpg", alt: "Pabango de Manila candle and spray table at an evening event", link: "" },
      { url: "/brand/aroma-diffuser-oils.jpg", alt: "Aroma diffuser oils in dropper bottles", link: "" },
      { url: "/brand/perfect-mornings-display.jpg", alt: "Pabango de Manila products on the Perfect Mornings set", link: "" },
      { url: "/brand/event-guests-gift-bags.jpg", alt: "Guests holding Pabango de Manila gift bags", link: "" },
      { url: "/brand/diffuser-oil-dropper.jpg", alt: "Aroma diffuser oil being added to a diffuser", link: "" },
    ] as { url: string; alt: string; link: string }[],
  },
  externalReviews: {
    // Genuine customer feedback received outside this website (e.g. Shopee), shown with its source.
    // One per line: name | source | product | quote
    items: [
      "Vince Ang | Shopee | Reed Diffuser | I tried your diffuser via Shopee, super happy. Finally got a product that you can actually smell. You know that it's effective.",
    ],
  },
  newsletter: {
    heading: "A Little Luxury in Your Inbox",
    body: "New scents, journal stories and private previews. No more than a few emails a month.",
    consentText: "I agree to receive marketing emails from Pabango de Manila. I can unsubscribe at any time.",
  },
  contact: {
    email: "PabangodeManila@gmail.com",
    phone: "+63 976 179 2148",
    address: "Raya Garden Condominium, Parañaque City",
    facebookUrl: "https://www.facebook.com/profile.php?id=61575979450251",
    instagramUrl: "https://www.instagram.com/pabangodemanila/",
    messengerUrl: "",
    tagline: "Fragrance That Lives a Lifetime",
    footerAbout: "A Filipino home fragrance and lifestyle house. Scented candles, room and linen sprays, reed diffusers and aroma diffuser oils, hand-poured in small batches in Parañaque City since 2021.",
  },
  policies: {
    shipping: "",
    returns: "",
    privacy: "",
    terms: "",
    faqs: [] as { q: string; a: string }[],
  },
  commerce: {
    onlinePaymentsEnabled: true,
    bankTransferEnabled: true,
    codEnabled: false,
    bankDetails: "",
    reservationMinutesOnline: 60,
    reservationHoursBankTransfer: 48,
    estimatedFeePercent: 0, // used only for profit estimates until the provider reports real fees
    lowStockEmail: "",
  },
  seo: {
    title: "Pabango de Manila",
    description: "Filipino artisanal home fragrance: soy candles, reed diffusers, room and linen sprays and aroma diffuser oils, hand-poured in Parañaque. Private label and business scenting available.",
    ogImage: "/brand/og-image.jpg",
    googleSiteVerification: "",
  },
};

export type Settings = typeof SETTING_DEFAULTS;
export type SettingKey = keyof Settings;

export const getSetting = cache(async <K extends SettingKey>(key: K): Promise<Settings[K]> => {
  const row = await db.siteSetting.findUnique({ where: { key } });
  const defaults = SETTING_DEFAULTS[key];
  if (!row) return defaults;
  try {
    return { ...defaults, ...(JSON.parse(row.value) as Partial<Settings[K]>) };
  } catch {
    return defaults;
  }
});

export async function saveSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  const json = JSON.stringify(value);
  await db.siteSetting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}
