export const fetchOMDbPoster = async (imdbId: string | null | undefined): Promise<string | null> => {
  if (!imdbId) return null;
  try {
    const res = await fetch(`/api/omdb?i=${encodeURIComponent(imdbId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.Poster && data.Poster !== "N/A" ? data.Poster : null;
    }
  } catch (err) {
    console.error("OMDb poster error:", err);
  }
  return null;
};
