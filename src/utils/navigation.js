export const navigateBackOrFallback = (navigate, fallbackPath = '/') => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate(fallbackPath);
};

