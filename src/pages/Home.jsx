import React, { useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Map from '../components/Map';
import SearchBox from '../components/SearchBox';

const Home = () => {
    const [startAddress, setStartAddress] = useState(""); // Address string
    const [endAddress, setEndAddress] = useState("");     // Address string
    const [start, setStart] = useState(null);       // Geocoded LatLng
    const [end, setEnd] = useState(null);         // Geocoded LatLng
    const [geocodeError, setGeocodeError] = useState(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: ['places']
    });

    useEffect(() => {
        if (startAddress) {
            geocodeAddress(startAddress)
                .then(latLng => setStart(latLng))
                .catch(error => setGeocodeError(error));
        } else {
          setStart(null); // Clear start if address is empty
        }

        if (endAddress) {
            geocodeAddress(endAddress)
                .then(latLng => setEnd(latLng))
                .catch(error => setGeocodeError(error));
        } else {
            setEnd(null);  // Clear end if address is empty
        }
    }, [startAddress, endAddress]);

    const geocodeAddress = async (address) => {
        const geocoder = new window.google.maps.Geocoder();
        return new Promise((resolve, reject) => {
            geocoder.geocode({ 'address': address }, (results, status) => {
                if (status === 'OK') {
                    const latLng = results[0].geometry.location;
                    resolve(latLng);
                } else {
                    console.error('Geocode was not successful for: ', address, status);
                    reject(status);
                    setGeocodeError(`Geocoding failed for ${address}: ${status}`);
                }
            });
        });
    };

    const handleSearch = (start, end) => {
        setStartAddress(start); // Store address string
        setEndAddress(end);   // Store address string
    };

    return (
        <div>
            <SearchBox onSearch={handleSearch} />
            {geocodeError && <div>{geocodeError}</div>} {/* Display error message */}
            {isLoaded && start && end ? ( // Check if loaded AND start/end are valid
                <Map start={start} end={end} />
            ) : (
                <div>
                    {isLoaded ? (
                        <p>Enter start and end addresses.</p>
                    ) : (
                        <p>Loading Map...</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Home;
