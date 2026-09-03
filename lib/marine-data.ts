export interface MarineLocation {
  id: string;
  name: string;
  state: string;
  sea: "Bay of Bengal" | "Arabian Sea" | "Indian Ocean";
  lat: number;
  lon: number;
  sst: number; // °C
  chlorophyll: number; // mg/m³
  windSpeed: number; // knots
  windDirection: string; // e.g. "ENE", "SW"
  windDegrees: number;
  waveHeight: number; // meters (SWH)
  wavePeriod: number; // seconds
  swellHeight: number; // meters
  swellPeriod: number; // seconds
  currentSpeed: number; // m/s
  currentDirection: string;
  tideStatus: "Rising" | "Falling" | "High" | "Low";
  nextHighTide: string;
  nextLowTide: string;
  riskScore: number; // 0 - 100
  riskLevel: "Low" | "Moderate" | "Elevated" | "Severe";
  weather: {
    condition: "Fair" | "Cloudy" | "Light Rain" | "Squally" | "Thunderstorm";
    temp: number; // °C
    humidity: number; // %
    visibility: number; // km
    pressure: number; // hPa
  };
}

export const marineLocations: MarineLocation[] = [
  {
    id: "vizag",
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    sea: "Bay of Bengal",
    lat: 17.6868,
    lon: 83.2185,
    sst: 28.4,
    chlorophyll: 0.85,
    windSpeed: 14,
    windDirection: "ENE",
    windDegrees: 65,
    waveHeight: 1.6,
    wavePeriod: 7.8,
    swellHeight: 1.2,
    swellPeriod: 11.5,
    currentSpeed: 0.42,
    currentDirection: "NE",
    tideStatus: "Rising",
    nextHighTide: "08:42 AM (1.35m)",
    nextLowTide: "02:50 PM (0.28m)",
    riskScore: 28,
    riskLevel: "Low",
    weather: {
      condition: "Fair",
      temp: 29.2,
      humidity: 78,
      visibility: 12,
      pressure: 1011,
    },
  },
  {
    id: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    sea: "Bay of Bengal",
    lat: 13.0827,
    lon: 80.2707,
    sst: 29.1,
    chlorophyll: 0.92,
    windSpeed: 18,
    windDirection: "NE",
    windDegrees: 45,
    waveHeight: 2.1,
    wavePeriod: 8.4,
    swellHeight: 1.7,
    swellPeriod: 12.0,
    currentSpeed: 0.65,
    currentDirection: "NNE",
    tideStatus: "High",
    nextHighTide: "07:15 AM (1.20m)",
    nextLowTide: "01:30 PM (0.35m)",
    riskScore: 42,
    riskLevel: "Moderate",
    weather: {
      condition: "Cloudy",
      temp: 28.6,
      humidity: 82,
      visibility: 9,
      pressure: 1009,
    },
  },
  {
    id: "kochi",
    name: "Kochi",
    state: "Kerala",
    sea: "Arabian Sea",
    lat: 9.9312,
    lon: 76.2673,
    sst: 28.8,
    chlorophyll: 1.24,
    windSpeed: 11,
    windDirection: "WNW",
    windDegrees: 290,
    waveHeight: 1.3,
    wavePeriod: 6.9,
    swellHeight: 0.9,
    swellPeriod: 9.8,
    currentSpeed: 0.38,
    currentDirection: "SSE",
    tideStatus: "Falling",
    nextHighTide: "11:20 AM (0.95m)",
    nextLowTide: "05:10 PM (0.18m)",
    riskScore: 22,
    riskLevel: "Low",
    weather: {
      condition: "Light Rain",
      temp: 27.5,
      humidity: 88,
      visibility: 8,
      pressure: 1012,
    },
  },
  {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    sea: "Arabian Sea",
    lat: 18.922,
    lon: 72.8347,
    sst: 27.9,
    chlorophyll: 0.74,
    windSpeed: 16,
    windDirection: "NW",
    windDegrees: 315,
    waveHeight: 1.8,
    wavePeriod: 7.2,
    swellHeight: 1.4,
    swellPeriod: 10.4,
    currentSpeed: 0.52,
    currentDirection: "S",
    tideStatus: "Rising",
    nextHighTide: "09:30 AM (3.80m)",
    nextLowTide: "03:45 PM (1.10m)",
    riskScore: 35,
    riskLevel: "Moderate",
    weather: {
      condition: "Fair",
      temp: 30.1,
      humidity: 71,
      visibility: 10,
      pressure: 1013,
    },
  },
  {
    id: "paradip",
    name: "Paradip",
    state: "Odisha",
    sea: "Bay of Bengal",
    lat: 20.3164,
    lon: 86.6114,
    sst: 27.8,
    chlorophyll: 1.45,
    windSpeed: 24,
    windDirection: "E",
    windDegrees: 90,
    waveHeight: 2.8,
    wavePeriod: 9.1,
    swellHeight: 2.3,
    swellPeriod: 13.2,
    currentSpeed: 0.85,
    currentDirection: "NE",
    tideStatus: "Falling",
    nextHighTide: "06:40 AM (2.10m)",
    nextLowTide: "01:05 PM (0.45m)",
    riskScore: 68,
    riskLevel: "Elevated",
    weather: {
      condition: "Squally",
      temp: 26.8,
      humidity: 92,
      visibility: 5,
      pressure: 1004,
    },
  },
  {
    id: "kanyakumari",
    name: "Kanyakumari",
    state: "Tamil Nadu",
    sea: "Indian Ocean",
    lat: 8.0883,
    lon: 77.5385,
    sst: 28.5,
    chlorophyll: 0.98,
    windSpeed: 21,
    windDirection: "ENE",
    windDegrees: 70,
    waveHeight: 2.4,
    wavePeriod: 8.8,
    swellHeight: 2.0,
    swellPeriod: 14.1,
    currentSpeed: 0.72,
    currentDirection: "W",
    tideStatus: "Low",
    nextHighTide: "10:15 AM (0.85m)",
    nextLowTide: "04:30 PM (0.12m)",
    riskScore: 54,
    riskLevel: "Moderate",
    weather: {
      condition: "Cloudy",
      temp: 28.0,
      humidity: 79,
      visibility: 11,
      pressure: 1010,
    },
  },
];

