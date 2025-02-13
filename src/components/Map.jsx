import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, DirectionsRenderer, Marker, InfoWindow } from "@react-google-maps/api";
import CarSelectionForm from "./CarSelection";
const containerStyle = {
    width: "100%",
    height: "600px",
};

const center = { lat: 28.6139, lng: 77.209 }; // Default: Delhi

const Map = ({ start, end }) => {
    const [directions, setDirections] = useState(null);
    const [chargers, setChargers] = useState([]);
    const [selectedCharger, setSelectedCharger] = useState(null);
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalDistance, setTotalDistance] = useState("");
    const [totalTime, setTotalTime] = useState("");
    const [carDetails, setCarDetails] = useState(null);
    const mapRef = useRef(null);

    const onLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    useEffect(() => {
        if (start && end && mapRef.current) {
            fetchRouteAndChargers();
        }
    }, [start, end]);

    const fetchRouteAndChargers = async () => {
        const directionsService = new window.google.maps.DirectionsService();
        const placesService = new window.google.maps.places.PlacesService(mapRef.current);

        setLoading(true);

        directionsService.route(
            {
                origin: start,
                destination: end,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            async (result, status) => {
                if (status === "OK") {
                    setDirections(result);

                    const route = result.routes[0].legs[0];
                    setTotalDistance(route.distance.text);
                    setTotalTime(route.duration.text);

                    const routePath = result.routes[0].overview_path; // Improved coverage along the route
                    let uniqueAddresses = new Set();
                    let allChargers = [];

                    console.log("Route Path:", routePath);

                    // Fetch chargers along the entire route
                    await Promise.all(
                        routePath.map((point, index) =>
                            index % 5 === 0 // Fetch chargers at intervals to avoid excessive API calls
                                ? new Promise((resolve) => {
                                    const request = {
                                        location: point,
                                        radius: 10000, // 10km radius
                                        keyword: "EV Charging Station",
                                    };

                                    placesService.nearbySearch(request, (results, status) => {
                                        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                                            results.forEach((place) => {
                                                const address = place.vicinity || "Unknown Address";
                                                if (!uniqueAddresses.has(address)) {
                                                    uniqueAddresses.add(address);
                                                    allChargers.push({
                                                        lat: place.geometry.location.lat(),
                                                        lng: place.geometry.location.lng(),
                                                        name: place.name,
                                                        place_id: place.place_id,
                                                        address: address,
                                                        rating: place.rating || "No rating",
                                                        distanceFromStart: "Calculating...",
                                                        timeFromStart: "Calculating...",
                                                    });
                                                }
                                            });
                                        }
                                        resolve();
                                    });
                                })
                                : Promise.resolve()
                        )
                    );

                    console.log("Fetched Chargers:", allChargers);

                    // Compute accurate distance/time for each charger
                    await Promise.all(
                        allChargers.map((charger) =>
                            new Promise((resolve) => {
                                directionsService.route(
                                    {
                                        origin: start,
                                        destination: { lat: charger.lat, lng: charger.lng },
                                        travelMode: window.google.maps.TravelMode.DRIVING,
                                    },
                                    (res, status) => {
                                        if (status === "OK") {
                                            const leg = res.routes[0].legs[0];
                                            charger.distanceFromStart = leg.distance.text;
                                            charger.timeFromStart = leg.duration.text;
                                        } else {
                                            charger.distanceFromStart = "N/A";
                                            charger.timeFromStart = "N/A";
                                        }
                                        resolve();
                                    }
                                );
                            })
                        )
                    );

                    setChargers(allChargers);
                } else {
                    console.error("Error fetching directions:", status);
                }
                setLoading(false);
            }
        );
    };

    // Add charger as a stop
    const addStop = (charger) => {
        if (!stops.some((stop) => stop.place_id === charger.place_id)) {
            setStops([...stops, charger]);
        }
    };

    // Set Final Route (Removes all chargers, keeps only stops)
    //   const setFinalRoute = () => {
    //     setChargers([]);
    //     recalculateRoute();
    //   };
    const setFinalRoute = () => {
        if (!start || !end) return;

        let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}`;

        if (stops.length > 0) {
            const waypoints = stops.map((stop) => `${stop.lat},${stop.lng}`).join("|");
            googleMapsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
        }

        window.open(googleMapsUrl, "_blank");
    };


    // Recalculate route with stops included
    const recalculateRoute = () => {
        if (!start || !end) return;

        const waypoints = stops.map((stop) => ({
            location: { lat: stop.lat, lng: stop.lng },
            stopover: true,
        }));

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: start,
                destination: end,
                waypoints,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === "OK") {
                    setDirections(result);
                } else {
                    console.error("Error recalculating route:", status);
                }
            }
        );
    };
    const [optimizedChargers, setOptimizedChargers] = useState([]);
    useEffect(() => {
        if (chargers.length > 0 && carDetails) {
            getOptimizedChargers();
        }
    }, [chargers, carDetails]);
    useEffect(() => {
        console.log("Optimized Chargers Updated:", optimizedChargers);
    }, [optimizedChargers]);


    const getOptimizedChargers = async () => {
        if (!carDetails || chargers.length === 0) {
            console.log("No car details or chargers available.");
            return;
        }

        console.log("Starting optimization process...");

        const rangeKm = parseFloat(carDetails.range); // Get the selected car's range in km
        let selectedChargers = [];
        let lastLocation = start;
        let remainingChargers = [...chargers];

        const directionsService = new window.google.maps.DirectionsService();

        while (remainingChargers.length > 0) {
            let validChargers = [];

            // Step 1: Find chargers within the car's range from the last location
            await Promise.all(
                remainingChargers.map(async (charger) => {
                    try {
                        const route = await new Promise((resolve) => {
                            directionsService.route(
                                {
                                    origin: lastLocation,
                                    destination: { lat: charger.lat, lng: charger.lng },
                                    travelMode: window.google.maps.TravelMode.DRIVING,
                                },
                                (res, status) => {
                                    if (status === "OK") resolve(res);
                                    else resolve(null);
                                }
                            );
                        });

                        if (route) {
                            const distanceKm = route.routes[0].legs[0].distance.value / 1000;

                            console.log(`Checking charger: ${charger.name}, Distance: ${distanceKm} km`);

                            // Charger is within range and not already selected
                            if (distanceKm <= rangeKm) {
                                validChargers.push({ charger, distanceKm });
                            }
                        }
                    } catch (error) {
                        console.error("Error calculating distance:", error);
                    }
                })
            );

            if (validChargers.length === 0) {
                console.log("No charger found within range. Stopping optimization.");
                break;
            }

            // Step 2: Select the charger closest to the max range
            validChargers.sort((a, b) => b.distanceKm - a.distanceKm); // Prefer chargers closer to the max range
            const bestCharger = validChargers[0].charger;

            console.log(`Adding charger to optimized list: ${bestCharger.name}`);
            selectedChargers.push(bestCharger);
            lastLocation = { lat: bestCharger.lat, lng: bestCharger.lng };

            // Remove selected charger from the list
            remainingChargers = remainingChargers.filter(
                (charger) => charger.place_id !== bestCharger.place_id
            );

            // Step 3: Check if the destination is within range from the new last location
            try {
                const routeToEnd = await new Promise((resolve) => {
                    directionsService.route(
                        {
                            origin: lastLocation,
                            destination: end,
                            travelMode: window.google.maps.TravelMode.DRIVING,
                        },
                        (res, status) => {
                            if (status === "OK") resolve(res);
                            else resolve(null);
                        }
                    );
                });

                if (routeToEnd) {
                    const distanceToEnd = routeToEnd.routes[0].legs[0].distance.value / 1000;
                    if (distanceToEnd <= rangeKm) {
                        console.log("Destination is now reachable within range. Stopping.");
                        break;
                    }
                }
            } catch (error) {
                console.error("Error calculating distance to destination:", error);
            }
        }

        console.log("Optimized Chargers:", selectedChargers);
        setOptimizedChargers(selectedChargers);
    };




    return (
        <div>
            <CarSelectionForm onCarSelect={setCarDetails} />

            {carDetails && (
                <div className="my-4 p-4 bg-gray-100 rounded-md shadow-md">
                    <h3 className="text-lg font-semibold">Selected Car:</h3>
                    <p><strong>Brand:</strong> {carDetails.brand}</p>
                    <p><strong>Model:</strong> {carDetails.model}</p>
                    <p><strong>Range:</strong> {carDetails.range} km</p>
                </div>
            )}
            {loading && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-70 z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                    <p className="ml-3 text-lg font-semibold">Fetching chargers...</p>
                </div>
            )}

            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={8} onLoad={onLoad}>
                {directions && <DirectionsRenderer directions={directions} />}

                {chargers.map((charger) => (
                    <Marker
                        key={charger.place_id}
                        position={{ lat: charger.lat, lng: charger.lng }}
                        onClick={() => setSelectedCharger(charger)}
                    />
                ))}

                {stops.map((stop) => (
                    <Marker
                        key={stop.place_id}
                        position={{ lat: stop.lat, lng: stop.lng }}
                        icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
                    />
                ))}

                {selectedCharger && (
                    <InfoWindow
                        position={{ lat: selectedCharger.lat, lng: selectedCharger.lng }}
                        onCloseClick={() => setSelectedCharger(null)}
                    >
                        <div style={{ padding: "10px", maxWidth: "250px" }}>
                            <h3 className="font-bold">{selectedCharger.name}</h3>
                            <p><strong>Address:</strong> {selectedCharger.address}</p>
                            <p><strong>Rating:</strong> {selectedCharger.rating}</p>
                            <p><strong>Distance from Start:</strong> {selectedCharger.distanceFromStart}</p>
                            <p><strong>Time from Start:</strong> {selectedCharger.timeFromStart}</p>
                            <button
                                onClick={() => addStop(selectedCharger)}
                                className="bg-green-500 text-white px-3 py-1 mt-2 rounded-md hover:bg-green-600"
                            >
                                Add as Stop
                            </button>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {optimizedChargers.length > 0 ? (
                <div className="w-full max-w-4xl mt-4 p-4 border rounded-md shadow-md">
                    <h2 className="text-xl font-semibold mb-2">Optimized Charging Route</h2>
                    <ul className="max-h-60 overflow-y-auto">
                        {optimizedChargers.map((charger, index) => (
                            <li key={charger.place_id} className="p-4 border-b">
                                <h3 className="font-bold">{index + 1}. {charger.name}</h3>
                                <p><strong>Address:</strong> {charger.address}</p>
                                <p><strong>Distance from Start:</strong> {charger.distanceFromStart}</p>
                                <p><strong>Time from Start:</strong> {charger.timeFromStart}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="text-gray-500 mt-4">No optimized chargers found within range.</p>
            )}
            <div className="w-full max-w-4xl mt-4">
                <h2 className="text-xl font-semibold mb-2">Available Charging Stations</h2>
                <ul className="border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {chargers.map((charger) => (
                        <li key={charger.place_id} className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h3 className="font-bold">{charger.name}</h3>
                                <p><strong>Address:</strong> {charger.address}</p>
                                <p><strong>Rating:</strong> {charger.rating}</p>
                                <p><strong>Distance:</strong> {charger.distanceFromStart}</p>
                                <p><strong>Time:</strong> {charger.timeFromStart}</p>
                            </div>
                            <button
                                onClick={() => addStop(charger)}
                                className="bg-green-500 text-white px-4 py-2 mt-2 md:mt-0 rounded-md hover:bg-green-600"
                            >
                                Add as Stop
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {stops.length > 0 && (
                <button onClick={setFinalRoute} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
                    Set Final Route
                </button>
            )}
        </div>
    );
};

export default Map;
