import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileText, ImageIcon, Mic, Video, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MediaMessageProps {
  messageId: string | null;
  mediaType: 'image' | 'audio' | 'video' | 'document';
  mediaUrl: string | null;
  content: string | null;
  fromMe: boolean;
  instanceId?: string;
  instanceToken?: string;
  onMediaUrlUpdate?: (newUrl: string) => void;
}

/**
 * Check if a media URL is from our persistent storage (Supabase)
 * URLs from WhatsApp CDN (mmg.whatsapp.net) expire quickly and won't work
 * Signed URLs include a token parameter and are also valid
 */
function isPersistedMediaUrl(url: string | null): boolean {
  if (!url) return false;
  
  // Our Supabase storage URLs (including signed URLs)
  if (url.includes('supabase.co/storage')) return true;
  if (url.includes('knyzkwgdmclcwvzhdmyk')) return true; // Our project ID
  
  // Check for signed URL token parameter
  if (url.includes('token=')) return true;
  
  // WhatsApp CDN URLs expire quickly - treat as not persisted
  if (url.includes('mmg.whatsapp.net')) return false;
  if (url.includes('.whatsapp.net')) return false;
  if (url.includes('whatsapp.com')) return false;
  
  // Other URLs (might be external) - assume they work
  return true;
}

/**
 * Extract storage path from a Supabase URL for generating fresh signed URLs
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  
  // Pattern: .../storage/v1/object/.../whatsapp-media/path
  const storageMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/whatsapp-media\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    return storageMatch[1];
  }
  
  // Pattern: storage://whatsapp-media/path (internal format)
  if (url.startsWith('storage://whatsapp-media/')) {
    return url.replace('storage://whatsapp-media/', '');
  }
  
  return null;
}

/**
 * MediaMessage component - Displays media with automatic download for persistence
 * Shows preview immediately when possible, downloads in background
 */