export interface PFZZone {
  id: string;
  name: string;
  referencePort: string;
  lat: number;
  lon: number;
  distanceNM: number;
  bearing: string;
  bearingDeg: number;
  depthMeters: number;
  sstC: number;
  sstGradientC: string;
  chlorophyllMgM3: number;
  suitabilityScore: number; // 0 - 100
  suitabilityText: "Very High" | "High" | "Moderate" | "Marginal";
  primarySpecies: string[];
  recommendedGear: string;
  advisoryValidity: string;
  fuelEstimatedLiters: number;
  transitHours: number;
}

export const pfzZones: PFZZone[] = [
  {
    id: "pfz-vizag-01",
    name: "Bheemunipatnam Offshore Front (East Sector-A)",
    referencePort: "Visakhapatnam",
    lat: 17.892,
    lon: 83.584,
    distanceNM: 18.2,
    bearing: "ENE",
    bearingDeg: 68,
    depthMeters: 55,
    sstC: 27.9,
    sstGradientC: "0.8°C / 2km Front",
    chlorophyllMgM3: 1.15,
    suitabilityScore: 94,
    suitabilityText: "Very High",
    primarySpecies: ["Yellowfin Tuna", "Skipjack", "Indian Mackerel", "Sardines"],
    recommendedGear: "Gillnet / Hook & Line",
    advisoryValidity: "Next 36 Hours (INCOIS Confirmed)",
    fuelEstimatedLiters: 42,
    transitHours: 1.8,
  },
  {
    id: "pfz-vizag-02",
    name: "Kalingapatnam Shelf Boundary",
    referencePort: "Visakhapatnam",
    lat: 18.214,
    lon: 84.112,
    distanceNM: 44.5,
    bearing: "NE",
    bearingDeg: 42,
    depthMeters: 85,
    sstC: 28.1,
    sstGradientC: "0.6°C / 3km Front",
    chlorophyllMgM3: 0.92,
    suitabilityScore: 86,
    suitabilityText: "High",
    primarySpecies: ["Seer Fish (King Mackerel)", "Carangids", "Tuna"],
    recommendedGear: "Trolling / Longline",
    advisoryValidity: "Next 24 Hours",
    fuelEstimatedLiters: 98,
    transitHours: 4.2,
  },
  {
    id: "pfz-chennai-01",
    name: "Pulicat Shoal Chlorophyll Bloom",
    referencePort: "Chennai",
    lat: 13.412,
    lon: 80.481,
    distanceNM: 22.8,
    bearing: "NNE",
    bearingDeg: 28,
    depthMeters: 40,
    sstC: 28.6,
    sstGradientC: "0.9°C / 1.5km Front",
    chlorophyllMgM3: 1.38,
    suitabilityScore: 91,
    suitabilityText: "Very High",
    primarySpecies: ["Prawns / Shrimps", "Ribbonfish", "Pomfret", "Anchovy"],
    recommendedGear: "Trawl Net / Bottom Gillnet",
    advisoryValidity: "Next 48 Hours",
    fuelEstimatedLiters: 52,
    transitHours: 2.2,
  },
  {
    id: "pfz-kochi-01",
    name: "Wadge Bank Edge Upwelling",
    referencePort: "Kochi",
    lat: 9.612,
    lon: 75.814,
    distanceNM: 28.4,
    bearing: "WSW",
    bearingDeg: 245,
    depthMeters: 65,
    sstC: 27.5,
    sstGradientC: "1.2°C / 2km Upwelling",
    chlorophyllMgM3: 1.62,
    suitabilityScore: 96,
    suitabilityText: "Very High",
    primarySpecies: ["Indian Oil Sardine", "Mackerel", "Squid", "Snapper"],
    recommendedGear: "Ring Seine / Purse Seine",
    advisoryValidity: "Next 36 Hours",
    fuelEstimatedLiters: 65,
    transitHours: 2.6,
  },
  {
    id: "pfz-paradip-01",
    name: "Dhamra Estuarine Thermal Confluence",
    referencePort: "Paradip",
    lat: 20.651,
    lon: 87.124,
    distanceNM: 32.1,
    bearing: "ENE",
    bearingDeg: 62,
    depthMeters: 38,
    sstC: 27.2,
    sstGradientC: "1.0°C / 2km Front",
    chlorophyllMgM3: 1.84,
    suitabilityScore: 78,
    suitabilityText: "Moderate",
    primarySpecies: ["Hilsa", "Croakers", "Catfish", "Pomfret"],
    recommendedGear: "Drift Gillnet",
    advisoryValidity: "Caution: High Sea State",
    fuelEstimatedLiters: 74,
    transitHours: 3.1,
  },
];

