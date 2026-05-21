export type City = { name: string; country: string; lat: number; lon: number };

export const CITIES: City[] = [
  // Africa
  { name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.45, lon: 3.39 },
  { name: 'Accra', country: 'Ghana', lat: 5.55, lon: -0.20 },
  { name: 'Addis Ababa', country: 'Ethiopia', lat: 9.03, lon: 38.74 },
  { name: 'Dar es Salaam', country: 'Tanzania', lat: -6.79, lon: 39.21 },
  { name: 'Kigali', country: 'Rwanda', lat: -1.94, lon: 30.06 },
  { name: 'Kampala', country: 'Uganda', lat: 0.31, lon: 32.58 },
  { name: 'Lusaka', country: 'Zambia', lat: -15.42, lon: 28.28 },
  { name: 'Harare', country: 'Zimbabwe', lat: -17.83, lon: 31.05 },
  { name: 'Maputo', country: 'Mozambique', lat: -25.97, lon: 32.59 },
  { name: 'Abidjan', country: "Côte d'Ivoire", lat: 5.36, lon: -4.01 },
  { name: 'Dakar', country: 'Senegal', lat: 14.69, lon: -17.44 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.59, lon: -7.62 },
  { name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24 },
  { name: 'Tunis', country: 'Tunisia', lat: 36.82, lon: 10.18 },
  { name: 'Algiers', country: 'Algeria', lat: 36.74, lon: 3.06 },
  { name: 'Kinshasa', country: 'DR Congo', lat: -4.32, lon: 15.32 },
  { name: 'Luanda', country: 'Angola', lat: -8.84, lon: 13.23 },
  { name: 'Antananarivo', country: 'Madagascar', lat: -18.92, lon: 47.54 },
  { name: 'Bamako', country: 'Mali', lat: 12.65, lon: -8.00 },
  { name: 'Ouagadougou', country: 'Burkina Faso', lat: 12.36, lon: -1.53 },
  { name: 'Conakry', country: 'Guinea', lat: 9.54, lon: -13.67 },
  { name: 'Freetown', country: 'Sierra Leone', lat: 8.49, lon: -13.23 },
  { name: 'Monrovia', country: 'Liberia', lat: 6.30, lon: -10.80 },
  { name: 'Brazzaville', country: 'Republic of Congo', lat: -4.27, lon: 15.28 },
  { name: 'Windhoek', country: 'Namibia', lat: -22.56, lon: 17.09 },
  { name: 'Gaborone', country: 'Botswana', lat: -24.65, lon: 25.91 },
  { name: 'Maseru', country: 'Lesotho', lat: -29.32, lon: 27.48 },
  { name: 'Mbabane', country: 'Eswatini', lat: -26.32, lon: 31.14 },
  { name: 'Lomé', country: 'Togo', lat: 6.14, lon: 1.22 },
  { name: 'Cotonou', country: 'Benin', lat: 6.37, lon: 2.42 },
  { name: 'Porto-Novo', country: 'Benin', lat: 6.50, lon: 2.63 },
  { name: 'Niamey', country: 'Niger', lat: 13.52, lon: 2.11 },
  { name: 'Ndjamena', country: 'Chad', lat: 12.11, lon: 15.04 },
  { name: 'Khartoum', country: 'Sudan', lat: 15.55, lon: 32.53 },
  { name: 'Mogadishu', country: 'Somalia', lat: 2.05, lon: 45.34 },
  { name: 'Djibouti', country: 'Djibouti', lat: 11.59, lon: 43.14 },
  { name: 'Asmara', country: 'Eritrea', lat: 15.33, lon: 38.93 },

  // Asia
  { name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { name: 'Delhi', country: 'India', lat: 28.67, lon: 77.21 },
  { name: 'Bangalore', country: 'India', lat: 12.97, lon: 77.59 },
  { name: 'Chennai', country: 'India', lat: 13.08, lon: 80.27 },
  { name: 'Kolkata', country: 'India', lat: 22.57, lon: 88.36 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.72, lon: 90.41 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.86, lon: 67.01 },
  { name: 'Lahore', country: 'Pakistan', lat: 31.55, lon: 74.34 },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.93, lon: 79.84 },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32 },
  { name: 'Kabul', country: 'Afghanistan', lat: 34.52, lon: 69.18 },
  { name: 'Yangon', country: 'Myanmar', lat: 16.87, lon: 96.19 },
  { name: 'Phnom Penh', country: 'Cambodia', lat: 11.56, lon: 104.92 },
  { name: 'Vientiane', country: 'Laos', lat: 17.97, lon: 102.60 },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.03, lon: 105.85 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.82, lon: 106.63 },
  { name: 'Manila', country: 'Philippines', lat: 14.60, lon: 120.98 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.21, lon: 106.85 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.14, lon: 101.69 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.75, lon: 100.52 },
  { name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.72, lon: 90.41 },
  { name: 'Tehran', country: 'Iran', lat: 35.69, lon: 51.42 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.34, lon: 44.40 },
  { name: 'Amman', country: 'Jordan', lat: 31.96, lon: 35.95 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.89, lon: 35.50 },
  { name: 'Damascus', country: 'Syria', lat: 33.51, lon: 36.29 },
  { name: 'Sanaa', country: 'Yemen', lat: 15.37, lon: 44.19 },
  { name: 'Muscat', country: 'Oman', lat: 23.61, lon: 58.59 },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32 },
  { name: 'Thimphu', country: 'Bhutan', lat: 27.47, lon: 89.64 },
  { name: 'Dili', country: 'Timor-Leste', lat: -8.56, lon: 125.58 },

  // Latin America
  { name: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13 },
  { name: 'Bogotá', country: 'Colombia', lat: 4.71, lon: -74.07 },
  { name: 'Lima', country: 'Peru', lat: -12.05, lon: -77.04 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.60, lon: -58.38 },
  { name: 'Santiago', country: 'Chile', lat: -33.46, lon: -70.65 },
  { name: 'Caracas', country: 'Venezuela', lat: 10.48, lon: -66.88 },
  { name: 'Quito', country: 'Ecuador', lat: -0.21, lon: -78.49 },
  { name: 'La Paz', country: 'Bolivia', lat: -16.50, lon: -68.15 },
  { name: 'Asunción', country: 'Paraguay', lat: -25.29, lon: -57.65 },
  { name: 'Montevideo', country: 'Uruguay', lat: -34.90, lon: -56.19 },
  { name: 'Havana', country: 'Cuba', lat: 23.13, lon: -82.38 },
  { name: 'San José', country: 'Costa Rica', lat: 9.93, lon: -84.08 },
  { name: 'Guatemala City', country: 'Guatemala', lat: 14.64, lon: -90.51 },
  { name: 'Tegucigalpa', country: 'Honduras', lat: 14.10, lon: -87.21 },
  { name: 'Managua', country: 'Nicaragua', lat: 12.13, lon: -86.28 },
  { name: 'Panama City', country: 'Panama', lat: 8.99, lon: -79.52 },
  { name: 'Port-au-Prince', country: 'Haiti', lat: 18.54, lon: -72.34 },
  { name: 'Santo Domingo', country: 'Dominican Republic', lat: 18.48, lon: -69.90 },
  { name: 'Paramaribo', country: 'Suriname', lat: 5.87, lon: -55.17 },
  { name: 'Georgetown', country: 'Guyana', lat: 6.80, lon: -58.16 },

  // Europe (selective developing-economy focus)
  { name: 'Tirana', country: 'Albania', lat: 41.33, lon: 19.82 },
  { name: 'Skopje', country: 'North Macedonia', lat: 42.00, lon: 21.43 },
  { name: 'Pristina', country: 'Kosovo', lat: 42.67, lon: 21.17 },
  { name: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.85, lon: 18.38 },
  { name: 'Chisinau', country: 'Moldova', lat: 47.01, lon: 28.86 },
  { name: 'Yerevan', country: 'Armenia', lat: 40.18, lon: 44.51 },
  { name: 'Tbilisi', country: 'Georgia', lat: 41.69, lon: 44.83 },
  { name: 'Baku', country: 'Azerbaijan', lat: 40.41, lon: 49.87 },
  { name: 'Bishkek', country: 'Kyrgyzstan', lat: 42.87, lon: 74.59 },
  { name: 'Dushanbe', country: 'Tajikistan', lat: 38.56, lon: 68.77 },
  { name: 'Ashgabat', country: 'Turkmenistan', lat: 37.95, lon: 58.38 },
  { name: 'Tashkent', country: 'Uzbekistan', lat: 41.30, lon: 69.24 },

  // Pacific / Oceania
  { name: 'Port Moresby', country: 'Papua New Guinea', lat: -9.44, lon: 147.17 },
  { name: 'Suva', country: 'Fiji', lat: -18.14, lon: 178.44 },
  { name: 'Honiara', country: 'Solomon Islands', lat: -9.43, lon: 160.05 },
  { name: 'Port Vila', country: 'Vanuatu', lat: -17.73, lon: 168.32 },
  { name: 'Apia', country: 'Samoa', lat: -13.83, lon: -171.77 },
  { name: 'Nuku\'alofa', country: 'Tonga', lat: -21.14, lon: -175.22 },
];

/** Returns the nearest city within 300 km, or null */
export function nearestCity(lat: number, lon: number): City | null {
  let best: City | null = null;
  let bestDist = Infinity;
  for (const c of CITIES) {
    const d = Math.sqrt((c.lat - lat) ** 2 + (c.lon - lon) ** 2);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist < 3 ? best : null;
}

/** Attempt to geolocate via browser API, resolve to nearest city */
export async function detectCity(): Promise<City | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve(nearestCity(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { timeout: 5_000 },
    );
  });
}
