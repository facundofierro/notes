import * as React from "react";
import { Image as ImageIcon } from "lucide-react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function ImageWithFallback({ 
  src, 
  className, 
  fallback, 
  alt = "Image",
  ...props 
}: ImageWithFallbackProps) {
  const [isError, setIsError] = React.useState(false);

  if (!src || isError) {
    return fallback || (
      <div className={`${className} flex items-center justify-center bg-accent/20 rounded-sm`}>
        <ImageIcon className="w-1/2 h-1/2 text-muted-foreground opacity-50" />
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      className={className}
      alt={alt}
      onError={() => setIsError(true)}
    />
  );
}
