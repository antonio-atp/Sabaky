/**
 * Demo catalogue for local development / staging. Product artwork is generated
 * by /demo-media/<Icon>-<hue>.svg (no third-party images).
 */

type Tr = { pt: string; es: string; fr: string; de: string; it: string };

export interface CategorySeed {
  slug: string;
  name: string;
  icon: string;
  hue: number;
  tr: Tr;
  children: { slug: string; name: string; icon: string; tr: Tr; seller: string }[];
}

export const CATEGORIES: CategorySeed[] = [
  {
    slug: "electronics", name: "Electronics", icon: "Smartphone", hue: 165,
    tr: { pt: "Eletrónica", es: "Electrónica", fr: "Électronique", de: "Elektronik", it: "Elettronica" },
    children: [
      { slug: "phones", name: "Phones & Tablets", icon: "Smartphone", seller: "technova", tr: { pt: "Telemóveis e tablets", es: "Móviles y tablets", fr: "Téléphones et tablettes", de: "Handys & Tablets", it: "Telefoni e tablet" } },
      { slug: "audio", name: "Headphones & Audio", icon: "Headphones", seller: "technova", tr: { pt: "Auscultadores e áudio", es: "Auriculares y audio", fr: "Casques et audio", de: "Kopfhörer & Audio", it: "Cuffie e audio" } },
      { slug: "computers", name: "Computers", icon: "Laptop", seller: "technova", tr: { pt: "Computadores", es: "Ordenadores", fr: "Ordinateurs", de: "Computer", it: "Computer" } },
      { slug: "cameras", name: "Cameras", icon: "Camera", seller: "technova", tr: { pt: "Câmaras", es: "Cámaras", fr: "Appareils photo", de: "Kameras", it: "Fotocamere" } },
      { slug: "gaming", name: "Gaming", icon: "Gamepad2", seller: "pixelgifts", tr: { pt: "Gaming", es: "Gaming", fr: "Jeux vidéo", de: "Gaming", it: "Gaming" } },
      { slug: "tv-video", name: "TV & Video", icon: "Tv", seller: "technova", tr: { pt: "TV e vídeo", es: "TV y vídeo", fr: "TV et vidéo", de: "TV & Video", it: "TV e video" } },
    ],
  },
  {
    slug: "fashion", name: "Fashion", icon: "Shirt", hue: 330,
    tr: { pt: "Moda", es: "Moda", fr: "Mode", de: "Mode", it: "Moda" },
    children: [
      { slug: "womens-clothing", name: "Women's Clothing", icon: "Shirt", seller: "atelierrua", tr: { pt: "Roupa de senhora", es: "Ropa de mujer", fr: "Vêtements femme", de: "Damenmode", it: "Abbigliamento donna" } },
      { slug: "mens-clothing", name: "Men's Clothing", icon: "Shirt", seller: "atelierrua", tr: { pt: "Roupa de homem", es: "Ropa de hombre", fr: "Vêtements homme", de: "Herrenmode", it: "Abbigliamento uomo" } },
      { slug: "shoes", name: "Shoes", icon: "Footprints", seller: "atelierrua", tr: { pt: "Calçado", es: "Calzado", fr: "Chaussures", de: "Schuhe", it: "Scarpe" } },
      { slug: "jewelry", name: "Jewellery", icon: "Gem", seller: "atelierrua", tr: { pt: "Joalharia", es: "Joyería", fr: "Bijoux", de: "Schmuck", it: "Gioielli" } },
      { slug: "eyewear", name: "Eyewear", icon: "Glasses", seller: "atelierrua", tr: { pt: "Óculos", es: "Gafas", fr: "Lunettes", de: "Brillen", it: "Occhiali" } },
    ],
  },
  {
    slug: "home-garden", name: "Home & Garden", icon: "Sofa", hue: 30,
    tr: { pt: "Casa e jardim", es: "Hogar y jardín", fr: "Maison et jardin", de: "Haus & Garten", it: "Casa e giardino" },
    children: [
      { slug: "furniture", name: "Furniture", icon: "Sofa", seller: "lumen", tr: { pt: "Mobiliário", es: "Muebles", fr: "Meubles", de: "Möbel", it: "Arredamento" } },
      { slug: "kitchen", name: "Kitchen", icon: "CookingPot", seller: "casaverde", tr: { pt: "Cozinha", es: "Cocina", fr: "Cuisine", de: "Küche", it: "Cucina" } },
      { slug: "lighting", name: "Lighting", icon: "Lamp", seller: "lumen", tr: { pt: "Iluminação", es: "Iluminación", fr: "Luminaires", de: "Beleuchtung", it: "Illuminazione" } },
      { slug: "garden", name: "Garden", icon: "Flower2", seller: "casaverde", tr: { pt: "Jardim", es: "Jardín", fr: "Jardin", de: "Garten", it: "Giardino" } },
    ],
  },
  {
    slug: "beauty", name: "Beauty", icon: "Sparkles", hue: 290,
    tr: { pt: "Beleza", es: "Belleza", fr: "Beauté", de: "Beauty", it: "Bellezza" },
    children: [
      { slug: "skincare", name: "Skincare", icon: "Droplet", seller: "pureglow", tr: { pt: "Cuidados de pele", es: "Cuidado facial", fr: "Soins de la peau", de: "Hautpflege", it: "Cura della pelle" } },
      { slug: "makeup", name: "Makeup", icon: "Palette", seller: "pureglow", tr: { pt: "Maquilhagem", es: "Maquillaje", fr: "Maquillage", de: "Make-up", it: "Trucco" } },
      { slug: "fragrance", name: "Fragrance", icon: "Sparkles", seller: "pureglow", tr: { pt: "Perfumes", es: "Perfumes", fr: "Parfums", de: "Düfte", it: "Profumi" } },
    ],
  },
  {
    slug: "sports", name: "Sports & Outdoors", icon: "Dumbbell", hue: 200,
    tr: { pt: "Desporto e ar livre", es: "Deportes y aire libre", fr: "Sports et plein air", de: "Sport & Outdoor", it: "Sport e outdoor" },
    children: [
      { slug: "fitness", name: "Fitness", icon: "Dumbbell", seller: "peakmotion", tr: { pt: "Fitness", es: "Fitness", fr: "Fitness", de: "Fitness", it: "Fitness" } },
      { slug: "cycling", name: "Cycling", icon: "Bike", seller: "peakmotion", tr: { pt: "Ciclismo", es: "Ciclismo", fr: "Cyclisme", de: "Radsport", it: "Ciclismo" } },
      { slug: "camping", name: "Camping & Hiking", icon: "Tent", seller: "peakmotion", tr: { pt: "Campismo e caminhada", es: "Camping y senderismo", fr: "Camping et randonnée", de: "Camping & Wandern", it: "Campeggio ed escursionismo" } },
    ],
  },
  {
    slug: "accessories", name: "Accessories", icon: "Watch", hue: 45,
    tr: { pt: "Acessórios", es: "Accesorios", fr: "Accessoires", de: "Accessoires", it: "Accessori" },
    children: [
      { slug: "bags", name: "Bags & Backpacks", icon: "Backpack", seller: "atelierrua", tr: { pt: "Malas e mochilas", es: "Bolsos y mochilas", fr: "Sacs et sacs à dos", de: "Taschen & Rucksäcke", it: "Borse e zaini" } },
      { slug: "wallets", name: "Wallets", icon: "Wallet", seller: "atelierrua", tr: { pt: "Carteiras", es: "Carteras", fr: "Portefeuilles", de: "Geldbörsen", it: "Portafogli" } },
      { slug: "watches", name: "Watches", icon: "Watch", seller: "technova", tr: { pt: "Relógios", es: "Relojes", fr: "Montres", de: "Uhren", it: "Orologi" } },
    ],
  },
  {
    slug: "automotive", name: "Automotive", icon: "Car", hue: 10,
    tr: { pt: "Automóvel", es: "Motor", fr: "Auto", de: "Auto", it: "Auto" },
    children: [
      { slug: "car-electronics", name: "Car Electronics", icon: "Smartphone", seller: "autopro", tr: { pt: "Eletrónica auto", es: "Electrónica para coche", fr: "Électronique auto", de: "Autoelektronik", it: "Elettronica auto" } },
      { slug: "car-care", name: "Tools & Car Care", icon: "Wrench", seller: "autopro", tr: { pt: "Ferramentas e cuidado auto", es: "Herramientas y cuidado", fr: "Outils et entretien", de: "Werkzeug & Pflege", it: "Attrezzi e cura auto" } },
    ],
  },
  {
    slug: "kids", name: "Kids & Baby", icon: "Baby", hue: 95,
    tr: { pt: "Criança e bebé", es: "Niños y bebés", fr: "Enfants et bébé", de: "Kinder & Baby", it: "Bambini e neonati" },
    children: [
      { slug: "toys", name: "Toys", icon: "ToyBrick", seller: "littlenest", tr: { pt: "Brinquedos", es: "Juguetes", fr: "Jouets", de: "Spielzeug", it: "Giocattoli" } },
      { slug: "baby", name: "Baby Care", icon: "Baby", seller: "littlenest", tr: { pt: "Cuidados do bebé", es: "Cuidado del bebé", fr: "Soins bébé", de: "Babypflege", it: "Cura del bambino" } },
      { slug: "kids-books", name: "Children's Books", icon: "BookOpen", seller: "littlenest", tr: { pt: "Livros infantis", es: "Libros infantiles", fr: "Livres jeunesse", de: "Kinderbücher", it: "Libri per bambini" } },
    ],
  },
  {
    slug: "office", name: "Office", icon: "Briefcase", hue: 230,
    tr: { pt: "Escritório", es: "Oficina", fr: "Bureau", de: "Büro", it: "Ufficio" },
    children: [
      { slug: "stationery", name: "Stationery", icon: "PenTool", seller: "officeloft", tr: { pt: "Papelaria", es: "Papelería", fr: "Papeterie", de: "Schreibwaren", it: "Cancelleria" } },
      { slug: "printers", name: "Printers & Supplies", icon: "Printer", seller: "officeloft", tr: { pt: "Impressoras", es: "Impresoras", fr: "Imprimantes", de: "Drucker", it: "Stampanti" } },
    ],
  },
  {
    slug: "grocery", name: "Grocery", icon: "ShoppingBasket", hue: 70,
    tr: { pt: "Mercearia", es: "Alimentación", fr: "Épicerie", de: "Lebensmittel", it: "Alimentari" },
    children: [
      { slug: "coffee-tea", name: "Coffee & Tea", icon: "Coffee", seller: "casaverde", tr: { pt: "Café e chá", es: "Café y té", fr: "Café et thé", de: "Kaffee & Tee", it: "Caffè e tè" } },
      { slug: "snacks", name: "Snacks & Pantry", icon: "Apple", seller: "casaverde", tr: { pt: "Snacks e despensa", es: "Snacks y despensa", fr: "Snacks et épicerie", de: "Snacks & Vorrat", it: "Snack e dispensa" } },
    ],
  },
  {
    slug: "digital", name: "Digital Products", icon: "Download", hue: 260,
    tr: { pt: "Produtos digitais", es: "Productos digitales", fr: "Produits numériques", de: "Digitale Produkte", it: "Prodotti digitali" },
    children: [
      { slug: "gift-cards", name: "Gift Cards", icon: "Gift", seller: "pixelgifts", tr: { pt: "Cartões oferta", es: "Tarjetas regalo", fr: "Cartes cadeaux", de: "Geschenkkarten", it: "Carte regalo" } },
      { slug: "music-software", name: "Music & Software", icon: "Music", seller: "pixelgifts", tr: { pt: "Música e software", es: "Música y software", fr: "Musique et logiciels", de: "Musik & Software", it: "Musica e software" } },
    ],
  },
];

