'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop, X as XIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageCropperModalProps {
  imageDataUrl: string;
  aspectRatio: number; // width / height
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const MIN_CROP_SIZE_PERCENT = 0.1; // Minimum crop size as a percentage of image dimension

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageDataUrl,
  aspectRatio,
  onCropComplete,
  onCancel,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 }); // In image's natural pixel coordinates
  const [imgSize, setImgSize] = useState({ naturalWidth: 0, naturalHeight: 0, displayWidth: 0, displayHeight: 0 });

  const { toast } = useToast();

  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-t' | 'resize-r' | 'resize-b' | 'resize-l' | null;
    startX: number; // Screen X
    startY: number; // Screen Y
    initialCrop: typeof crop;
  } | null>(null);

  const resetCropToCenter = useCallback(() => {
    if (!imageLoaded || !imgRef.current || !containerRef.current) return;

    const { naturalWidth, naturalHeight } = imgRef.current;
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // Calculate display dimensions of the image within the container (aspect fit)
    const imageDisplayAspectRatio = naturalWidth / naturalHeight;
    let displayWidth = containerWidth;
    let displayHeight = containerWidth / imageDisplayAspectRatio;

    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageDisplayAspectRatio;
    }
    
    setImgSize({ naturalWidth, naturalHeight, displayWidth, displayHeight });

    // Initial crop box based on aspect ratio, centered
    let initialCropWidth, initialCropHeight;
    if (naturalWidth / naturalHeight > aspectRatio) { // Image is wider than target AR
      initialCropHeight = naturalHeight * 0.9;
      initialCropWidth = initialCropHeight * aspectRatio;
    } else { // Image is taller or equal to target AR
      initialCropWidth = naturalWidth * 0.9;
      initialCropHeight = initialCropWidth / aspectRatio;
    }

    setCrop({
      x: (naturalWidth - initialCropWidth) / 2,
      y: (naturalHeight - initialCropHeight) / 2,
      width: initialCropWidth,
      height: initialCropHeight,
    });
  }, [imageLoaded, aspectRatio]);


  useEffect(() => {
    // Ensure resetCropToCenter has access to up-to-date imgRef.current values
    if (imageLoaded && imgRef.current && containerRef.current) {
        resetCropToCenter();
    }
  }, [imageLoaded, resetCropToCenter]);

  const handleImageLoad = () => {
    setImageLoaded(true); // This will trigger the useEffect above
  };

  const screenToImageCoords = (screenX: number, screenY: number) => {
    if (!imgRef.current || !imgSize.displayWidth) return { x: 0, y: 0 };
    const imgRect = imgRef.current.getBoundingClientRect();
    const scale = imgSize.naturalWidth / imgSize.displayWidth;
    return {
      x: (screenX - imgRect.left) * scale,
      y: (screenY - imgRect.top) * scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: NonNullable<typeof dragState>['type']) => {
    e.preventDefault();
    const { clientX, clientY } = e;
    setDragState({ type, startX: clientX, startY: clientY, initialCrop: crop });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !imgRef.current || !cropBoxRef.current) return;
    e.preventDefault();

    const { naturalWidth, naturalHeight } = imgRef.current;
    const minPixelWidth = naturalWidth * MIN_CROP_SIZE_PERCENT;
    const minPixelHeight = naturalHeight * MIN_CROP_SIZE_PERCENT;

    const { clientX, clientY } = e;
    const delta = screenToImageCoords(clientX - dragState.startX, clientY - dragState.startY); // dx, dy in image coords from origin of drag
    const deltaScreenX = clientX - dragState.startX;
    const deltaScreenY = clientY - dragState.startY;

    const scaleX = imgSize.naturalWidth / imgSize.displayWidth;
    const scaleY = imgSize.naturalHeight / imgSize.displayHeight;

    let newCrop = { ...dragState.initialCrop };

    if (dragState.type === 'move') {
      newCrop.x += deltaScreenX * scaleX;
      newCrop.y += deltaScreenY * scaleY;
    } else {
        let dx = deltaScreenX * scaleX;
        let dy = deltaScreenY * scaleY;

        // Adjustments based on resize handle
        if (dragState.type.includes('l')) {
            newCrop.x += dx;
            newCrop.width -= dx;
        } else if (dragState.type.includes('r')) {
            newCrop.width += dx;
        }

        if (dragState.type.includes('t')) {
            newCrop.y += dy;
            newCrop.height -= dy;
        } else if (dragState.type.includes('b')) {
            newCrop.height += dy;
        }
        
        // Maintain aspect ratio
        if (dragState.type.includes('w') || dragState.type.includes('e') || dragState.type.includes('l') || dragState.type.includes('r')) { // Width changed
            const newHeight = newCrop.width / aspectRatio;
            if(dragState.type.includes('t')) newCrop.y += newCrop.height - newHeight; // Adjust y if resizing from top
            newCrop.height = newHeight;
        } else if (dragState.type.includes('n') || dragState.type.includes('s') || dragState.type.includes('t') || dragState.type.includes('b')) { // Height changed
            const newWidth = newCrop.height * aspectRatio;
            if(dragState.type.includes('l')) newCrop.x += newCrop.width - newWidth; // Adjust x if resizing from left
            newCrop.width = newWidth;
        }
    }
    
    // Clamp width/height to min/max
    newCrop.width = Math.max(minPixelWidth, Math.min(newCrop.width, naturalWidth));
    newCrop.height = Math.max(minPixelHeight, Math.min(newCrop.height, naturalHeight));

    // Ensure aspect ratio is maintained after clamping
    if (newCrop.width / newCrop.height > aspectRatio) {
        newCrop.width = newCrop.height * aspectRatio;
    } else {
        newCrop.height = newCrop.width / aspectRatio;
    }
    
    // Clamp position within image bounds
    newCrop.x = Math.max(0, Math.min(newCrop.x, naturalWidth - newCrop.width));
    newCrop.y = Math.max(0, Math.min(newCrop.y, naturalHeight - newCrop.height));

    setCrop(newCrop);
  }, [dragState, aspectRatio, imgSize]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const performCrop = async () => {
    if (!imgRef.current || !canvasRef.current || !crop.width || !crop.height) return;
    setIsCropping(true);

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast({ title: "Error", description: "Could not get canvas context.", variant: "destructive" });
      setIsCropping(false);
      return;
    }

    // Set canvas dimensions to the crop size
    canvas.width = Math.round(crop.width);
    canvas.height = Math.round(crop.height);
    
    try {
      // Draw the cropped portion of the image onto the canvas
      // The timeout allows the browser to repaint and show the loader
      await new Promise(resolve => setTimeout(resolve, 50));

      ctx.drawImage(
        image,
        Math.round(crop.x),
        Math.round(crop.y),
        Math.round(crop.width),
        Math.round(crop.height),
        0,
        0,
        Math.round(crop.width),
        Math.round(crop.height)
      );

      const croppedDataUrl = canvas.toDataURL('image/png'); // Or image/jpeg
      onCropComplete(croppedDataUrl);
    } catch (error) {
      console.error("Error during crop:", error);
      toast({ title: "Cropping Error", description: "Could not crop the image.", variant: "destructive" });
    } finally {
      setIsCropping(false);
    }
  };

  const cropBoxStyle: React.CSSProperties = imageLoaded ? {
    position: 'absolute',
    left: `${(crop.x / imgSize.naturalWidth) * 100}%`,
    top: `${(crop.y / imgSize.naturalHeight) * 100}%`,
    width: `${(crop.width / imgSize.naturalWidth) * 100}%`,
    height: `${(crop.height / imgSize.naturalHeight) * 100}%`,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    border: '1px dashed #fff',
    cursor: 'move',
  } : { display: 'none' };

  const resizeHandleBaseStyle: React.CSSProperties = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    backgroundColor: 'white',
    border: '1px solid black',
    borderRadius: '50%',
  };

  const handles = [
    { type: 'resize-tl', style: { ...resizeHandleBaseStyle, top: '-5px', left: '-5px', cursor: 'nwse-resize' } },
    { type: 'resize-tr', style: { ...resizeHandleBaseStyle, top: '-5px', right: '-5px', cursor: 'nesw-resize' } },
    { type: 'resize-bl', style: { ...resizeHandleBaseStyle, bottom: '-5px', left: '-5px', cursor: 'nesw-resize' } },
    { type: 'resize-br', style: { ...resizeHandleBaseStyle, bottom: '-5px', right: '-5px', cursor: 'nwse-resize' } },
    { type: 'resize-t', style: { ...resizeHandleBaseStyle, top: '-5px', left: 'calc(50% - 5px)', cursor: 'ns-resize' } },
    { type: 'resize-b', style: { ...resizeHandleBaseStyle, bottom: '-5px', left: 'calc(50% - 5px)', cursor: 'ns-resize' } },
    { type: 'resize-l', style: { ...resizeHandleBaseStyle, top: 'calc(50% - 5px)', left: '-5px', cursor: 'ew-resize' } },
    { type: 'resize-r', style: { ...resizeHandleBaseStyle, top: 'calc(50% - 5px)', right: '-5px', cursor: 'ew-resize' } },
  ] as const;


  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center">
            <Crop className="mr-2 h-5 w-5" /> Crop Image
          </DialogTitle>
           <DialogDescription>Adjust the selection to crop your card. The aspect ratio is locked.</DialogDescription>
        </DialogHeader>
        
        <div ref={containerRef} className="flex-grow relative overflow-hidden flex items-center justify-center bg-muted/40 p-2">
          {!imageLoaded && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="To crop"
            onLoad={handleImageLoad}
            style={{ 
                display: imageLoaded ? 'block' : 'none',
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none', // Prevents image's own drag behavior
            }}
          />
          {imageLoaded && (
            <div ref={cropBoxRef} style={cropBoxStyle} onMouseDown={(e) => handleMouseDown(e, 'move')}>
              {handles.map(handle => (
                <div
                  key={handle.type}
                  style={handle.style}
                  onMouseDown={(e) => handleMouseDown(e, handle.type)}
                />
              ))}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <DialogFooter className="p-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>
              <XIcon className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={performCrop} disabled={!imageLoaded || isCropping}>
            {isCropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crop className="mr-2 h-4 w-4" />}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
