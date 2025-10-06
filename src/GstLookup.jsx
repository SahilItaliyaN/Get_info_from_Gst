import { useState } from 'react';

function GstLookup() {
    const [gstNumber, setGstNumber] = useState('');
    const [gstInfo, setGstInfo] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    const handleInputChange = (event) => {
        setGstNumber(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setGstInfo(null); // Clear previous info

        // Basic validation: GSTIN is 15 alphanumeric characters
        const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstNumber || !gstPattern.test(gstNumber.toUpperCase())) { // Convert to uppercase for pattern matching
            setError('Please enter a valid 15-character GSTIN (e.g., 27ABCDE1234F1Z5).');
            setLoading(false);
            return;
        }

        try {
            const url = `https://${RAPIDAPI_HOST}/v1/gstin/${gstNumber.toUpperCase()}/details`; // Ensure GSTIN is uppercase

            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': RAPIDAPI_HOST
                }
            };

            const response = await fetch(url, options);

            if (!response.ok) {
                // Try to parse error message from API if available
                const errorText = await response.text();
                let errorMessage = `API call failed with status: ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || errorMessage;
                } catch (jsonError) {
                    // If response is not JSON, use raw text
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            let result = await response.json();

            if (result) { 
                  let panNum = result.data["gstin"].substring(2, 12);
                  result.data.panNum = panNum;
                  setGstInfo(result.data || result);
            } else {
                 setError('No GST details found for this number or unexpected API response structure.');
            }

        } catch (err) {
            console.error("API Fetch Error:", err);
            setError(err.message || 'An unexpected error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to format keys for display (e.g., "legalName" becomes "Legal Name")
    const formatKey = (key) => {
        return key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str) => str.toUpperCase()) // Capitalize the first letter
            .replace(/Gstin/g, 'GSTIN') // Specific replacement for GSTIN
            .replace(/Pan/g, 'PAN')     // Specific replacement for PAN
            .trim();
    };

    const formatAddress = (address) => {
        if (!address) return "N/A";
        const parts = [];
        if (address.door_num) parts.push(address.door_num);
        if (address.building_name) parts.push(address.building_name);
        if (address.street) parts.push(address.street);
        if (address.location) parts.push(address.location);
        if (address.city) parts.push(address.city);
        if (address.district && address.district !== address.city) parts.push(address.district);
        if (address.state) parts.push(address.state);
        if (address.pin_code) parts.push(address.pin_code);
        return parts.join(', ');
    };

    // Main helper function to render values based on their type and key
    const renderValue = (key, value) => {
        if (value === null || value === "") {
            return "N/A";
        }

        if (Array.isArray(value)) {
            // For simple arrays of strings like business_activity_nature
            if (key === 'business_activity_nature' || key === 'nature') { // 'nature' within place_of_business objects
                return value.join(', ');
            }
            // For place_of_business_additional (array of objects)
            if (key === 'place_of_business_additional') {
                return (
                    <div style={{ paddingLeft: '15px', borderLeft: '2px solid #ddd' }}>
                        {value.map((place, index) => (
                            <div key={index} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dotted #ccc' }}>
                                <h4 style={{ margin: '0 0 5px 0', color: '#007bff', fontSize: '1em' }}>Additional Place {index + 1}</h4>
                                {place.address && (
                                    <p style={{ margin: '0 0 5px 0' }}><strong>Address:</strong> {formatAddress(place.address)}</p>
                                )}
                                {place.nature && (
                                    <p style={{ margin: '0' }}><strong>Nature:</strong> {renderValue('nature', place.nature)}</p>
                                )}
                            </div>
                        ))}
                    </div>
                );
            }
            // Fallback for other unexpected arrays
            return value.map((item, index) => String(item)).join(', ');

        } else if (typeof value === 'object') {
            // For place_of_business_principal
            if (key === 'place_of_business_principal') {
                return (
                    <div style={{ paddingLeft: '15px', borderLeft: '2px solid #ddd' }}>
                        {value.address && (
                            <p style={{ margin: '0 0 5px 0' }}><strong>Address:</strong> {formatAddress(value.address)}</p>
                        )}
                        {value.nature && (
                            <p style={{ margin: '0' }}><strong>Nature:</strong> {renderValue('nature', value.nature)}</p>
                        )}
                    </div>
                );
            }
            // For the 'address' object itself within places
            if (key === 'address') {
                return formatAddress(value);
            }
            // For any other unexpected objects, stringify nicely
            return (
                <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em' }}>
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }
        return String(value);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '25px', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: '#fff' }}>
            <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>GST Number Lookup</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="gstInput" style={{ marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Enter GST Number:</label>
                    <input
                        type="text"
                        id="gstInput"
                        value={gstNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., 27ABCDE1234F1Z5"
                        maxLength="15"
                        style={{
                            padding: '12px',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            fontSize: '16px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '12px 25px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '17px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'background-color 0.3s ease',
                        alignSelf: 'center',
                        minWidth: '150px'
                    }}
                >
                    {loading ? 'Fetching...' : 'Get GST Info'}
                </button>
            </form>

            {error && (
                <p style={{ color: '#dc3545', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '5px', padding: '10px', marginTop: '25px', textAlign: 'center' }}>
                    {error}
                </p>
            )}

            {gstInfo && Object.keys(gstInfo).length > 0 && (
                <div style={{ marginTop: '35px', padding: '25px', background: '#e9f7ef', border: '1px solid #d4edda', borderRadius: '8px' }}>
                    <h3 style={{ color: '#218838', marginBottom: '20px', textAlign: 'center' }}>GST Information Details:</h3>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                        <tbody>
                            {/* Iterate through a specific order of fields for main display */}
                            {['gstin','panNum', 'legal_name', 'trade_name', 'status', 'type', 'registration_date', 'cancellation_date', 'business_constitution', 'centre_jurisdiction', 'centre_jurisdiction_code', 'state_jurisdiction', 'state_jurisdiction_code'].map(key => {
                                const value = gstInfo[key];
                                return (
                                    <tr key={key}>
                                        <td style={{ padding: '10px', border: '1px solid #ddd', backgroundColor: '#f2f2f2', width: '35%', fontWeight: 'bold' }}>{formatKey(key)}</td>
                                        <td style={{ padding: '10px', border: '1px solid #ddd', width: '65%' }}>{renderValue(key, value)}</td>
                                    </tr>
                                );
                            })}
                            {/* Render business_activity_nature as a bulleted list or comma-separated */}
                            {gstInfo.business_activity_nature && (
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', backgroundColor: '#f2f2f2', width: '35%', fontWeight: 'bold' }}>{formatKey('business_activity_nature')}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', width: '65%' }}>
                                        {Array.isArray(gstInfo.business_activity_nature) 
                                            ? gstInfo.business_activity_nature.join(', ')
                                            : String(gstInfo.business_activity_nature)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Display Principal Place of Business */}
                    {gstInfo.place_of_business_principal && (
                        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #add8e6', borderRadius: '8px', backgroundColor: '#e0f7fa' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>Principal Place of Business</h4>
                            {renderValue('place_of_business_principal', gstInfo.place_of_business_principal)}
                        </div>
                    )}

                    {/* Display Additional Places of Business */}
                    {gstInfo.place_of_business_additional && gstInfo.place_of_business_additional.length > 0 && (
                        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #add8e6', borderRadius: '8px', backgroundColor: '#e0f7fa' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>Additional Places of Business</h4>
                            {renderValue('place_of_business_additional', gstInfo.place_of_business_additional)}
                        </div>
                    )}

                </div>
            )}

            {gstInfo && Object.keys(gstInfo).length === 0 && !loading && !error && (
                <p style={{ color: '#6c757d', marginTop: '25px', textAlign: 'center', padding: '10px', border: '1px dashed #ced4da', borderRadius: '5px' }}>
                    No specific details found for this GST number. It might be valid but with no public data, or the API returned an empty set.
                </p>
            )}
        </div>
    );
}

export default GstLookup;