export interface MarineAlert {
  id: string;
  source: "Official INCOIS" | "Official IMD" | "Official Coast Guard" | "SALTY AI Model";
  type: "Cyclone" | "High Wave" | "Strong Wind" | "Squall / Thunderstorm" | "Tsunami Watch" | "PFZ Advisory";
  severity: "Critical" | "Severe" | "Warning" | "Advisory" | "Informational";
  title: string;
  summary: string;
  affectedRegions: string[];
  issuedAt: string;
  expiresAt: string;
  coordinates?: { lat: number; lon: number };
  operationalAction: string;
}

export const marineAlerts: MarineAlert[] = [
  {
    id: "alert-01",
    source: "Official IMD",
    type: "Strong Wind",
    severity: "Severe",
    title: "Gale Wind Warning along North Andhra & Odisha Coast",
    summary: "Squally wind speed reaching 45-55 kmph gusting to 65 kmph likely to prevail over Northwest Bay of Bengal.",
    affectedRegions: ["Visakhapatnam", "Kalingapatnam", "Gopalpur", "Paradip"],
    issuedAt: "Today, 06:00 IST",
    expiresAt: "Tomorrow, 18:00 IST",
    coordinates: { lat: 18.5, lon: 84.8 },
    operationalAction: "Fishermen are advised not to venture into deep sea waters of Northwest Bay of Bengal.",
  },
  {
    id: "alert-02",
    source: "Official INCOIS",
    type: "High Wave",
    severity: "Warning",
    title: "High Wave Alert (Swell Surge) for South Tamil Nadu Coast",
    summary: "High waves in the range of 2.2 - 2.8 meters are forecast till 23:30 hours along the coast from Kanyakumari to Rameswaram.",
    affectedRegions: ["Kanyakumari", "Tuticorin", "Rameswaram"],
    issuedAt: "Today, 08:30 IST",
    expiresAt: "Today, 23:30 IST",
    coordinates: { lat: 8.5, lon: 78.2 },
    operationalAction: "Small craft and country boats advised to anchor safely and avoid beach landings.",
  },
  {
    id: "alert-03",
    source: "SALTY AI Model",
    type: "Squall / Thunderstorm",
    severity: "Severe",
    title: "Predictive Radar Cluster: Rapid Convective Cell Formation",
    summary: "Satellite IR anomaly detects severe localized cumulonimbus development 35NM East of Chennai. Sudden wind shifts >35kts expected within 2 hours.",
    affectedRegions: ["Chennai Offshore", "Pulicat Sector"],
    issuedAt: "45 mins ago (Automated ML Pipeline)",
    expiresAt: "Next 4 hours",
    coordinates: { lat: 13.2, lon: 80.8 },
    operationalAction: "Boats operating within 30NM of Chennai advised to seek nearest harbor or navigate West.",
  },
  {
    id: "alert-04",
    source: "Official Coast Guard",
    type: "Cyclone",
    severity: "Advisory",
    title: "Depression BOB-04 Track Watch - Deep Central Bay",
    summary: "Well-marked low pressure area concentrated into depression BOB-04 over Central Bay of Bengal. Moving WNW at 14 kmph.",
    affectedRegions: ["Central Bay of Bengal", "North Andhra Coast"],
    issuedAt: "Yesterday, 18:00 IST",
    expiresAt: "Next 48 hours",
    coordinates: { lat: 15.2, lon: 86.4 },
    operationalAction: "All deep-sea fishing trawlers operating east of 85°E advised to return to coast immediately.",
  },
];