export function MediaMessage({
  messageId,
  mediaType,
  mediaUrl,
  content,
  fromMe,
  instanceId,
  instanceToken,
  onMediaUrlUpdate,
}: MediaMessageProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(mediaUrl);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [hasAttemptedDownload, setHasAttemptedDownload] = useState(false);

  const isPersisted = isPersistedMediaUrl(currentUrl);
  
  // Only attempt download if we have instance credentials AND the media is not already persisted
  // AND we have a valid mediaUrl from WhatsApp (indicates the message has media data)
  const hasWhatsAppMediaUrl = mediaUrl && (
    mediaUrl.includes('mmg.whatsapp.net') || 
    mediaUrl.includes('.whatsapp.net') ||
    mediaUrl.includes('whatsapp.com')
  );
  
  // Don't auto-download - only manual download to avoid flooding errors for old messages
  const canAttemptDownload = !isPersisted && messageId && instanceId && instanceToken && hasWhatsAppMediaUrl;

  const handleDownload = useCallback(async () => {
    if (!messageId || !instanceId || !instanceToken) return;
    
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const { data, error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'download-media',
          messageId,
          instanceId,
          instanceToken,
        },
      });

      // Parse error response - when edge function returns 400, response is in error.context
      let errorData = null;
      if (error) {
        try {
          // Try to parse error context for the response body
          if (typeof error.context === 'object') {
            errorData = error.context;
          } else if (error.message) {
            errorData = JSON.parse(error.message);
          }
        } catch {
          // If parsing fails, use data or default
          errorData = data;
        }
      }

      if (error || !data?.success) {
        // Check if the error indicates we can't retry (from error response or data)
        const responseData = errorData || data;
        const canRetry = responseData?.canRetry !== false;
        
        if (!canRetry) {
          // Silent fail for permanent errors (old messages without directPath)
          setDownloadError('Mídia expirada');
        } else {
          // Log only retryable errors
          console.warn('Download falhou, pode tentar novamente:', responseData?.error || error?.message);
          setDownloadError('Erro ao baixar');
        }
        return;
      }

      // Update the URL to the persisted one
      setCurrentUrl(data.url);
      setImageLoadError(false);
      
      // Update message in database
      await supabase
        .from('wapi_messages')
        .update({ media_url: data.url, media_key: null })
        .eq('message_id', messageId);

      // Notify parent
      onMediaUrlUpdate?.(data.url);
    } catch (err) {
      // Silent fail - don't spam console for expected failures
      setDownloadError('Mídia expirada');
    } finally {
      setIsDownloading(false);
    }
  }, [messageId, instanceId, instanceToken, onMediaUrlUpdate]);

  // Handle image load error - just show placeholder, don't auto-download
  const handleImageError = () => {
    setImageLoadError(true);
    // Don't auto-trigger download - let user click manually if they want
  };

  // Render based on media type
  const renderMedia = () => {
    // If we have a persisted URL or a potentially valid URL and no error
    const hasValidUrl = currentUrl && (isPersisted || !imageLoadError);

    switch (mediaType) {
      case 'image':
        if (hasValidUrl && !imageLoadError) {
          return (
            <div className="relative">
              <img
                src={currentUrl!}
                alt={content || "Imagem"}
                className="rounded max-w-full max-h-64 object-contain cursor-pointer"
                onClick={() => window.open(currentUrl!, '_blank')}
                onError={handleImageError}
              />
              {isDownloading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded">
                  <div className="flex items-center gap-2 text-white text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </div>
                </div>
              )}
            </div>
          );
        }
        return renderPlaceholder();

      case 'video':
        if (hasValidUrl && !imageLoadError) {
          return (
            <div className="relative">
              <video
                controls
                className="rounded max-w-full max-h-64"
                preload="metadata"
                onError={handleImageError}
              >
                <source src={currentUrl!} />
              </video>
              {isDownloading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded">
                  <div className="flex items-center gap-2 text-white text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </div>
                </div>
              )}
            </div>
          );
        }
        return renderPlaceholder();

      case 'audio':
        if (hasValidUrl && !imageLoadError) {
          return (
            <div className="relative">
              <audio controls className="max-w-full" onError={handleImageError}>
                <source src={currentUrl!} />
              </audio>
              {isDownloading && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando áudio...
                </div>
              )}
            </div>
          );
        }
        return renderPlaceholder();

      case 'document':
        if (hasValidUrl) {
          return (
            <a
              href={currentUrl!}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={cn(
                "flex items-center gap-2 p-2 rounded border transition-colors",
                fromMe
                  ? "border-primary-foreground/30 hover:bg-primary-foreground/10"
                  : "border-border hover:bg-muted"
              )}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{content || 'Documento'}</p>
                <p className={cn(
                  "text-xs",
                  fromMe ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {isDownloading ? "Salvando..." : "Clique para baixar"}
                </p>
              </div>
              {isDownloading ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 shrink-0" />
              )}
            </a>
          );
        }
        return renderPlaceholder();

      default:
        return renderPlaceholder();
    }
  };

  const renderPlaceholder = () => {
    const IconComponent = {
      image: ImageIcon,
      audio: Mic,
      video: Video,
      document: FileText,
    }[mediaType];

    const mediaLabel = {
      image: 'Imagem',
      audio: 'Áudio',
      video: 'Vídeo',
      document: content || 'Documento',
    }[mediaType];

    return (
      <div
        className={cn(
          "flex flex-col gap-2 p-3 rounded-lg border min-w-[180px] max-w-[250px]",
          fromMe
            ? "border-primary-foreground/20 bg-primary-foreground/5"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-2 rounded-lg",
              fromMe ? "bg-primary-foreground/10" : "bg-primary/10"
            )}
          >
            <IconComponent
              className={cn(
                "w-5 h-5",
                fromMe ? "text-primary-foreground" : "text-primary"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium truncate",
                fromMe ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {mediaLabel}
            </p>
            <p
              className={cn(
                "text-xs flex items-center gap-1",
                fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Baixando...
                </>
              ) : downloadError ? (
                <span className="text-destructive">{downloadError}</span>
              ) : (
                "Arquivo não disponível"
              )}
            </p>
          </div>
        </div>

        {/* Download button - only show if we have a WhatsApp CDN URL (indicates downloadable media) */}
        {!isDownloading && canAttemptDownload && downloadError !== 'Mídia expirada' && (
          <Button
            size="sm"
            variant={fromMe ? "secondary" : "outline"}
            className="w-full h-8 text-xs"
            onClick={handleDownload}
          >
            <Download className="w-3 h-3 mr-1" />
            {downloadError ? "Tentar novamente" : "Baixar arquivo"}
          </Button>
        )}

        {/* Loading state */}
        {isDownloading && (
          <div className="flex items-center justify-center gap-2 py-1">
            <Loader2 className={cn(
              "w-4 h-4 animate-spin",
              fromMe ? "text-primary-foreground" : "text-primary"
            )} />
          </div>
        )}
      </div>
    );
  };

  return renderMedia();
}
