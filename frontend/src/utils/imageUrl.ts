export const getImageUrl = (
  url?: string | null
): string | null => {
  if (!url) {
    return null;
  }

  // If the backend already returns a full URL, use it directly.
  if (
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }

  // Example:
  // VITE_API_URL=https://your-backend.onrender.com/api
  const apiUrl = import.meta.env.VITE_API_URL || '';

  // Remove /api from the end.
  const backendUrl = apiUrl.replace(/\/api\/?$/, '');

  // Ensure the uploaded file path starts with "/".
  const imagePath = url.startsWith('/')
    ? url
    : `/${url}`;

  return `${backendUrl}${imagePath}`;
};