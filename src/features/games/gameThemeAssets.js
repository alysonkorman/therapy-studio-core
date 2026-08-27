const base = "/game-themes/black-cats/";
const publicBase = "/game-themes/";
const publicUrl = (path) => path.replace(/^\/public/, "").split("/").map(encodeURIComponent).join("/");

const blackCatFiles = [
  "vecteezy_vector-illustration-of-cat-shape_19806493.svg",
  "vecteezy_vector-isolated-cat-silhouette-logo-print-decorative-sticker_9901671.svg",
  "vecteezy_black-cat-illustration-clipart-design-on-a-white-background_29138783.svg",
  "vecteezy_savanah-cat-silhouette-for-art-illustration-logo_13832016.svg",
  "vecteezy_a-silhouette-of-a-black-cat-scary-cat-vector-isolated-on-a_35062764.svg",
  "vecteezy_cat-line-art-icon-logo-illustration-and-cartoon-vector_19848498.svg",
  "vecteezy_simple-minimalist-cat-face-illustration-vector-design_8608462.svg",
  "vecteezy_vector-silhouette-of-a-cat-white-isolation-cat-icon-eps_12998954.svg",
  "vecteezy_black-cat-clipart-vector-illustration_24534568.svg",
  "vecteezy_one-line-art-of-cat-illustration-minimalist_16187416.svg",
  "vecteezy_vector-silhouette-of-cat-on-white-background_22958507.svg",
  "vecteezy_outline-kitten-playing-with-a-ball-of-thread_14047311.svg",
  "vecteezy_pet-cat-icon-in-trendy-glyph-style-isolated-on-soft-blue_5537106.svg",
  "vecteezy_the-simple-halloween-element_27960679.svg",
  "vecteezy_silhouette-of-a-cat-vector_21995201.svg",
  "vecteezy_jump-cat-silhouette-of-cat-pet-logo_4983803.svg",
  "vecteezy_cat-vector-illustration_18812782.svg",
  "vecteezy_black-cat-icon-vector-illustration-design-isolated-on-white_28546937.svg",
  "vecteezy_cat-face-vector-icon-baby-cat-illustration-sign-children_21448705.svg",
  "vecteezy_stylized-ornamental-cat-portrait-design-for-embroidery_15742912.svg",
  "vecteezy_tribal-cat-tattoo-vector-design-suitable-for-stickers_14422665.svg",
  "vecteezy_cat-high-quality-vector-logo-vector-illustration-ideal_27227558.svg",
  "vecteezy_lying-cat-with-raised-paw_18836888.svg",
];

const iconNames = [
  "Dog",
  "Rabbit",
  "Turtle",
  "Bird",
  "Shell",
  "Fish",
  "Butterfly",
  "Bug",
  "Lamp",
  "Armchair",
  "KeyRound",
  "AlarmClock",
  "BookOpen",
  "Coffee",
  "Shirt",
  "CircleDot",
  "Gift",
  "Music2",
  "Heart",
  "Star",
  "Sparkles",
  "Rainbow",
  "Target",
  "Crown",
  "Rocket",
  "PartyPopper",
  "Puzzle",
  "Sun",
  "Moon",
  "Cloud",
  "TreePine",
  "Flower2",
  "Leaf",
  "Flame",
  "Snowflake",
  "Waves",
  "Apple",
  "Circle",
  "Square",
  "Triangle",
  "Diamond",
  "Hexagon",
  "Plus",
  "X",
  "Orbit",
  "Zap",
  "Car",
  "Bike",
  "Sailboat",
  "Camera",
  "Guitar",
  "IceCreamBowl",
  "Pizza",
  "Paperclip",
  "WandSparkles",
  "Fox",
];

