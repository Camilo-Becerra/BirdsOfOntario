import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  
} from 'react-native';

/**
 * Main app component for Birds of Ontario.
 * Lets users search for bird sightings, browse a catalog, or get a random bird.
 */
export default function App() {
  const [searchText, setSearchText] = useState('');
  const [observations, setObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [birdHeader, setBirdHeader] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogBirds, setCatalogBirds] = useState([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  /**
   * Searches the iNaturalist API for bird sightings in Ontario.
   * @param {string} birdName - The bird to search for.
   */
  async function fetchBirdObservations(birdName) {
    setIsLoading(true);
    setErrorMessage('');
    setObservations([]);
    setBirdHeader(null);

    try {
    
      const apiUrl = `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(birdName)}&place_id=6883&per_page=20&photos=true&order=desc&order_by=created_at&iconic_taxa=Aves`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.results.length === 0) {
        setErrorMessage('No observations found for that bird in Ontario.');
      } else {
        setObservations(data.results);
        const firstResult = data.results[0];
        const commonName = firstResult.taxon?.common_name || birdName;
        const scientificName = firstResult.taxon?.name || '';
        setBirdHeader({ commonName, scientificName });
      }
    } catch (error) {
      setErrorMessage('Something went wrong. Please check your connection and try again.');
    }
    setIsLoading(false);
  }

  /**
   * Fetches the top 50 most observed bird species in Ontario.
   * Used for the Bird Catalog screen.
   */
  async function fetchCatalogBirds() {
    setIsCatalogLoading(true);

    try {
      // species_counts endpoint returns species sorted by observation count
      const apiUrl = `https://api.inaturalist.org/v1/observations/species_counts?place_id=6883&iconic_taxa=Aves&per_page=100`;

      const response = await fetch(apiUrl);
      const data = await response.json();
      const birds = data.results.map((result) => ({
        name: result.taxon?.preferred_common_name || result.taxon?.name || 'Unknown Bird',
        scientificName: result.taxon?.name || '',
        photoUrl: result.taxon?.default_photo?.medium_url || null,
      }));
      setCatalogBirds(birds);
    } catch (error) {
      Alert.alert('Could not load the bird catalog. Please try again.');
    }
    setIsCatalogLoading(false);
  }

  /**
   * Runs when the user presses the Search button.
   * Checks that the input is not empty, then searches.
   */
  function handleSearch() {
    if (searchText.trim() === '') {
      Alert.alert('Please enter a bird name before searching.');
      return;
    }
    fetchBirdObservations(searchText);
  }

  /**
   * Runs when the user presses the Clear button.
   * Resets everything back to the starting state.
   */
  function handleClear() {
    setSearchText('');
    setObservations([]);
    setErrorMessage('');
    setBirdHeader(null);
  }

  /**
   * Runs when the user presses the Random Bird button.
   * Picks a random bird from the catalog and searches for it.
   */
  async function handleRandomBird() {
    let birds = catalogBirds;

    if (birds.length === 0) {
      await fetchCatalogBirds();
      birds = catalogBirds; // may still be empty due to async state timing
    }

    if (birds.length === 0) {
      Alert.alert('Could not load birds. Please try again.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * birds.length);
    const randomBird = birds[randomIndex];
    setSearchText(randomBird.name);
    fetchBirdObservations(randomBird.name);
  }

  /**
   * Runs when the user presses the Bird Catalog button.
   * Opens the catalog screen and loads the data if needed.
   */
  function handleOpenCatalog() {
    setShowCatalog(true);
    if (catalogBirds.length === 0) {
      fetchCatalogBirds();
    }
  }

  /**
   * Runs when the user taps a bird in the catalog.
   * Closes the catalog and searches for that bird.
   * @param {string} birdName - The name of the bird that was tapped.
   */
  function handleCatalogSelect(birdName) {
    setShowCatalog(false);
    setSearchText(birdName);
    fetchBirdObservations(birdName);
  }

  /**
   * Renders one observation card in the results list.
   * @param {object} item - A single observation from the API.
   */
  function renderObservationCard({ item }) {
    const photoUrl = item.photos[0]?.url?.replace('square', 'medium'); // API returns square thumbnails, swap to medium size
    const rawDate = item.observed_on ? new Date(item.observed_on + 'T00:00:00') : null; // append time to prevent timezone offset shifting the date
    const observedDate = rawDate
      ? rawDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Date unknown';
    const locationName = item.place_guess || 'Location unknown';

    return (
      <View style={styles.card}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.cardImage} />
        ) : null}

        <View style={styles.cardTextContainer}>
          <Text style={styles.cardDetail}> {observedDate}</Text>
          <Text style={styles.cardDetail}> {locationName}</Text>
        </View>
      </View>
    );
  }

  /**
   * Renders one bird tile in the catalog grid.
   * @param {object} item - A catalog bird with name and photoUrl.
   */
  function renderCatalogTile({ item }) {
    return (
      <TouchableOpacity style={styles.catalogTile} onPress={() => handleCatalogSelect(item.name)}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.catalogTileImage} />
        ) : (
          <View style={styles.catalogTilePlaceholder}>
            <Text style={styles.catalogTilePlaceholderText}>No Photo</Text>
          </View>
        )}
        <Text style={styles.catalogTileName}>{item.name}</Text>
        <Text style={styles.catalogTileScientificName}>{item.scientificName}</Text>
      </TouchableOpacity>
    );
  }

  // ==================== CATALOG SCREEN ====================
  if (showCatalog) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.container}>

          <View style={styles.catalogHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowCatalog(false)}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.catalogTitle}>Bird Catalog</Text>
          </View>

          {isCatalogLoading && (
            <ActivityIndicator size="large" color="#1a1a1a" style={styles.spinner} />
          )}

          <FlatList
            data={catalogBirds}
            keyExtractor={(item) => item.scientificName}
            renderItem={renderCatalogTile}
            numColumns={2}
            columnWrapperStyle={styles.catalogRow}
          />

        </View>
      </View>
    );
  }

  // ==================== MAIN SCREEN ====================
  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>

        <Image
  source={require('./assets/birds.png')} // loads the image from the assets folder
  style={styles.headerImage} // apply header image dimensions
