const GEMINI_API_KEY = 'AIzaSyBnb1Q3ba3SUOYO-v2Ng7onneCJEmSy8aU'; // Replace with valid Google Gemini API key
const WEATHER_API_KEY = '707eae9f5d5144542de38742fe96e640'; // Replace with valid OpenWeatherMap API key
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const ASTRO_API_BASE_URL = 'https://api.astronomyapi.com/v2'; // AstronomyAPI base URL
const ASTRO_APP_ID = 'your_app_id_here'; // Replace with AstronomyAPI App ID
const ASTRO_APP_SECRET = 'your_app_secret_here'; // Replace with AstronomyAPI App Secret
let stargazingLog = {}; // User's stargazing log { objectName: count }
let cachedLocation = null; // Cache for user's location

// Function to get user's real-time location
async function getUserLocation() {
    if (cachedLocation) {
        return cachedLocation;
    }

    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    cachedLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        city: 'User Location'
                    };
                    resolve(cachedLocation);
                },
                (error) => {
                    console.error('Geolocation Error:', error);
                    // Fallback to Amritsar, India
                    resolve({ lat: 31.64, lon: 74.86, city: 'Amritsar' });
                }
            );
        } else {
            console.error('Geolocation not supported');
            resolve({ lat: 31.64, lon: 74.86, city: 'Amritsar' });
        }
    });
}

