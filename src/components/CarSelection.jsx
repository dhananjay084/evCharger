import React, { useState } from "react";

const carData = {
  Tesla: ["Model S", "Model 3", "Model X", "Model Y"],
  Nissan: ["Leaf", "Ariya"],
  BMW: ["i3", "i4", "iX", "iX3"],
  Hyundai: ["Kona Electric", "Ioniq 5"],
  Ford: ["Mustang Mach-E", "F-150 Lightning"],
};

const CarSelectionForm = ({ onCarSelect }) => {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [range, setRange] = useState("");

  const handleBrandChange = (event) => {
    setBrand(event.target.value);
    setModel(""); // Reset model when brand changes
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (brand && model && range) {
      onCarSelect({ brand, model, range });
    }
  };

  return (
    <div className="w-full max-w-lg p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-semibold mb-4">Select Your Car</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Car Brand</label>
          <select
            value={brand}
            onChange={handleBrandChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">Select Brand</option>
            {Object.keys(carData).map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Car Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border p-2 rounded"
            required
            disabled={!brand}
          >
            <option value="">Select Model</option>
            {brand &&
              carData[brand].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Range (km)</label>
          <input
            type="number"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Enter range in km"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-full"
        >
          Save
        </button>
      </form>
    </div>
  );
};

export default CarSelectionForm;
