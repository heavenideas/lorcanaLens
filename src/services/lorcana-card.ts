/**
 * Represents a Lorcana card image with full and thumbnail URLs.
 */
export interface LorcanaCardImage {
  /**
   * The URL of the card image at full size.
   */
  full: string;
  /**
   * The URL of the card image at thumbnail size.
   */
  thumbnail: string;
}

/**
 * Represents the set information
 */
export interface LorcanaSet {
    /**
     * The prerelease date of the set.
     */
    prereleaseDate: string;
    /**
     * The release date of the set.
     */
    releaseDate: string;
    /**
     * Whether the set has all cards.
     */
    hasAllCards: boolean;
    /**
     * The type of the set.
     */
    type: string;
    /**
     * The number of the set.
     */
    number: number;
    /**
     * The name of the set.
     */
    name: string;
}

/**
 * Represents a Lorcana card with its details.
 */
export interface LorcanaCard {
    /**
     * A dictionary with several URLs of card images
     */
    images: LorcanaCardImage;
    /**
     * The full identifier as displayed on the bottom-left of each card
     */
    fullIdentifier: string;
    /**
     * The full name of the card
     */
    fullName: string;
    /**
     * A string representation of the set code
     */
    setCode: string;
    /**
     * The rarity of this card
     */
    rarity: string;
}

export interface AllCards {
    cards: LorcanaCard[];
    sets: { [key: string]: LorcanaSet };
}

/**
 * Asynchronously retrieves all Lorcana card data.
 *
 * @returns A promise that resolves to an AllCards object containing all card details.
 */
export async function getAllLorcanaCards(): Promise<AllCards> {
  try {
    const response = await fetch('https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch card data: ${response.statusText}`);
    }
    const data: AllCards = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Lorcana cards:", error);
    // Fallback to stubbed data or rethrow, depending on desired error handling
    // For this example, let's return an empty structure or throw
    // throw error; 
    return { cards: [], sets: {} }; // Return empty data on error to prevent app crash
  }
}