// Function to fetch weather details and local time using OpenWeatherMap API
async function fetchWeatherDetails(lat, lon, queryType = 'weather', city = 'Unknown') {
    const chatBox = document.getElementById('chatBox');
    const locationText = city !== 'Unknown' ? city : `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
    chatBox.innerHTML += `<p class="ai-message">AI: Fetching ${queryType} details for ${locationText}...</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // PC current time as fallback
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const pcTime = new Date().toLocaleString('en-US', timeOptions);

    try {
        const response = await fetch(
            `${WEATHER_API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenWeatherMap error! Status: ${response.status}, Message: ${errorText}`);
            throw new Error(`OpenWeatherMap error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('OpenWeatherMap Response:', data); // Debug log

        const cloudCover = data.clouds?.all ?? 'N/A';
        const temp = data.main?.temp ?? 'N/A';
        const humidity = data.main?.humidity ?? 'N/A';
        const visibility = data.visibility ? data.visibility / 1000 : 'N/A';
        const windSpeed = data.wind?.speed ?? 'N/A';
        const description = data.weather?.[0]?.description ?? 'N/A';
        const stargazingSuitability = cloudCover !== 'N/A' && visibility !== 'N/A' ?
            (cloudCover < 30 && visibility > 5 ? 'Good' : cloudCover < 70 && visibility > 3 ? 'Fair' : 'Poor') : 'Unknown';

        // Calculate local time using timezone offset
        const timezoneOffsetSeconds = data.timezone ?? 0; // Fallback to 0 if undefined
        const utcTime = new Date();
        const localTime = new Date(utcTime.getTime() + timezoneOffsetSeconds * 1000);
        const formattedLocalTime = localTime.toLocaleString('en-US', timeOptions);

        // Display based on query type
        let output = `AI: ${queryType.charAt(0).toUpperCase() + queryType.slice(1)} for ${locationText}:\n`;
        if (queryType === 'temperature') {
            output += `Temperature: ${temp !== 'N/A' ? temp + '°C' : 'N/A'}\n` +
                    `Note: For full weather details, ask 'current weather'!`;
        } else if (queryType === 'time') {
            output += `Local Time: ${formattedLocalTime}\n` +
                    `PC Time: ${pcTime}\n` +
                    `Note: For weather details, ask 'current weather'!`;
        } else {
            output += `Local Time: ${formattedLocalTime}\n` +
                    `PC Time: ${pcTime}\n` +
                    `Conditions: ${description}\n` +
                    `Temperature: ${temp !== 'N/A' ? temp + '°C' : 'N/A'}\n` +
                    `Cloud Cover: ${cloudCover !== 'N/A' ? cloudCover + '%' : 'N/A'}\n` +
                    `Humidity: ${humidity !== 'N/A' ? humidity + '%' : 'N/A'}\n` +
                    `Visibility: ${visibility !== 'N/A' ? visibility + ' km' : 'N/A'}\n` +
                    `Wind Speed: ${windSpeed !== 'N/A' ? windSpeed + ' m/s' : 'N/A'}\n` +
                    `Stargazing Suitability: ${stargazingSuitability}\n` +
                    `Note: Clear skies and high visibility are best for stargazing!`;
        }

        chatBox.innerHTML += `<p class="ai-message">${output}</p>`;
    } catch (error) {
        console.error('Weather API Error:', error);
        // Fallback for time queries
        if (queryType === 'time') {
            chatBox.innerHTML += `<p class="ai-message">AI: Couldn’t fetch local time for ${locationText}. Using PC time instead:\n` +
                                `PC Time: ${pcTime}\n` +
                                `Note: For accurate local time, ensure your API key is valid.</p>`;
        } else {
            chatBox.innerHTML += `<p class="ai-message">AI: Couldn’t fetch ${queryType} details for ${locationText}. Ensure your API key is valid or try again later.</p>`;
        }
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to fetch visible constellations using AstronomyAPI
async function fetchVisibleConstellations() {
    const chatBox = document.getElementById('chatBox');
    try {
        const date = new Date().toISOString().split('T')[0];
        const { lat, lon } = await getUserLocation();
        const response = await fetch(
            `${ASTRO_API_BASE_URL}/studio/star-chart`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa(`${ASTRO_APP_ID}:${ASTRO_APP_SECRET}`)
                },
                body: JSON.stringify({
                    observer: {
                        latitude: lat,
                        longitude: lon,
                        date: date
                    },
                    style: 'default',
                    view: {
                        type: 'area',
                        parameters: {
                            width: 800,
                            height: 600
                        }
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`AstronomyAPI error! Status: ${response.status}`);
        }

        const data = await response.json();
        const visibleObjects = data.data.constellations?.map(c => c.name) ?? [];
        return visibleObjects.length > 0 ? visibleObjects : ['Orion', 'Sirius', 'Andromeda', 'Polaris'];
    } catch (error) {
        console.error('AstronomyAPI Error:', error);
        chatBox.innerHTML += `<p class="ai-message">AI: Couldn’t fetch visible constellations. Falling back to default list.</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
        return ['Orion', 'Sirius', 'Andromeda', 'Polaris'];
    }
}

// Function to fetch details about a celestial object using AstronomyAPI
async function fetchCelestialDetails(objectId) {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<p class="ai-message">AI: Fetching details for ${objectId}...</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch(
            `${ASTRO_API_BASE_URL}/bodies`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa(`${ASTRO_APP_ID}:${ASTRO_APP_SECRET}`)
                }
            }
        );

        if (!response.ok) {
            throw new Error(`AstronomyAPI error! Status: ${response.status}`);
        }

        const data = await response.json();
        const object = data.data.bodies?.find(b => b.name.toLowerCase() === objectId.toLowerCase());
        if (object) {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            chatBox.innerHTML += `<p class="ai-message">AI: Details for ${object.name} (as of ${today}):\n` +
                `Type: ${object.type || 'Unknown'}\n` +
                `Description: ${object.description || 'No description available'}\n` +
                `Apparent Magnitude: ${object.magnitude || 'Unknown'}\n` +
                `Best Viewing: ${object.bestViewing || 'Varies by location'}\n` +
                `Note: Add to your stargazing log with 'Add ${object.name}'!</p>`;
        } else {
            chatBox.innerHTML += `<p class="ai-message">AI: No data found for ${objectId}. Try 'Orion', 'Sirius', 'Andromeda', or 'Polaris'.</p>`;
        }
    } catch (error) {
        console.error('AstronomyAPI Error:', error);
        chatBox.innerHTML += `<p class="ai-message">AI: Failed to fetch details for ${objectId}. Please try again later.</p>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to calculate total objects in stargazing log
async function calculateLogSummary() {
    const totalObjects = Object.values(stargazingLog).reduce((sum, count) => sum + count, 0);
    const breakdown = Object.entries(stargazingLog).map(([objectId, count]) => {
        return `${objectId}: ${count} observation(s)`;
    }).join('\n');
    return { totalObjects, breakdown };
}

// Function to handle user messages
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (!message) return;

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<p class="user-message">You: ${message}</p>`;
    chatInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Developer-related queries
    const lowerMessage = message.toLowerCase();
    if ((lowerMessage.includes('who') || lowerMessage.includes('whose')) && 
        (lowerMessage.includes('developer') || lowerMessage.includes('made') || lowerMessage.includes('make') || lowerMessage.includes('created') || lowerMessage.includes('built'))) {
        chatBox.innerHTML += `<p class="ai-message">AI: I was created by Praneet, Rohit, and Manoj. Happy stargazing!</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
        return;
    }

    // Query detection
    const isDetailsQuery = lowerMessage.includes('about') || lowerMessage.includes('tell me');
    const isLogQuery = lowerMessage.includes('log') || lowerMessage.includes('add') || lowerMessage.includes('remove') || lowerMessage.includes('show');
    const isCelestialQuery = lowerMessage.includes('orion') || lowerMessage.includes('sirius') || lowerMessage.includes('andromeda') || lowerMessage.includes('polaris');
    const isWeatherQuery = lowerMessage.includes('weather') && (lowerMessage.includes('tonight') || lowerMessage.includes('now') || lowerMessage.includes('current'));
    const isTempQuery = lowerMessage.includes('temperature') && lowerMessage.includes('current');
    const isTimeQuery = lowerMessage.includes('time') && lowerMessage.includes('current');

    if (isCelestialQuery && isDetailsQuery) {
        const objectId = lowerMessage.includes('orion') ? 'orion' :
                        lowerMessage.includes('sirius') ? 'sirius' :
                        lowerMessage.includes('andromeda') ? 'andromeda' :
                        lowerMessage.includes('polaris') ? 'polaris' : null;
        if (objectId) await fetchCelestialDetails(objectId);
        else {
            chatBox.innerHTML += `<p class="ai-message">AI: Please specify a valid celestial object (e.g., 'Tell me about Orion').</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    } else if (isTempQuery) {
        const location = await getUserLocation();
        await fetchWeatherDetails(location.lat, location.lon, 'temperature', location.city);
    } else if (isTimeQuery) {
        const location = await getUserLocation();
        await fetchWeatherDetails(location.lat, location.lon, 'time', location.city);
    } else if (isWeatherQuery) {
        const location = await getUserLocation();
        await fetchWeatherDetails(location.lat, location.lon, 'weather', location.city);
    } else if (isLogQuery) {
        if (lowerMessage.includes('add')) {
            const match = lowerMessage.match(/add\s+(\w+)/);
            if (match) {
                const objectId = match[1].toLowerCase();
                if (['orion', 'sirius', 'andromeda', 'polaris'].includes(objectId)) {
                    stargazingLog[objectId] = (stargazingLog[objectId] || 0) + 1;
                    chatBox.innerHTML += `<p class="ai-message">AI: Added ${objectId} to your stargazing log. Use 'Show log' to see your observations!</p>`;
                } else {
                    chatBox.innerHTML += `<p class="ai-message">AI: Invalid object. Use 'Add Orion', 'Add Sirius', etc.</p>`;
                }
            } else {
                chatBox.innerHTML += `<p class="ai-message">AI: Use format 'Add Orion' to add to your stargazing log.</p>`;
            }
        } else if (lowerMessage.includes('remove')) {
            const match = lowerMessage.match(/remove\s+(\w+)/);
            if (match) {
                const objectId = match[1].toLowerCase();
                if (stargazingLog[objectId]) {
                    stargazingLog[objectId]--;
                    if (stargazingLog[objectId] === 0) delete stargazingLog[objectId];
                    chatBox.innerHTML += `<p class="ai-message">AI: Removed one ${objectId} observation from your log. Use 'Show log' to check!</p>`;
                } else {
                    chatBox.innerHTML += `<p class="ai-message">AI: Object not in log. Check with 'Show log'.</p>`;
                }
            } else {
                chatBox.innerHTML += `<p class="ai-message">AI: Use format 'Remove Orion' to remove from your log.</p>`;
            }
        } else if (lowerMessage.includes('show log')) {
            const { totalObjects, breakdown } = await calculateLogSummary();
            chatBox.innerHTML += `<p class="ai-message">AI: Your Stargazing Log:\n${breakdown || 'No observations yet'}\nTotal Observations: ${totalObjects}\nNote: Add objects with 'Add Orion'!</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        } else if (lowerMessage.includes('visible tonight')) {
            const constellations = await fetchVisibleConstellations();
            if (constellations) {
                chatBox.innerHTML += `<p class="ai-message">AI: Visible tonight: ${constellations.join(', ')}. Try 'Tell me about Orion' for details!</p>`;
            } else {
                chatBox.innerHTML += `<p class="ai-message">AI: Couldn’t fetch visible constellations. Try again later!</p>`;
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    } else {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `You are a friendly stargazing guide chatbot created by Praneet, Rohit, and Manoj. Answer the following question naturally and informatively, focusing on stargazing, stars, and constellations if relevant: "${message}". If unrelated, suggest asking about celestial objects (e.g., 'Tell me about Orion'), stargazing log actions (e.g., 'Add Orion'), or weather/time (e.g., 'Current weather', 'Current time').`
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;
            chatBox.innerHTML += `<p class="ai-message">AI: ${aiResponse}</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        } catch (error) {
            console.error('Gemini API error:', error);
            chatBox.innerHTML += `<p class="ai-message">AI: Oops! I couldn’t process that. Try asking about stars (e.g., 'Tell me about Sirius'), your log (e.g., 'Show log'), or weather/time (e.g., 'Current weather', 'Current time')!</p>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }
}

document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});