export interface GeofenceZone {
  id: string;
  name: string;
  category: "IMBL (International Boundary)" | "Marine Protected Area" | "Naval Restricted Zone" | "Coastal Security 5NM";
  sea: string;
  status: "Strictly Prohibited" | "Restricted Fishing" | "Vessel Notice Required";
  description: string;
  penaltyWarning: string;
  points: { lat: number; lon: number }[];
}

export const geofenceZones: GeofenceZone[] = [
  {
    id: "geo-imbl-srilanka",
    name: "India-Sri Lanka IMBL (Palk Strait & Gulf of Mannar)",
    category: "IMBL (International Boundary)",
    sea: "Palk Bay / Gulf of Mannar",
    status: "Strictly Prohibited",
    description: "International Maritime Boundary Line. Crossing into foreign territorial waters leads to immediate vessel impoundment and diplomatic arrest.",
    penaltyWarning: "Severe: Coast Guard & Sri Lankan Navy active radar cordon.",
    points: [
      { lat: 10.05, lon: 79.85 },
      { lat: 9.85, lon: 79.55 },
      { lat: 9.25, lon: 79.35 },
      { lat: 8.85, lon: 79.05 },
    ],
  },
  {
    id: "geo-mpa-gahirmatha",
    name: "Gahirmatha Marine Sanctuary (Olive Ridley Nesting Zone)",
    category: "Marine Protected Area",
    sea: "Bay of Bengal (Odisha)",
    status: "Restricted Fishing",
    description: "Strict ban on mechanized fishing and trawling within 20km from the coast from November to May to protect endangered Olive Ridley sea turtles.",
    penaltyWarning: "Forest Dept seizure of boat and fishing nets under Wildlife Protection Act.",
    points: [
      { lat: 20.8, lon: 86.9 },
      { lat: 20.8, lon: 87.2 },
      { lat: 20.4, lon: 87.1 },
      { lat: 20.4, lon: 86.8 },
    ],
  },
  {
    id: "geo-naval-vizag",
    name: "Eastern Naval Command Range (ENC Zulu-4)",
    category: "Naval Restricted Zone",
    sea: "Bay of Bengal",
    status: "Strictly Prohibited",
    description: "Subsurface and surface naval gunnery practice zone 15NM south of Dolphin's Nose.",
    penaltyWarning: "Hazardous live firing exercises active on scheduled NOTAMs.",
    points: [
      { lat: 17.5, lon: 83.3 },
      { lat: 17.5, lon: 83.6 },
      { lat: 17.2, lon: 83.6 },
      { lat: 17.2, lon: 83.3 },
    ],
  },
  {
    id: "geo-gulf-mannar-bio",
    name: "Gulf of Mannar Coral Biosphere Reserve",
    category: "Marine Protected Area",
    sea: "Gulf of Mannar",
    status: "Restricted Fishing",
    description: "Coral reef conservation park across 21 islands. Trawling and destructive blast fishing banned.",
    penaltyWarning: "Violations subject to heavy environmental fines.",
    points: [
      { lat: 9.2, lon: 78.8 },
      { lat: 9.2, lon: 79.2 },
      { lat: 8.7, lon: 78.7 },
      { lat: 8.7, lon: 78.3 },
    ],
  },
];

