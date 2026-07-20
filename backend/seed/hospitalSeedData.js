/**
 * hospitalSeedData.js
 *
 * Seed data for OrganBay hospital nodes.
 *
 * NOTE: Hospital names and network topology are fictionalized for
 * demonstration purposes and do not represent real institutional data,
 * partnerships, or endorsements. Geographic coordinates correspond to
 * real Indian metro areas to simulate realistic transport logistics.
 */

const hospitalSeedData = [
  {
    name: "Apex Multispecialty Hospital, Delhi",
    city: "New Delhi",
    state: "Delhi",
    location: { lat: 28.5665, lng: 77.2100 }, // near AIIMS area
    type: "Transplant Center - Level 1",
    status: "active"
  },
  {
    name: "Northline Institute of Medical Sciences, Delhi",
    city: "New Delhi",
    state: "Delhi",
    location: { lat: 28.6304, lng: 77.2177 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Coastal Care Multispecialty Hospital, Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    location: { lat: 19.0296, lng: 72.8437 }, // Parel area (Tata Memorial region)
    type: "Transplant Center - Level 1",
    status: "active"
  },
  {
    name: "Andheri General Hospital, Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    location: { lat: 19.1197, lng: 72.8468 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Silicon Valley Institute of Transplant Sciences, Bengaluru",
    city: "Bengaluru",
    state: "Karnataka",
    location: { lat: 12.9279, lng: 77.6271 }, // Koramangala/Bannerghatta corridor
    type: "Transplant Center - Level 1",
    status: "active"
  },
  {
    name: "Whitefield Multispecialty Hospital, Bengaluru",
    city: "Bengaluru",
    state: "Karnataka",
    location: { lat: 12.9698, lng: 77.7500 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Marina Care Hospital, Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    location: { lat: 13.0358, lng: 80.2297 }, // Nungambakkam/Apollo corridor
    type: "Transplant Center - Level 1",
    status: "active"
  },
  {
    name: "Adyar Institute of Medical Sciences, Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    location: { lat: 13.0067, lng: 80.2570 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Vellore Multi-Organ Transplant Center",
    city: "Vellore",
    state: "Tamil Nadu",
    location: { lat: 12.9202, lng: 79.1333 }, // CMC Vellore region
    type: "Transplant Center - Level 1",
    status: "active"
  },
  {
    name: "Charminar General Hospital, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    location: { lat: 17.3850, lng: 78.4867 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Hitech City Institute of Transplant Sciences, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    location: { lat: 17.4483, lng: 78.3915 },
    type: "Transplant Center - Level 1",
    status: "active"
  },
  {
    name: "Sukhna Regional Medical Center, Chandigarh",
    city: "Chandigarh",
    state: "Chandigarh",
    location: { lat: 30.7333, lng: 76.7794 }, // PGIMER region
    type: "Transplant Center - Level 2",
    status: "active"
  },
  {
    name: "Riverside General Hospital, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    location: { lat: 22.5726, lng: 88.3639 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Salt Lake Institute of Nephrology & Transplant, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    location: { lat: 22.5851, lng: 88.4197 },
    type: "Transplant Center - Level 2",
    status: "active"
  },
  {
    name: "Sabarmati Multispecialty Hospital, Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    location: { lat: 23.0395, lng: 72.5660 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Yamuna Institute of Medical Sciences, Pune",
    city: "Pune",
    state: "Maharashtra",
    location: { lat: 18.5304, lng: 73.8567 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Deccan Transplant & Research Center, Pune",
    city: "Pune",
    state: "Maharashtra",
    location: { lat: 18.5679, lng: 73.9143 },
    type: "Transplant Center - Level 2",
    status: "active"
  },
  {
    name: "Gomti Nagar General Hospital, Lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    location: { lat: 26.8467, lng: 80.9462 },
    type: "General Hospital",
    status: "active"
  },
  {
    name: "Jaipur Institute of Organ Transplant Sciences",
    city: "Jaipur",
    state: "Rajasthan",
    location: { lat: 26.9124, lng: 75.7873 },
    type: "Transplant Center - Level 2",
    status: "active"
  },
  {
    name: "Kochi Coastal Medical Center",
    city: "Kochi",
    state: "Kerala",
    location: { lat: 9.9312, lng: 76.2673 },
    type: "General Hospital",
    status: "active"
  }
];

module.exports = hospitalSeedData;
