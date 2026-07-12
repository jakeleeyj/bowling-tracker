// Canonical list of operating ten-pin bowling alleys in Singapore.
// Single source of truth used by VenueCombobox (entry) and SessionCard (edit).
// The public worldwide deployment sets NEXT_PUBLIC_HIDE_PRESET_VENUES=true:
// users there build their own venue list from free-text entry instead of
// seeing a Singapore-only dropdown.
const SG_VENUES = [
  "Westwood Bowl",
  "Planet Bowl",
  "SuperBowl - Mt Faber",
  "SuperBowl - Toa Payoh",
  "SuperBowl - Tampines",
  "SuperBowl - Khatib",
  "SuperBowl - Jurong",
  "Sonic Bowl - Punggol",
  "Sonic Bowl - Yishun",
  "Sonic Bowl - Choa Chu Kang",
  "Sonic Bowl - Tampines Hub",
  "Forte Bowl",
  "Temasek Club",
];

export const PRESET_VENUES =
  process.env.NEXT_PUBLIC_HIDE_PRESET_VENUES === "true" ? [] : SG_VENUES;
