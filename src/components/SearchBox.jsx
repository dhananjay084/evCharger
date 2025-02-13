import React, { useState, useEffect, useRef } from 'react';

const SearchBox = ({ onSearch }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const startRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps && startRef.current && endRef.current) {
      const startAutocomplete = new window.google.maps.places.Autocomplete(startRef.current, {
        types: ["geocode"],
      });
      const endAutocomplete = new window.google.maps.places.Autocomplete(endRef.current, {
        types: ["geocode"],
      });

      startAutocomplete.addListener("place_changed", () => {
        const place = startAutocomplete.getPlace();
        if (place && place.formatted_address) {
          setStart(place.formatted_address);
        }
      });

      endAutocomplete.addListener("place_changed", () => {
        const place = endAutocomplete.getPlace();
        if (place && place.formatted_address) {
          setEnd(place.formatted_address);
        }
      });
    }
  }, []); // Empty dependency array

  const handleSearchInternal = () => { // Renamed to avoid confusion
    if (start && end) {
      onSearch(start, end);
    }
  };

  return (
    <div className="search-box">
      <input ref={startRef} type="text" placeholder="Enter Start Location" value={start} onChange={(e) => setStart(e.target.value)} />
      <input ref={endRef} type="text" placeholder="Enter End Location" value={end} onChange={(e) => setEnd(e.target.value)} />
      <button onClick={handleSearchInternal}>Find Chargers</button>
    </div>
  );
};

export default SearchBox;