export interface Vessel {
  id: string;
  name: string;
  regNumber: string;
  vesselType: "Mechanized Trawler (48ft)" | "Motorized Craft (32ft)" | "Deep-Sea Longliner (65ft)" | "Patrol Craft (ICG)";
  ownerName: string;
  homePort: string;
  mmsi: string;
  currentLat: number;
  currentLon: number;
  sogKnots: number;
  cogDegrees: number;
  headingText: string;
  fuelRemainingLiters: number;
  fuelCapacityLiters: number;
  engineRpm: number;
  tripDurationHours: number;
  distanceFromPortNM: number;
  distanceToIMBLNM: number;
  geofenceStatus: "SAFE" | "CAUTION" | "BREACH_WARNING";
  riskRating: "Low" | "Moderate" | "High";
  crewCount: number;
  lastPingTime: string;
  sosActive: boolean;
}

export const activeVessels: Vessel[] = [
  {
    id: "vessel-01",
    name: "Matsya-Kuber IV",
    regNumber: "IND-AP-02-MM-4912",
    vesselType: "Mechanized Trawler (48ft)",
    ownerName: "Ramu K. / Vizag Trawler Union",
    homePort: "Visakhapatnam",
    mmsi: "419001892",
    currentLat: 17.742,
    currentLon: 83.485,
    sogKnots: 7.4,
    cogDegrees: 72,
    headingText: "ENE",
    fuelRemainingLiters: 380,
    fuelCapacityLiters: 600,
    engineRpm: 1650,
    tripDurationHours: 14.5,
    distanceFromPortNM: 16.4,
    distanceToIMBLNM: 142.0,
    geofenceStatus: "SAFE",
    riskRating: "Low",
    crewCount: 6,
    lastPingTime: "Just now (AIS Class B)",
    sosActive: false,
  },
  {
    id: "vessel-02",
    name: "Samudra-Shakti II",
    regNumber: "IND-TN-07-MM-8120",
    vesselType: "Deep-Sea Longliner (65ft)",
    ownerName: "J. Fernandez",
    homePort: "Chennai",
    mmsi: "419002941",
    currentLat: 12.89,
    currentLon: 80.45,
    sogKnots: 8.2,
    cogDegrees: 110,
    headingText: "ESE",
    fuelRemainingLiters: 710,
    fuelCapacityLiters: 1200,
    engineRpm: 1800,
    tripDurationHours: 28.0,
    distanceFromPortNM: 24.1,
    distanceToIMBLNM: 68.5,
    geofenceStatus: "SAFE",
    riskRating: "Moderate",
    crewCount: 8,
    lastPingTime: "2 mins ago",
    sosActive: false,
  },
  {
    id: "vessel-03",
    name: "Velankanni Matha",
    regNumber: "IND-TN-11-MO-3012",
    vesselType: "Motorized Craft (32ft)",
    ownerName: "Anthony Raj",
    homePort: "Rameswaram",
    mmsi: "419009812",
    currentLat: 9.38,
    currentLon: 79.42,
    sogKnots: 5.1,
    cogDegrees: 95,
    headingText: "E",
    fuelRemainingLiters: 85,
    fuelCapacityLiters: 200,
    engineRpm: 1400,
    tripDurationHours: 8.2,
    distanceFromPortNM: 11.2,
    distanceToIMBLNM: 4.8,
    geofenceStatus: "CAUTION",
    riskRating: "Moderate",
    crewCount: 4,
    lastPingTime: "1 min ago",
    sosActive: false,
  },
  {
    id: "vessel-04",
    name: "ICGS Varuna (Patrol)",
    regNumber: "ICG-CG-71",
    vesselType: "Patrol Craft (ICG)",
    ownerName: "Indian Coast Guard District 6",
    homePort: "Visakhapatnam",
    mmsi: "419000071",
    currentLat: 17.62,
    currentLon: 83.35,
    sogKnots: 18.5,
    cogDegrees: 45,
    headingText: "NE",
    fuelRemainingLiters: 4200,
    fuelCapacityLiters: 8000,
    engineRpm: 2100,
    tripDurationHours: 4.0,
    distanceFromPortNM: 8.9,
    distanceToIMBLNM: 138.0,
    geofenceStatus: "SAFE",
    riskRating: "Low",
    crewCount: 22,
    lastPingTime: "Just now",
    sosActive: false,
  },
];

