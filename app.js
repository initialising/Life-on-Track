let map;
let userLocationMarker;
let lastBlueCircle = null; // Merkt sich den letzten blauen Kreis
let visitedDistricts = 0;
let visitedCities = 0;
let visitedCountries = 0;
let totalDistricts = 100;
let totalCities = 200;
let totalCountries = 195;
let visitedAreas = [];
const areaCache = {};
const visitFrequencyMap = {}; // Für spätere Nutzung (z B. Farbintensität)

let countryGeoJson = null;

// Länder-Grenzdaten laden und Stats initialisieren
function loadCountryGeoJson() {
    fetch('countries.geojson')
        .then(res => res.json())
        .then(data => {
            countryGeoJson = data;
            initStatsFromLocalStorage();
        })
        .catch(err => {
            console.error("Fehler beim Laden von countries.geojson:", err);
        });
}

// Punkt-in-Polygon-Test
function isPointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Bestimme Land anhand Koordinaten
function getCountryFromGeoJSON(lat, lon) {
    if (!countryGeoJson) return null;
    for (const feature of countryGeoJson.features) {
        const geometry = feature.geometry;
        const coords = geometry.coordinates;
        const name = feature.properties.name;

        if (geometry.type === "Polygon") {
            if (isPointInPolygon([lon, lat], coords[0])) return name;
        } else if (geometry.type === "MultiPolygon") {
            for (const poly of coords) {
                if (isPointInPolygon([lon, lat], poly[0])) return name;
            }
        }
    }
    return null;
}

// Lade gespeicherte Kreise und berechne Länder
function initStatsFromLocalStorage() {
    const circles = JSON.parse(localStorage.getItem('visitedCircles') || '[]');
    const countedCountries = new Set();

    visitedDistricts = circles.length;
    visitedCountries = 0; // <--- HIER hinzufügen, damit bei jedem Aufruf korrekt neu gezählt wird

    circles.forEach(c => {
        const country = getCountryFromGeoJSON(c.lat, c.lon);
        if (country && !countedCountries.has(country)) {
            countedCountries.add(country);
            visitedCountries++;
        }
    });

    updateStats();
}

function addAndStoreCurrentLocation(lat, lon) {   // Vorherigen blauen Kreis grün färben und speichern
    if (lastBlueCircle) {
        lastBlueCircle.setStyle({
            fillColor: 'rgb(107, 142, 35)',
            color: 'green',
            fillOpacity: 0.5,
            weight: 0.5
        });

        const oldLatLng = lastBlueCircle.getLatLng();
        saveVisitedCircle(oldLatLng.lat, oldLatLng.lng);
    } else {
        // ERSTER PUNKT: direkt speichern!
        drawAndSaveGreenCircle(lat, lon);
    }

    // Neuen blauen Kreis setzen
    const blueCircle = L.circle([lat, lon], {
        radius: 10,
        color: 'blue',
        weight: 1,
        fillOpacity: 0.2
    }).addTo(map);

    lastBlueCircle = blueCircle;
}


function initMap() {
    map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            map.setView([lat, lon], 18);

            if (userLocationMarker) {
                userLocationMarker.setLatLng([lat, lon]);
            } else {
                userLocationMarker = L.marker([lat, lon]).addTo(map);
            }

            addAndStoreCurrentLocation(lat, lon);

        }, function (error) {
            alert("Unable to retrieve your location. " + error.message);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function focusCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            map.setView([lat, lon], 18);

            if (userLocationMarker) {
                userLocationMarker.setLatLng([lat, lon]);
            } else {
                userLocationMarker = L.marker([lat, lon]).addTo(map);
            }

            // Wenn es bereits einen blauen Kreis gab, speichere einen grünen an der alten Position
            if (lastBlueCircle) {
                const oldLatLng = lastBlueCircle.getLatLng();
                drawAndSaveGreenCircle(oldLatLng.lat, oldLatLng.lng);
                map.removeLayer(lastBlueCircle); // Entferne den alten blauen Kreis
            }

            // Erzeuge den neuen blauen Kreis
            const blueCircle = L.circle([lat, lon], {
                radius: 10,
                color: 'blue',
                weight: 1,
                fillOpacity: 0.2
            }).addTo(map);

            lastBlueCircle = blueCircle;

        }, function (error) {
            alert("Unable to retrieve your location. " + error.message);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function drawAndSaveGreenCircle(lat, lon) { //speichert grüne Kreise
    L.circle([lat, lon], {
        radius: 10,
        fillColor: 'rgb(107, 142, 35)',
        color: 'green',
        weight: 0.5,
        fillOpacity: 0.5
    }).addTo(map);

    saveVisitedCircle(lat, lon);
}


function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    if (sectionId === 'map' && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
   }
} 