const animalFiles = [
  "animals/dogs/vecteezy_cute-dog-vector-cartoon-illustration_29453043 copy.svg",
  "animals/dogs/vecteezy_cute-dog-vector-cartoon-illustration_29453047.svg",
  "animals/root/vecteezy_beautiful-magical-butterfly-illustration_59239107.jpg",
  "animals/root/vecteezy_cat-vector-illustration_21769088.svg",
  "animals/root/vecteezy_cat-vector-illustration_21769092.svg",
  "animals/root/vecteezy_chicken-farm-illustration_58565488.jpg",
  "animals/root/vecteezy_contemporary-abstract-wild-and-domesticated-animals-folk_15338122.svg",
  "animals/root/vecteezy_cute-bird-illustration_58565518.jpg",
  "animals/root/vecteezy_cute-cat-illustration_25678128.svg",
  "animals/root/vecteezy_cute-cat-with-scarf-isolated-in-flat-vector_27575879.svg",
  "animals/root/vecteezy_cute-dog-vector-cartoon-illustration_29453043.svg",
  "animals/root/vecteezy_cute-dog-vector-cartoon-illustration_29453047 copy.svg",
  "animals/root/vecteezy_cute-fox-animal-vector-illustration_30332821.svg",
  "animals/root/vecteezy_cute-penguin-vector-illustration_28687851 copy.svg",
  "animals/root/vecteezy_cute-puppy-vector_21769118.svg",
  "animals/root/vecteezy_cute-sheep-vector_21769123.svg",
  "animals/root/vecteezy_cute-tabby-cat-vector-illustration_29168057.svg",
  "animals/root/vecteezy_dog-vector-illustration_21769094.svg",
  "animals/root/vecteezy_dog-vector-illustration_21769099.svg",
  "animals/root/vecteezy_dog-vector-illustration_21769101.svg",
  "animals/root/vecteezy_dove-cartoon-illustration_34718288-1.jpg",
  "animals/root/vecteezy_green-snail-animal-vector_29168059.svg",
  "animals/root/vecteezy_illustration-of-a-cute-dolphin-jumping_35360863.svg",
  "animals/root/vecteezy_portrait-of-sleepy-cat-cute-pet-close-up-face-vector_21688182.svg",
  "animals/root/vecteezy_puffer-fish-underwater-illustration_35497955.jpg",
  "animals/root/vecteezy_sloth-sleeping-animal-vector-illustration_28687858.svg",
  "animals/root/vecteezy_squirrel-with-acorn_29168066.svg",
  "animals/sea/vecteezy_big-whale-sea-animal-vector-illustration_30332819.svg",
  "animals/sea/vecteezy_cute-jellyfish-cartoon-illustration_34718287.svg",
];

const spotItAssets = import.meta.glob("../../assets/spot-it/*", {
  eager: true,
  import: "default",
  query: "?url",
});
const compiledMemoryThemeAssets = import.meta.glob(
  "../../assets/memory/**/*.{svg,png,jpg,jpeg}",
  { eager: true, import: "default", query: "?url" }
);
const extraMemoryThemes = [
  ["clothing", "Clothing"],
  ["dog-faces", "Dog Faces"],
  ["food", "Food"],
  ["halloween", "Halloween"],
  ["magic", "Magic"],
  ["winter", "Winter"],
  ["patterns", "Patterns"],
];

export const gameThemes = [
  { id: "black-cats", label: "Black Cats" },
  { id: "animals", label: "Animals" },
  ...extraMemoryThemes.map(([id, label]) => ({ id, label })),
];

export function themedSymbols({
  limit = blackCatFiles.length,
  theme = "black-cats",
} = {}) {
  const extraThemeFiles = Object.entries(compiledMemoryThemeAssets)
    .filter(([path]) => path.includes(`/memory/${theme}/`))
    .map(([, image]) => image);
  const files = theme === "animals" ? animalFiles : theme === "black-cats" ? blackCatFiles : extraThemeFiles;
  const prefix = theme === "black-cats" ? base : publicBase;
  return Array.from({ length: limit }, (_, index) => ({
    id: `${theme}-${index}`,
    image: extraThemeFiles.length ? files[index % files.length] : `${prefix}${files[index % files.length]}`,
  }));
}

export const spotItSymbols = Object.entries(spotItAssets).map(([path, image]) => ({
  id: `spot-it-${path.split("/").pop()}`,
  image,
}));

export function cropStyle(symbol) {
  if (!symbol?.image) return undefined;
  return {
    backgroundImage: `url("${symbol.image}")`,
    backgroundPosition: "center",
    backgroundSize: "contain",
  };
}
