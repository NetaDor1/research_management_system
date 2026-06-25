export const sanitizeStorageFileName = (name = 'file') => (
  String(name).replace(/[/\\?%*:|"<>]/g, '_').trim() || 'file'
);