function updateStats() {
    const districtsPercentage = (visitedDistricts / totalDistricts) * 100;
    const citiesPercentage = (visitedCities / totalCities) * 100;
    const countriesPercentage = (visitedCountries / totalCountries) * 100;
    const worldPercentage = (visitedCountries / 195) * 100;

    document.getElementById('districtsCovered').innerText = `${districtsPercentage.toFixed(2)}%`;
    document.getElementById('citiesCovered').innerText = `${citiesPercentage.toFixed(2)}%`;
    document.getElementById('countriesCovered').innerText = `${countriesPercentage.toFixed(2)}%`;
    document.getElementById('worldCoverage').innerText = `${worldPercentage.toFixed(2)}%`;
}

const leaderboardData = [
    { name: 'User 1', score: 100 },
    { name: 'User 2', score: 90 },
    { name: 'User 3', score: 85 },
    { name: 'User 4', score: 80 },
];

function updateLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    leaderboardData.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name}: ${user.score} points`;
        list.appendChild(li);
    });
}

document.getElementById('timelineUpload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const status = document.getElementById('uploadStatus');

    if (!file) {
        status.textContent = 'No file selected.';
        return;
    }

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            await processTimelineData(data);
            status.textContent = 'File uploaded and processed successfully!';
        } catch (err) {
            console.error(err);
            status.textContent = 'Failed to parse file. Make sure it’s a valid Google Maps JSON export.';
        }
    };

    reader.readAsText(file);
});

async function processTimelineData(data) {
    if (!data.timelineObjects) {
        console.warn("timelineObjects not found in JSON");
        return;
    }

    let locationCount = 0;

    for (const obj of data.timelineObjects) {
        if (obj.placeVisit && obj.placeVisit.location) {
            const lat = obj.placeVisit.location.latitudeE7 / 1e7;
            const lon = obj.placeVisit.location.longitudeE7 / 1e7;

            const area = await getAreaFromCoordinates(lat, lon);

            if (!visitedAreas.includes(area)) {
                visitedAreas.push(area);
            }

            colorAreaGreen(lat, lon); // <-- richtige Koordinaten

            locationCount++;
        }
    }

    console.log(`Processed ${locationCount} locations.`);
}

async function getAreaFromCoordinates(lat, lon) {
    const key = `${Math.floor(lat * 100)}-${Math.floor(lon * 100)}`;

    if (areaCache[key]) {
        return areaCache[key];
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'LifeOnTrackApp/1.0 (your_email@example.com)'
            }
        });
        const data = await response.json();
        if (data.address) {
            const { city, town, village, state, country } = data.address;
            const areaName = city || town || village || state || country || key;
            areaCache[key] = areaName;
            return areaName;
        }
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
    }

    areaCache[key] = key;
    return key;
}

function colorAreaGreen(lat, lon) {
    L.circle([lat, lon], {
        radius: 10,
        fillColor: 'rgb(107, 142, 35)', // richtiges grün
        color: 'green',
        weight: 0.5,
        fillOpacity: 0.5
    }).addTo(map);

    saveVisitedCircle(lat, lon); 
}

// Speichern besuchter Orte
function saveVisitedCircle(lat, lon) {
    const precision = 1e-4; // ca. 11 Meter Genauigkeit
    const roundedLat = Math.round(lat / precision) * precision;
    const roundedLon = Math.round(lon / precision) * precision;

    const circles = JSON.parse(localStorage.getItem('visitedCircles') || '[]');

    const distanceThreshold = 0.0001; // ~10m

    const alreadyExists = circles.some(c => {
    return Math.abs(c.lat - lat) < distanceThreshold && Math.abs(c.lon - lon) < distanceThreshold;
    });


    if (!alreadyExists) {
        circles.push({ lat: roundedLat, lon: roundedLon });
        localStorage.setItem('visitedCircles', JSON.stringify(circles));
    }
}


// Herstellen besuchter Orte
function loadVisitedCircles() {
    const circles = JSON.parse(localStorage.getItem('visitedCircles') || '[]');
    const seen = new Set();
    let count = 0;

    for (const { lat, lon } of circles) {
        // Runde auf 5 Dezimalstellen (ungefähr 1 m Genauigkeit) zum Duplikat-Erkennen
        const key = `${lat.toFixed(5)}-${lon.toFixed(5)}`;
        if (!seen.has(key)) {
            seen.add(key);
            colorAreaGreen(lat, lon);
            count++;
            if (count >= 1000) break; // Lade maximal 1000 Kreise
        }
    }

    console.log(`Loaded ${count} unique visited circles.`);
}


document.getElementById('mapIcon').addEventListener('click', () => {
    showSection('map');
    focusCurrentLocation();
});
document.getElementById('statsIcon').addEventListener('click', () => {
    showSection('stats');
    updateStats();
});
document.getElementById('leaderboardIcon').addEventListener('click', () => {
    showSection('leaderboard');
    updateLeaderboard();
});

window.onload = () => {
    initMap();
    loadVisitedCircles();
    loadCountryGeoJson();
    updateLeaderboard();
    showSection('map');
};
