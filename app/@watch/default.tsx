// Default render for the @watch parallel slot when no intercepting route matches
// (i.e. every route that is not a soft-navigated /watch overlay). The slot lives
// at the root layout so a video can be opened as an overlay from ANY surface.
export default function Default() {
  return null;
}