export interface SellerSeed {
  key: string;
  storeName: string;
  owner: string;
  email: string;
  country: string;
  description: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  legalName: string;
}

export const SELLERS: SellerSeed[] = [
  { key: "technova", storeName: "TechNova Europe", owner: "Rui Almeida", email: "technova", country: "PT", status: "VERIFIED", legalName: "TechNova Europe, Lda.", description: "Consumer electronics from leading brands with 2-year EU warranty and fast dispatch from Lisbon." },
  { key: "atelierrua", storeName: "Atelier Rua", owner: "Inês Carvalho", email: "atelier", country: "PT", status: "VERIFIED", legalName: "Atelier Rua Unipessoal Lda.", description: "Contemporary fashion and accessories designed in Porto, made in Europe." },
  { key: "lumen", storeName: "Lumen & Co.", owner: "Pablo Serrano", email: "lumen", country: "ES", status: "VERIFIED", legalName: "Lumen y Compañía S.L.", description: "Scandinavian-inspired furniture and lighting for calm, bright homes." },
  { key: "casaverde", storeName: "Casa Verde Market", owner: "Giulia Romano", email: "casaverde", country: "IT", status: "VERIFIED", legalName: "Casa Verde S.r.l.", description: "Kitchen, garden and artisanal pantry goods from small Mediterranean producers." },
  { key: "pureglow", storeName: "Pure Glow Lab", owner: "Camille Laurent", email: "pureglow", country: "FR", status: "VERIFIED", legalName: "Pure Glow Lab SAS", description: "Clean, dermatologist-tested skincare and beauty formulated in France." },
  { key: "peakmotion", storeName: "Peak Motion", owner: "Jonas Becker", email: "peakmotion", country: "DE", status: "VERIFIED", legalName: "Peak Motion GmbH", description: "Gear for training, riding and the outdoors — tested in the Alps." },
  { key: "littlenest", storeName: "Little Nest", owner: "Chiara Bianchi", email: "littlenest", country: "IT", status: "VERIFIED", legalName: "Little Nest S.r.l.", description: "Safe, sustainable toys and baby essentials, EN 71 certified." },
  { key: "officeloft", storeName: "Office Loft", owner: "Daan de Vries", email: "officeloft", country: "NL", status: "VERIFIED", legalName: "Office Loft B.V.", description: "Everything for a productive home office, delivered across the EU." },
  { key: "pixelgifts", storeName: "Pixel Gifts", owner: "Aoife Murphy", email: "pixelgifts", country: "IE", status: "VERIFIED", legalName: "Pixel Gifts Ltd.", description: "Gaming accessories, gift cards and digital goods — delivered instantly or next day." },
  { key: "autopro", storeName: "AutoPro Parts", owner: "Lukas Schmidt", email: "autopro", country: "DE", status: "VERIFIED", legalName: "AutoPro Parts GmbH", description: "Car electronics, tools and care products for every driver." },
  { key: "nordic", storeName: "Nordic Threads", owner: "Emma Lind", email: "nordic", country: "NL", status: "PENDING", legalName: "Nordic Threads B.V.", description: "Merino knitwear and sustainable basics." },
];

