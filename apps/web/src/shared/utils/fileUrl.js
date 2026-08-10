const API_BASE = import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || '';

// Uploads are stored as a full Cloudinary URL, but older rows hold a bare
// filename from when files were written to the API's local /uploads disk.
// Cloudinary's upload response `url` is http://, which browsers refuse to
// download from an https page — force https.
export const fileUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v.replace(/^http:\/\//i, 'https://');
  return `${API_BASE}/uploads/${v.replace(/^\/+/, '')}`;
};

export default fileUrl;
