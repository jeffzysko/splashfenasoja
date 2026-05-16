/**
 * Utilitários de otimização de imagens para internet lenta.
 *
 * Converte URLs do Supabase Storage para a API de transformação de imagens,
 * servindo versões menores e em WebP — reduz drasticamente o uso de banda.
 *
 * Requer Supabase Image Transformation habilitado no projeto (Pro+).
 * Se a feature não estiver ativa, o onError do <img> deve fazer fallback
 * para a URL original.
 *
 * Exemplo de conversão:
 *   /storage/v1/object/public/produtos/foto.jpg
 *   → /storage/v1/render/image/public/produtos/foto.jpg?width=400&quality=75&format=webp
 */

const SUPABASE_OBJECT_RE =
  /^(https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1)\/object\/(public\/[^?#]*)/i;

/**
 * Retorna uma URL otimizada (thumbnailizada e convertida para WebP)
 * para imagens hospedadas no Supabase Storage.
 *
 * @param url     - URL original do Storage
 * @param width   - Largura máxima em pixels
 * @param quality - Qualidade de compressão JPEG/WebP (1-100). Default: 75
 * @returns URL transformada, ou a URL original se não for do Supabase, ou null
 */
export function thumbUrl(
  url: string | null | undefined,
  width: number,
  quality = 75,
): string | null {
  if (!url) return null;
  const m = url.match(SUPABASE_OBJECT_RE);
  if (!m) return url; // URL externa — retorna sem modificar
  return `${m[1]}/render/image/${m[2]}?width=${width}&quality=${quality}&format=webp`;
}

/**
 * Cria um handler onError para <img> que faz fallback da URL transformada
 * para a URL original caso a transformação não esteja disponível.
 *
 * @param originalUrl - URL original do Storage
 * @param onFinalError - Callback chamado quando mesmo a URL original falhar
 */
export function makeImgErrorHandler(
  originalUrl: string | null | undefined,
  onFinalError?: (e: React.SyntheticEvent<HTMLImageElement>) => void,
) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (originalUrl && target.src !== originalUrl) {
      // Primeira falha: tenta a URL original (sem transformação)
      target.src = originalUrl;
    } else {
      // Segunda falha: oculta a imagem
      target.style.display = "none";
      onFinalError?.(e);
    }
  };
}