type VariantScheme = "none" | "colors" | "apparel" | "shoes" | "storage" | "volume";

export interface ProductSeed {
  title: string;
  brand: string;
  icon: string;
  price: number; // EUR
  compareAt?: number;
  scheme: VariantScheme;
  free?: boolean;
  featured?: boolean;
}

/** Product templates per subcategory slug. */
export const PRODUCTS: Record<string, ProductSeed[]> = {
  phones: [
    { title: "Nova X5 5G Smartphone, 6.5\" AMOLED, 50 MP triple camera", brand: "Nova", icon: "Smartphone", price: 349, compareAt: 429, scheme: "storage", featured: true },
    { title: "Aero Tab 11 Tablet with Stylus Support, 2K Display", brand: "Aero", icon: "Tablet", price: 279, compareAt: 319, scheme: "storage" },
    { title: "Nova Lite 4G Smartphone, 5000 mAh battery", brand: "Nova", icon: "Smartphone", price: 159, scheme: "colors" },
    { title: "MagSafe-Compatible Clear Phone Case, Anti-Yellowing", brand: "Shieldo", icon: "Smartphone", price: 14.9, compareAt: 24.9, scheme: "colors", free: true },
    { title: "65W GaN Fast Charger, 3 Ports (USB-C + USB-A)", brand: "Voltix", icon: "PlugZap", price: 29.9, compareAt: 44.9, scheme: "none" },
  ],
  audio: [
    { title: "SoundArc Pro Wireless Noise-Cancelling Headphones, 40 h battery", brand: "SoundArc", icon: "Headphones", price: 129, compareAt: 199, scheme: "colors", featured: true },
    { title: "Pulse Buds True Wireless Earbuds with ANC", brand: "Pulse", icon: "Headphones", price: 59.9, compareAt: 89.9, scheme: "colors", free: true },
    { title: "Boom Cube Portable Bluetooth Speaker, IP67 Waterproof", brand: "Boom", icon: "Speaker", price: 49.9, scheme: "colors" },
    { title: "Studio Monitor Headphones for Recording & Mixing", brand: "SoundArc", icon: "Headphones", price: 89, scheme: "none" },
    { title: "Smart Home Speaker with Voice Assistant", brand: "Echoa", icon: "Speaker", price: 39.9, compareAt: 59.9, scheme: "colors" },
  ],
  computers: [
    { title: "Aero Book 14 Ultrabook, 16 GB RAM, 512 GB SSD", brand: "Aero", icon: "Laptop", price: 799, compareAt: 949, scheme: "none", featured: true },
    { title: "Mechanical Keyboard, Hot-Swappable, RGB, 75% Layout", brand: "Keyforge", icon: "Keyboard", price: 69.9, scheme: "colors" },
    { title: "Ergonomic Wireless Mouse, Silent Clicks", brand: "Keyforge", icon: "Mouse", price: 24.9, compareAt: 34.9, scheme: "colors", free: true },
    { title: "27\" QHD IPS Monitor, 165 Hz, USB-C 65 W", brand: "Viewline", icon: "Monitor", price: 259, compareAt: 299, scheme: "none" },
    { title: "USB-C 8-in-1 Hub with 4K HDMI and Ethernet", brand: "Voltix", icon: "Usb", price: 34.9, scheme: "none" },
  ],
  cameras: [
    { title: "Mirrorless Camera Kit, 24 MP APS-C with 18–55 mm Lens", brand: "Optiq", icon: "Camera", price: 649, compareAt: 749, scheme: "none" },
    { title: "Action Camera 4K60, Waterproof, Image Stabilisation", brand: "Optiq", icon: "Camera", price: 179, compareAt: 229, scheme: "none", featured: true },
    { title: "Aluminium Travel Tripod with Ball Head", brand: "Optiq", icon: "Camera", price: 49.9, scheme: "none" },
  ],
  gaming: [
    { title: "Wireless Game Controller, Hall-Effect Sticks", brand: "Pixelon", icon: "Gamepad2", price: 49.9, compareAt: 64.9, scheme: "colors", featured: true },
    { title: "Gaming Headset 7.1 Surround with Noise-Cancelling Mic", brand: "Pixelon", icon: "Headphones", price: 59.9, scheme: "colors" },
    { title: "XL Gaming Mouse Pad, Stitched Edges", brand: "Pixelon", icon: "Gamepad2", price: 17.9, scheme: "none", free: true },
    { title: "Retro Handheld Console with 2.8\" Screen", brand: "Pixelon", icon: "Gamepad2", price: 69.9, compareAt: 89.9, scheme: "colors" },
  ],
  "tv-video": [
    { title: "4K Smart Projector, Wi-Fi 6, 300 ANSI Lumens", brand: "Viewline", icon: "Projector", price: 229, compareAt: 299, scheme: "none" },
    { title: "Streaming Stick 4K HDR with Voice Remote", brand: "Echoa", icon: "Tv", price: 39.9, scheme: "none", free: true },
    { title: "Soundbar 2.1 with Wireless Subwoofer", brand: "Boom", icon: "Speaker", price: 149, compareAt: 189, scheme: "none" },
  ],
  "womens-clothing": [
    { title: "Linen Blend Wrap Midi Dress", brand: "Atelier Rua", icon: "Shirt", price: 49.9, compareAt: 69.9, scheme: "apparel", featured: true },
    { title: "Oversized Organic Cotton Hoodie", brand: "Atelier Rua", icon: "Shirt", price: 39.9, scheme: "apparel" },
    { title: "High-Rise Straight Leg Jeans", brand: "Denim Lab", icon: "Shirt", price: 44.9, scheme: "apparel" },
    { title: "Merino Wool Crew-Neck Sweater", brand: "Atelier Rua", icon: "Shirt", price: 59.9, compareAt: 79.9, scheme: "apparel" },
  ],
  "mens-clothing": [
    { title: "Essential Pima Cotton T-Shirt, 3-Pack", brand: "Atelier Rua", icon: "Shirt", price: 29.9, scheme: "apparel", free: true },
    { title: "Water-Repellent Lightweight Rain Jacket", brand: "Northline", icon: "Shirt", price: 79.9, compareAt: 99.9, scheme: "apparel" },
    { title: "Slim-Fit Stretch Chino Trousers", brand: "Atelier Rua", icon: "Shirt", price: 42.9, scheme: "apparel" },
    { title: "Oxford Button-Down Shirt", brand: "Atelier Rua", icon: "Shirt", price: 34.9, scheme: "apparel" },
  ],
  shoes: [
    { title: "Everyday Knit Running Sneakers", brand: "Stride", icon: "Footprints", price: 64.9, compareAt: 89.9, scheme: "shoes", featured: true },
    { title: "Leather Chelsea Boots", brand: "Stride", icon: "Footprints", price: 99, scheme: "shoes" },
    { title: "Minimal Canvas Low-Top Sneakers", brand: "Stride", icon: "Footprints", price: 39.9, scheme: "shoes" },
  ],
  jewelry: [
    { title: "Sterling Silver Minimal Chain Necklace", brand: "Lume Jewels", icon: "Gem", price: 34.9, scheme: "none", free: true },
    { title: "Gold-Plated Hoop Earrings, Hypoallergenic", brand: "Lume Jewels", icon: "Gem", price: 24.9, compareAt: 39.9, scheme: "none" },
    { title: "Stackable Birthstone Ring", brand: "Lume Jewels", icon: "Gem", price: 19.9, scheme: "none" },
  ],
  eyewear: [
    { title: "Polarised Classic Sunglasses, UV400", brand: "Solace", icon: "Glasses", price: 29.9, compareAt: 49.9, scheme: "colors" },
    { title: "Blue-Light Filtering Glasses for Screen Work", brand: "Solace", icon: "Glasses", price: 22.9, scheme: "colors", free: true },
  ],
  furniture: [
    { title: "Oak Veneer Floating Wall Shelf Set", brand: "Lumen & Co.", icon: "Sofa", price: 59.9, scheme: "none" },
    { title: "Upholstered Scandinavian Accent Chair", brand: "Lumen & Co.", icon: "Armchair", price: 189, compareAt: 239, scheme: "colors", featured: true },
    { title: "Height-Adjustable Standing Desk, 140×70 cm", brand: "Lumen & Co.", icon: "Sofa", price: 299, compareAt: 369, scheme: "colors" },
  ],
  kitchen: [
    { title: "Non-Stick Ceramic Frying Pan Set, PFAS-Free", brand: "Cucina Viva", icon: "CookingPot", price: 49.9, compareAt: 69.9, scheme: "none", featured: true },
    { title: "Digital Air Fryer 5.5 L, 8 Presets", brand: "Cucina Viva", icon: "CookingPot", price: 89.9, compareAt: 119, scheme: "colors" },
    { title: "Burr Coffee Grinder, 30 Grind Settings", brand: "Cucina Viva", icon: "Coffee", price: 59.9, scheme: "none" },
    { title: "Glass Food Storage Containers, 10-Piece Set", brand: "Cucina Viva", icon: "CookingPot", price: 29.9, scheme: "none", free: true },
  ],
  lighting: [
    { title: "Dimmable LED Desk Lamp with Wireless Charger", brand: "Lumen & Co.", icon: "Lamp", price: 39.9, compareAt: 54.9, scheme: "colors" },
    { title: "Smart Wi-Fi Bulb E27, 16M Colours, 4-Pack", brand: "Brightly", icon: "Lightbulb", price: 29.9, scheme: "none", free: true },
    { title: "Rattan Pendant Ceiling Light", brand: "Lumen & Co.", icon: "Lamp", price: 69.9, scheme: "none" },
  ],
  garden: [
    { title: "Solar Garden Path Lights, 8-Pack", brand: "Verde", icon: "Sun", price: 24.9, compareAt: 34.9, scheme: "none" },
    { title: "Self-Watering Herb Planter with Grow Light", brand: "Verde", icon: "Flower2", price: 44.9, scheme: "none", featured: true },
    { title: "Cordless Hedge Trimmer 20 V", brand: "Verde", icon: "Scissors", price: 79.9, compareAt: 99.9, scheme: "none" },
  ],
  skincare: [
    { title: "Hyaluronic Acid Hydrating Serum, 30 ml", brand: "Pure Glow", icon: "Droplet", price: 19.9, compareAt: 29.9, scheme: "none", featured: true },
    { title: "Mineral Sunscreen SPF 50, Fragrance-Free", brand: "Pure Glow", icon: "Sun", price: 16.9, scheme: "volume", free: true },
    { title: "Gentle Foaming Cleanser with Ceramides", brand: "Pure Glow", icon: "Droplet", price: 12.9, scheme: "volume" },
    { title: "Retinol Night Cream 0.3%", brand: "Pure Glow", icon: "Moon", price: 24.9, compareAt: 34.9, scheme: "none" },
  ],
  makeup: [
    { title: "Long-Wear Matte Liquid Lipstick", brand: "Maison Éclat", icon: "Palette", price: 14.9, scheme: "colors" },
    { title: "Eyeshadow Palette, 12 Neutral Shades", brand: "Maison Éclat", icon: "Palette", price: 22.9, compareAt: 32.9, scheme: "none" },
    { title: "Vegan Makeup Brush Set, 10 Pieces", brand: "Maison Éclat", icon: "Brush", price: 19.9, scheme: "none", free: true },
  ],
  fragrance: [
    { title: "Eau de Parfum \"Soleil Blanc\"", brand: "Maison Éclat", icon: "Sparkles", price: 59.9, compareAt: 79.9, scheme: "volume", featured: true },
    { title: "Unisex Cedar & Vetiver Eau de Toilette", brand: "Maison Éclat", icon: "Sparkles", price: 44.9, scheme: "volume" },
  ],
  fitness: [
    { title: "Adjustable Dumbbells 2×20 kg with Stand", brand: "Peak", icon: "Dumbbell", price: 149, compareAt: 199, scheme: "none", featured: true },
    { title: "Non-Slip Yoga Mat 6 mm, Eco TPE", brand: "Peak", icon: "Dumbbell", price: 24.9, scheme: "colors", free: true },
    { title: "Resistance Bands Set with Handles", brand: "Peak", icon: "Dumbbell", price: 19.9, compareAt: 29.9, scheme: "none" },
    { title: "Smart Fitness Watch with GPS & Heart Rate", brand: "Pulse", icon: "Watch", price: 99, compareAt: 139, scheme: "colors" },
  ],
  cycling: [
    { title: "Rechargeable Bike Light Set, 800 Lumens", brand: "Peak", icon: "Bike", price: 29.9, scheme: "none" },
    { title: "Lightweight MIPS Cycling Helmet", brand: "Peak", icon: "HardHat", price: 69.9, compareAt: 89.9, scheme: "apparel" },
    { title: "Compact Mini Bike Pump with Gauge", brand: "Peak", icon: "Bike", price: 17.9, scheme: "none", free: true },
  ],
  camping: [
    { title: "Ultralight 2-Person Backpacking Tent", brand: "Northline", icon: "Tent", price: 129, compareAt: 169, scheme: "none", featured: true },
    { title: "Insulated Stainless Steel Water Bottle 750 ml", brand: "Northline", icon: "CupSoda", price: 19.9, scheme: "colors", free: true },
    { title: "Waterproof Hiking Backpack 35 L", brand: "Northline", icon: "Backpack", price: 59.9, scheme: "colors" },
  ],
  bags: [
    { title: "Everyday Laptop Backpack 15.6\", Water-Resistant", brand: "Atelier Rua", icon: "Backpack", price: 49.9, compareAt: 64.9, scheme: "colors", featured: true },
    { title: "Vegan Leather Crossbody Bag", brand: "Atelier Rua", icon: "ShoppingBag", price: 39.9, scheme: "colors" },
    { title: "Cabin Suitcase 55 cm, Spinner Wheels", brand: "Northline", icon: "Luggage", price: 89.9, compareAt: 119, scheme: "colors" },
  ],
  wallets: [
    { title: "Slim RFID-Blocking Leather Wallet", brand: "Atelier Rua", icon: "Wallet", price: 24.9, scheme: "colors", free: true },
    { title: "Aluminium Card Holder with Pop-Up Mechanism", brand: "Shieldo", icon: "Wallet", price: 19.9, compareAt: 29.9, scheme: "colors" },
  ],
  watches: [
    { title: "Minimalist Quartz Watch, Sapphire Glass", brand: "Horae", icon: "Watch", price: 119, compareAt: 159, scheme: "colors" },
    { title: "Automatic Diver Watch 200 m", brand: "Horae", icon: "Watch", price: 249, scheme: "none" },
  ],
  "car-electronics": [
    { title: "4K Dash Cam with GPS and Parking Mode", brand: "AutoPro", icon: "Video", price: 79.9, compareAt: 109, scheme: "none", featured: true },
    { title: "Magnetic Car Phone Mount with 15 W Wireless Charging", brand: "AutoPro", icon: "Smartphone", price: 29.9, scheme: "none", free: true },
    { title: "Tyre Inflator, Cordless, Digital Gauge", brand: "AutoPro", icon: "Gauge", price: 44.9, compareAt: 59.9, scheme: "none" },
  ],
  "car-care": [
    { title: "Car Detailing Kit, 12 Pieces", brand: "AutoPro", icon: "Wrench", price: 34.9, scheme: "none" },
    { title: "Cordless Handheld Car Vacuum 120 W", brand: "AutoPro", icon: "Wind", price: 39.9, compareAt: 54.9, scheme: "none" },
  ],
  toys: [
    { title: "Wooden Rainbow Stacking Toy, Non-Toxic Paint", brand: "Little Nest", icon: "ToyBrick", price: 24.9, scheme: "none", featured: true },
    { title: "Magnetic Building Tiles, 60 Pieces", brand: "Little Nest", icon: "ToyBrick", price: 39.9, compareAt: 54.9, scheme: "none" },
    { title: "Plush Sleepy Fox, 30 cm", brand: "Little Nest", icon: "ToyBrick", price: 19.9, scheme: "none", free: true },
    { title: "STEM Coding Robot for Ages 6+", brand: "Little Nest", icon: "Bot", price: 59.9, scheme: "none" },
  ],
  baby: [
    { title: "Organic Cotton Baby Swaddle Blankets, 3-Pack", brand: "Little Nest", icon: "Baby", price: 29.9, scheme: "none", free: true },
    { title: "Video Baby Monitor with Night Vision", brand: "Little Nest", icon: "Baby", price: 79.9, compareAt: 99.9, scheme: "none" },
  ],
  "kids-books": [
    { title: "Illustrated Atlas of Animals (Hardcover)", brand: "Little Nest", icon: "BookOpen", price: 16.9, scheme: "none" },
    { title: "Bedtime Stories Collection, 20 Tales", brand: "Little Nest", icon: "BookOpen", price: 12.9, compareAt: 17.9, scheme: "none", free: true },
  ],
  stationery: [
    { title: "Dotted Hardcover Notebook A5, 192 Pages", brand: "Office Loft", icon: "NotebookPen", price: 12.9, scheme: "colors", free: true },
    { title: "Fountain Pen Gift Set with Converter", brand: "Office Loft", icon: "PenTool", price: 29.9, compareAt: 39.9, scheme: "none" },
    { title: "Desk Organiser in Recycled Felt", brand: "Office Loft", icon: "Briefcase", price: 19.9, scheme: "colors" },
  ],
  printers: [
    { title: "Wireless All-in-One Ink Tank Printer", brand: "Printo", icon: "Printer", price: 199, compareAt: 249, scheme: "none" },
    { title: "Compact Label Printer with App", brand: "Printo", icon: "Printer", price: 49.9, scheme: "none" },
  ],
  "coffee-tea": [
    { title: "Single-Origin Ethiopian Coffee Beans, 1 kg", brand: "Casa Verde", icon: "Coffee", price: 21.9, scheme: "none", featured: true },
    { title: "Organic Matcha Green Tea Powder, 100 g", brand: "Casa Verde", icon: "Leaf", price: 17.9, compareAt: 22.9, scheme: "none" },
    { title: "Italian Espresso Blend, 500 g", brand: "Casa Verde", icon: "Coffee", price: 11.9, scheme: "none", free: true },
  ],
  snacks: [
    { title: "Extra Virgin Olive Oil from Puglia, 1 L", brand: "Casa Verde", icon: "Droplet", price: 14.9, scheme: "none" },
    { title: "Mixed Roasted Nuts, Unsalted, 750 g", brand: "Casa Verde", icon: "Apple", price: 12.9, compareAt: 15.9, scheme: "none" },
    { title: "Dark Chocolate 85% Cacao Bars, 6-Pack", brand: "Casa Verde", icon: "Cookie", price: 13.9, scheme: "none", free: true },
  ],
  "gift-cards": [
    { title: "Sabaky Gift Card — Digital Delivery", brand: "Sabaky", icon: "Gift", price: 25, scheme: "none", free: true, featured: true },
    { title: "Gaming Store Gift Card €50", brand: "Pixelon", icon: "Gift", price: 50, scheme: "none", free: true },
  ],
  "music-software": [
    { title: "Music Streaming 12-Month Premium Code", brand: "Tuneo", icon: "Music", price: 99, compareAt: 119, scheme: "none", free: true },
    { title: "Photo Editing Suite — Lifetime Licence", brand: "Optiq", icon: "Image", price: 59, scheme: "none", free: true },
  ],
};

