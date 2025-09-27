export async function fetchVidsrc() {
	const urlMovies = `https://vidsrc.xyz/movies/latest/page-1.json`;
	const urlTv = `https://vidsrc.xyz/tvshows/latest/page-1.json`;
	const urlEpisodes = `https://vidsrc.xyz/episodes/latest/page-1.json`;

	try {
		// Fetch both URLs in parallel
		const [responseMovies, responseTv, responseEpisodes] =
			await Promise.all([
				fetch(urlMovies),
				fetch(urlTv),
				fetch(urlEpisodes),
			]);

		// Check if both responses are OK
		if (!responseMovies.ok || !responseTv.ok || !responseEpisodes.ok) {
			throw new Error(
				`HTTP error! status: ${responseMovies.status}, ${responseTv.status}, ${responseEpisodes.status}`
			);
		}

		// Parse JSON data
		const dataMovies = await responseMovies.json();
		const dataTv = await responseTv.json();
		const dataEpisodes = await responseEpisodes.json();

		return { dataMovies, dataTv, dataEpisodes };
	} catch (error) {
		console.error("Error fetching movie, TV, or episode info:", error);
		return { dataMovies: null, dataTv: null, dataEpisodes: null };
	}
}
