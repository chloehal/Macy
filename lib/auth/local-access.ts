// Explicit opt-in for the local development preview; never active in production.
export function localAccessEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.MACY_LOCAL_NO_PASSWORD === "true"
  );
}
