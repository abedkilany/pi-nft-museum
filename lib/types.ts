export type Artist = {
  id: number;
  name: string;
  slug?: string;
  bio?: string;
  verified?: boolean;
};

export type Artwork = {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  votes: number;
  category: string;
  artist: Artist;
};