/** Homepage hero banners per locale: [title, subtitle, CTA]. Links/themes are shared. */
export const BANNER_LINKS = [
  { href: "/deals", theme: "brand" },
  { href: "/c/audio", theme: "ink" },
  { href: "/c/home-garden", theme: "sunrise" },
];

export const BANNERS: Record<string, [string, string, string][]> = {
  en: [
    ["Autumn Flash Sale — up to 30% off", "Hand-picked deals from verified sellers. Only for a few days.", "Shop the deals"],
    ["Upgrade your sound", "Noise-cancelling headphones, speakers and more with free returns.", "Explore audio"],
    ["Cosy home, bright ideas", "Lighting and furniture from €19.90 — free shipping over €35.", "Shop home"],
  ],
  pt: [
    ["Saldos relâmpago de outono — até 30% de desconto", "Ofertas escolhidas de vendedores verificados. Só durante alguns dias.", "Ver ofertas"],
    ["Melhore o seu som", "Auscultadores com cancelamento de ruído, colunas e muito mais com devoluções grátis.", "Explorar áudio"],
    ["Casa acolhedora, ideias luminosas", "Iluminação e mobiliário desde 19,90 € — envio grátis acima de 35 €.", "Comprar para casa"],
  ],
  es: [
    ["Ofertas flash de otoño: hasta un 30 % de descuento", "Ofertas seleccionadas de vendedores verificados. Solo unos días.", "Ver ofertas"],
    ["Mejora tu sonido", "Auriculares con cancelación de ruido, altavoces y más, con devoluciones gratis.", "Explorar audio"],
    ["Hogar acogedor, ideas luminosas", "Iluminación y muebles desde 19,90 €, envío gratis a partir de 35 €.", "Comprar hogar"],
  ],
  fr: [
    ["Ventes flash d'automne — jusqu'à -30 %", "Des offres sélectionnées chez des vendeurs vérifiés. Quelques jours seulement.", "Voir les offres"],
    ["Passez au son supérieur", "Casques à réduction de bruit, enceintes et plus encore, retours gratuits.", "Découvrir l'audio"],
    ["Maison douillette, idées lumineuses", "Luminaires et mobilier dès 19,90 € — livraison gratuite dès 35 €.", "Shopping maison"],
  ],
  de: [
    ["Herbst-Blitzangebote – bis zu 30 % Rabatt", "Handverlesene Angebote verifizierter Händler. Nur für wenige Tage.", "Zu den Angeboten"],
    ["Mehr Klang", "Kopfhörer mit Geräuschunterdrückung, Lautsprecher und mehr – mit kostenloser Rücksendung.", "Audio entdecken"],
    ["Gemütliches Zuhause, helle Ideen", "Leuchten und Möbel ab 19,90 € – kostenloser Versand ab 35 €.", "Wohnen shoppen"],
  ],
  it: [
    ["Offerte lampo d'autunno: fino al 30% di sconto", "Offerte selezionate da venditori verificati. Solo per pochi giorni.", "Scopri le offerte"],
    ["Migliora il tuo suono", "Cuffie con cancellazione del rumore, speaker e altro con resi gratuiti.", "Esplora l'audio"],
    ["Casa accogliente, idee luminose", "Illuminazione e arredo da 19,90 € — spedizione gratuita sopra i 35 €.", "Acquista per la casa"],
  ],
};