/>
        <Text style={styles.subtitle}>Search for recent bird sightings across Ontario</Text>

        <TextInput
          style={styles.textInput}
          placeholder="Enter a bird name..."
          value={searchText}
          onChangeText={setSearchText}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSearch}>
            <Text style={styles.primaryButtonText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleClear}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.randomButton} onPress={handleRandomBird}>
            <Text style={styles.randomButtonText}> Random Bird</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.catalogButton} onPress={handleOpenCatalog}>
            <Text style={styles.catalogButtonText}> Bird Catalog</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <ActivityIndicator size="large" color="#1a1a1a" style={styles.spinner} />
        )}

        {errorMessage !== '' && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {birdHeader && (
          <View style={styles.birdHeader}>
            <Text style={styles.birdHeaderCommonName}>{birdHeader.commonName}</Text>
            <Text style={styles.birdHeaderScientificName}>{birdHeader.scientificName}</Text>
          </View>
        )}

        <FlatList
          data={observations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderObservationCard}
          style={styles.list}
        />

      </View>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 10,
    textAlign:"center"
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  primaryButton: {
    flex: 1,
    marginRight: 5,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  secondaryButton: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  randomButton: {
    flex: 1,
    marginRight: 5,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  randomButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
  },
  catalogButton: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  catalogButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
  },
  spinner: {
    marginVertical: 20,
  },
  errorText: {
    color: '#cc0000',
    textAlign: 'center',
    marginBottom: 10,
  },
  birdHeader: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  birdHeaderCommonName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  birdHeaderScientificName: {
    fontSize: 15,
    color: '#888888',
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardTextContainer: {
    padding: 10,
  },
  cardDetail: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 4,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  catalogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  catalogRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catalogTile: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  catalogTileImage: {
    width: '100%',
    height: 110,
  },
  catalogTilePlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogTilePlaceholderText: {
    color: '#999999',
    fontSize: 12,
  },
  catalogTileName: {
    padding: 8,
    paddingBottom: 2,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  catalogTileScientificName: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#888888',
    textAlign: 'center',
  },
  headerImage: {
    width: '100%', 
    height: 150, 
    resizeMode: 'contain', 
  },
});