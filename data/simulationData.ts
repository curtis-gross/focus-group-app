  // Sample Products / Retail Items
export const SIMULATION_PRODUCTS = [
  "KitchenAid Professional 6-qt Stand Mixer: The ultimate culinary companion for everything from heavy dough to light meringues.",
  "Dyson V15 Detect Cordless Vacuum: HEPA filtration and laser illumination for a deep, intelligent clean of your entire home.",
  "Le Creuset 5.25-qt Signature Cast-Iron Deep Dutch Oven: Exceptional heat distribution and retention for chef-quality slow cooking and braising.",
  "Philosophy Amazing Grace 4-Piece Fragrance & Body Set: An award-winning scent that makes you feel amazingly clean and feminine.",

  // Home & Kitchen
  "Ninja Foodi 10-in-1 XL Pro Air Fry Oven: Professional-level roasting and air frying with True Surround Convection.",
  "Vitaminex Professional Series Explorian Blender: Create everything from smoothies to hot soups with commercial-grade power.",
  "Shark HyperAIR Ionic Hair Dryer: Ultra-fast drying and styling for sleek, healthy-looking hair.",
  "Keurig K-Supreme Plus Smart Coffee Maker: Personalized brew settings for your perfect cup every time.",

  // Tech & Electronics
  "Apple iPad Air 10.9\" 64GB with Wi-Fi: Powerful, colorful, and versatile for work, play, and creativity.",
  "Bose QuietComfort Ultra Noise-Cancelling Headphones: Immersive audio and world-class quiet for an unmatched listening experience.",
  "Samsung 65\" Class Q70C QLED 4K Smart TV: Vibrant color and exceptional clarity for a cinematic home theater experience.",
  "Ring Video Doorbell Pro 2: Advanced security with 3D Motion Detection and Bird's Eye View.",

  // Beauty & Fashion
  "Estée Lauder Advanced Night Repair Synchronized Multi-Recovery Complex: The #1 serum for healthy-looking, youthful skin.",
  "Dooney & Bourke Pebble Grain Leather Domed Satchel: Timeless style and superior craftsmanship for everyday elegance.",
  "Barefoot Dreams CozyChic Lite Ribbed Cardigan: The gold standard for stylish comfort and lounging.",
  "IT Cosmetics Your Skin But Better CC+ Cream: Full-coverage foundation with anti-aging hydration and SPF 50+."
];

export const STANDARD_AUDIENCES = [
  {
    id: 'std_chef',
    name: 'Home Chef',
    personaName: 'Culinary Enthusiast',
    bio: 'Loves hosting dinner parties and experimenting with high-end kitchen gadgets. Always looks for the next Today\'s Special Value in cookware.',
    demographics: '35-55, Suburban, Foodie',
    details: {
      age: 42,
      job_title: 'Marketing Manager',
      bio: 'Believes the kitchen is the heart of the home. Follows top chefs and collects premium cookware.',
      income: 'Medium-High',
      lifestyle_tags: ['Home Cook', 'Entertaining', 'Quality-Conscious']
    },
    imagePrompt: 'A passionate home chef in a beautiful modern kitchen, plating a gourmet meal, warm natural lighting',
    imageUrl: '/images/personas/home_chef.jpg',
    isStandard: true
  },
  {
    id: 'std_tech_guru',
    name: 'Tech Enthusiast',
    personaName: 'Early Adopter',
    bio: 'Always has the latest smartphone and smart home gadgets. Interested in the intersection of design and technology.',
    demographics: '25-40, Urban, Tech-Savvy',
    details: {
      age: 32,
      job_title: 'Software Developer',
      bio: 'Wants a home that is fully automated and connected. Loves sleek, modern electronics.',
      income: 'High',
      lifestyle_tags: ['Gadget Lover', 'Smart Home', 'Innovative']
    },
    imagePrompt: 'A tech-savvy individual in a minimalist living room surrounded by smart home devices and high-end tech',
    imageUrl: '/images/personas/tech_guru.jpg',
    isStandard: true
  },
  {
    id: 'std_beauty_pro',
    name: 'Beauty Guru',
    personaName: 'Skincare Expert',
    bio: 'Dedicated to a multi-step skincare routine. Follows the latest beauty trends and trusts premium brands for visible results.',
    demographics: '25-50, Suburban/Urban, Beauty-Conscious',
    details: {
      age: 38,
      job_title: 'Esthetician',
      bio: 'Invests in high-quality skincare and makeup. Knows every ingredient and its benefits.',
      income: 'Medium',
      lifestyle_tags: ['Skincare Routine', 'Self-Care', 'Beauty Trends']
    },
    imagePrompt: 'A glowing, confident individual at a vanity mirror, applying a luxury serum, bright and soft lighting',
    imageUrl: '/images/personas/beauty_guru.jpg',
    isStandard: true
  },
  {
    id: 'std_gen_z',
    name: 'The Savvy Social Shopper',
    personaName: 'Gen-Z Trendsetter',
    bio: 'Digital native who shops almost exclusively via social media and live streams. Values authenticity, sustainable practices, and community-driven brands.',
    demographics: '18-24, Urban, Socially Active',
    details: {
      age: 21,
      job_title: 'Content Creator / Student',
      bio: 'I want shopping to be an experience, not a chore. If I can\'t shop it from my feed or see it live, it probably doesn\'t exist to me.',
      income: 'Lower-Medium',
      lifestyle_tags: ['Aesthetic-Driven', 'Social Commerce', 'Sustainability']
    },
    imagePrompt: 'A stylish Gen-Z individual recording a haul video in a sunlit, plant-filled apartment, high-end smartphone on a tripod',
    imageUrl: '/images/personas/gen_z_trendsetter.jpg',
    isStandard: true
  }
];