export const COLORS = [
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#f5f5f4" },
  { name: "Jade", hex: "#0a8c6f" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Sand", hex: "#d6c3a1" },
  { name: "Rose", hex: "#e11d48" },
];

export const HIGHLIGHTS: Record<string, string[]> = {
  electronics: ["2-year EU warranty", "CE certified", "Fast dispatch within 24 h", "Free returns within 30 days"],
  fashion: ["Responsibly sourced materials", "True to size — see size guide", "Machine washable", "Free 30-day returns"],
  "home-garden": ["Designed for everyday use", "Easy assembly, tools included", "Durable, easy-care materials", "Eco-friendly packaging"],
  beauty: ["Dermatologist tested", "Vegan & cruelty-free", "No parabens or sulphates", "Made in the EU"],
  sports: ["Tested by athletes", "Lightweight and durable", "Weather-resistant", "1-year warranty"],
  accessories: ["Premium materials", "Gift-ready packaging", "Timeless design", "1-year warranty"],
  automotive: ["Universal compatibility", "Easy installation", "Meets EU safety standards", "1-year warranty"],
  kids: ["EN 71 safety certified", "Non-toxic materials", "Suitable from age indicated", "Encourages creative play"],
  office: ["Premium paper and materials", "Built for daily use", "Ergonomic design", "Sustainably produced"],
  grocery: ["Sourced from small producers", "No artificial additives", "Best-before at least 6 months", "Recyclable packaging"],
  digital: ["Delivered instantly by email", "Redeemable across the EU", "No expiry date", "Secure activation code"],
};
