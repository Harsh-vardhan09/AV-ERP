// react-router's `lazy` wants a module exposing `Component`; every page here
// exports a default. This adapts one to the other so route files can stay
// `lazy: page(() => import('./pages/X'))`.
export const page = (loader) => async () => ({ Component: (await loader()).default });

// Same, for a page that needs fixed props (DocumentStudentList, NewDocumentForm).
export const pageWith = (loader, props) => async () => {
  const Loaded = (await loader()).default;
  return { Component: () => <Loaded {...props} /> };
};

// A route that only redirects. Kept as a component so it stays a real match
// (and therefore still passes through the guard) exactly like the <Navigate>
// elements it replaces.
export const redirect = (to) => async () => {
  const { Navigate } = await import('react-router-dom');
  return { Component: () => <Navigate to={to} replace /> };
};