export interface ResearchDataset {
  id: string;
  name: string;
  instrument: string;
  sourceServer: string; // e.g. ERDDAP INCOIS
  temporalRange: string;
  resolution: string;
  parameters: string[];
  recordsCount: string;
  format: string[];
  description: string;
}

export const researchDatasets: ResearchDataset[] = [
  {
    id: "ds-sst-insat",
    name: "High-Resolution Satellite SST (INSAT-3DR)",
    instrument: "Imager / Sounder",
    sourceServer: "ERDDAP: incois.gov.in/erddap/griddap/insat_sst_hourly",
    temporalRange: "2018 - Present (Hourly)",
    resolution: "0.04° (~4 km)",
    parameters: ["sea_surface_temperature", "sst_anomaly", "quality_flags"],
    recordsCount: "1.4B grid points",
    format: ["NetCDF-4", "CSV", "GeoJSON", "OPeNDAP"],
    description: "Thermal infrared multichannel radiometer SST across North Indian Ocean with cloud filtering and in-situ buoy calibration.",
  },
  {
    id: "ds-chla-modis",
    name: "Ocean Color & Chlorophyll-a (MODIS Aqua)",
    instrument: "MODIS Spectroradiometer",
    sourceServer: "ERDDAP: oceanwatch.pifsc.noaa.gov/modis_chla_8day",
    temporalRange: "2002 - Present (8-day composite)",
    resolution: "1 km coastal / 4 km offshore",
    parameters: ["chlor_a", "par_radiation", "turbidity_kd490"],
    recordsCount: "680M grid points",
    format: ["NetCDF", "CSV", "GeoTIFF"],
    description: "Phytoplankton biomass indicator computed via OC3M algorithm. Essential for marine primary productivity and PFZ validation.",
  },
  {
    id: "ds-buoy-incois",
    name: "Moored Ocean Buoy Array (OON / INCOIS)",
    instrument: "CTD, ADCP, Anemometer",
    sourceServer: "ERDDAP: incois.gov.in/erddap/tabledap/moored_buoys",
    temporalRange: "1997 - Present (10-min timeseries)",
    resolution: "Point in-situ (18 buoy stations)",
    parameters: ["wave_height_swh", "wave_period", "wind_speed", "air_pressure", "sst_depth_1m", "salinity"],
    recordsCount: "42M records",
    format: ["CSV", "JSON", "NetCDF"],
    description: "Deep sea and coastal oceanographic moored buoys across Bay of Bengal (BD series) and Arabian Sea (AD series).",
  },
  {
    id: "ds-argo-profiles",
    name: "Argo Float Subsurface Hydrography",
    instrument: "Profiling CTD Floats (0 - 2000m)",
    sourceServer: "ERDDAP: ifremer.fr/erddap/tabledap/ArgoFloats_IndianOcean",
    temporalRange: "2005 - Present (10-day cycles)",
    resolution: "Vertical 2000m profiles",
    parameters: ["temperature", "salinity", "pressure", "mixed_layer_depth", "dissolved_oxygen"],
    recordsCount: "128,000 vertical profiles",
    format: ["NetCDF", "CSV"],
    description: "Autonomous profiling floats measuring North Indian Ocean heat content, halocline structure, and ocean barrier layers.",
  },
];
