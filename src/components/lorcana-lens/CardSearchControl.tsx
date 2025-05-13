'use client';

import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { AllCards, LorcanaCard, LorcanaSet } from '@/services/lorcana-card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Search, CheckCircle, ImageOff as ImageIcon } from 'lucide-react'; // Added ImageIcon

interface CardSearchControlProps {
  allCardsData: AllCards | null;
  onCardSelect: (card: LorcanaCard) => void;
  selectedOriginalCard: LorcanaCard | null;
}

const CardThumbnail: React.FC<{ src: string | undefined; alt: string }> = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false); // Reset error state if src changes
  }, [src]);

  if (hasError || !src) {
    return (
      <div className="w-10 h-[56px] rounded-sm mr-3 bg-muted flex items-center justify-center" title="Image not available">
        <ImageIcon className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={56}
      className="rounded-sm mr-3 object-contain"
      unoptimized
      data-ai-hint="card thumbnail"
      onError={() => setHasError(true)}
    />
  );
};


const CardSearchControl: React.FC<CardSearchControlProps> = ({ allCardsData, onCardSelect, selectedOriginalCard }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LorcanaCard[]>([]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    if (allCardsData) {
      const filtered = allCardsData.cards
        .filter(card =>
          card.fullName.toLowerCase().includes(term.toLowerCase()) ||
          card.fullIdentifier.toLowerCase().includes(term.toLowerCase())
        )
        .slice(0, 50); // Limit results for performance
      setSearchResults(filtered);
    }
  };

  const getSetName = (setCode: string): string => {
    return allCardsData?.sets[setCode]?.name || `Set ${setCode}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Search className="mr-2 h-6 w-6" /> Find Original Card</CardTitle>
        <CardDescription>Search for the official card to compare against.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="Search by card name or ID (e.g., Mickey Mouse, 1/204)"
          value={searchTerm}
          onChange={handleSearchChange}
          className="text-base"
        />
        {searchResults.length > 0 && (
          <ScrollArea className="h-72 rounded-md border p-2">
            <ul className="space-y-2">
              {searchResults.map(card => (
                <li key={card.fullIdentifier}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-auto p-2 text-left ${selectedOriginalCard?.fullIdentifier === card.fullIdentifier ? 'bg-accent text-accent-foreground' : ''}`}
                    onClick={() => onCardSelect(card)}
                  >
                    <div className="flex items-center w-full">
                       <CardThumbnail src={card.images.thumbnail} alt={card.fullName} />
                      <div className="flex-1">
                        <p className="font-semibold">{card.fullName}</p>
                        <p className="text-xs text-muted-foreground">{card.fullIdentifier} - {getSetName(card.setCode)} - {card.rarity}</p>
                      </div>
                      {selectedOriginalCard?.fullIdentifier === card.fullIdentifier && <CheckCircle className="h-5 w-5 text-primary ml-2" />}
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        {searchTerm.length >=2 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No cards found for "{searchTerm}".</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CardSearchControl;
