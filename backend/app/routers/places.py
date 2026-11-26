"""
Places Router — GET /api/v1/places/{destination_id}
===================================================
Queries OpenStreetMap's free Overpass API for real restaurants, cafes,
and accommodations near each destination anchor, filters/annotates by group
dietary tags and budget tier, and distinguishes verified OSM metadata from
explicitly labeled heuristics.
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

router = APIRouter()

# Destination coordinates tuned to commercial / heritage hubs for rich OSM density
PLACES_CENTERS: Dict[str, Dict[str, Any]] = {
    "hampi": {"name": "Hampi", "lat": 15.3350, "lon": 76.4600, "cost_mult": 1.0},
    "coorg": {"name": "Coorg (Madikeri)", "lat": 12.4244, "lon": 75.7382, "cost_mult": 1.15},
    "kyoto": {"name": "Kyoto", "lat": 35.0037, "lon": 135.7704, "cost_mult": 2.4},
    "varanasi": {"name": "Varanasi", "lat": 25.3109, "lon": 83.0060, "cost_mult": 0.95},
}

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# In-memory cache: key -> (timestamp, raw_elements)
_OVERPASS_CACHE: Dict[str, tuple[float, List[Dict[str, Any]], str]] = {}
CACHE_TTL_SEC = 900.0


class PlaceItem(BaseModel):
    id: str
    name: str
    kind: str  # "dining" | "stay"
    category_tag: str
    cuisine: str
    distance_km: float
    lat: float
    lon: float
    address: str
    estimated_cost_for_two: int
    cost_source: str = "tier_estimate"
    osm_verified_tags: List[str] = Field(default_factory=list)
    heuristic_notes: List[str] = Field(default_factory=list)
    allergen_warnings: List[str] = Field(default_factory=list)
    is_osm_diet_verified: bool = False
    matches_diet_filter: bool = True
    within_budget: bool = True
    source: str = "openstreetmap_overpass"


class PlacesResponse(BaseModel):
    destination_id: str
    destination_name: str
    dining: List[PlaceItem]
    stays: List[PlaceItem]
    total_count: int
    source: str
    overpass_endpoint: Optional[str] = None
    disclaimer: str


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return round(2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def _format_address(tags: Dict[str, str], dest_name: str, lat: float, lon: float) -> str:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:suburb") or tags.get("addr:neighbourhood"),
        tags.get("addr:city") or tags.get("addr:town"),
    ]
    cleaned = [p.strip() for p in parts if p and p.strip()]
    if cleaned:
        return ", ".join(cleaned)
    full = tags.get("addr:full")
    if full:
        return full.strip()
    return f"{dest_name} Sector (OSM {lat:.4f}, {lon:.4f})"


def _estimate_cost(kind: str, category_tag: str, tags: Dict[str, str], cost_mult: float) -> int:
    if kind == "stay":
        base = {"hostel": 1100, "guest_house": 1800, "resort": 4200, "hotel": 2800}.get(category_tag, 2200)
    else:
        base = {"cafe": 450, "fast_food": 350, "restaurant": 650}.get(category_tag, 600)
    if tags.get("stars"):
        try:
            stars = int(tags["stars"][0])
            base = int(base * (0.8 + 0.35 * stars))
        except Exception:
            pass
    return int(round((base * cost_mult) / 50.0) * 50)


async def _fetch_photon_fallback(dest_id: str, lat: float, lon: float) -> tuple[List[Dict[str, Any]], str, str]:
    """Fallback to live OpenStreetMap Photon geocoder when Overpass public mirrors return 502/timeout."""
    elements: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "PrayanaAIPlanner/1.0"}) as client:
        for query_term, tag_key, tag_val in [
            ("restaurant", "amenity", "restaurant"),
            ("cafe", "amenity", "cafe"),
            ("hotel", "tourism", "hotel"),
        ]:
            try:
                r = await client.get(
                    "https://photon.komoot.io/api/",
                    params={"q": query_term, "lat": lat, "lon": lon, "limit": 12},
                )
                r.raise_for_status()
                feats = r.json().get("features", [])
                for f in feats:
                    props = f.get("properties") or {}
                    coords = (f.get("geometry") or {}).get("coordinates") or []
                    name = (props.get("name") or "").strip()
                    if not name or len(coords) < 2:
                        continue
                    elements.append({
                        "type": props.get("osm_type", "node"),
                        "id": props.get("osm_id", len(elements) + 1),
                        "lat": float(coords[1]),
                        "lon": float(coords[0]),
                        "tags": {
                            "name": name,
                            tag_key: props.get("osm_value") or tag_val,
                            "addr:street": props.get("street") or "",
                            "addr:city": props.get("city") or props.get("state") or "",
                        },
                    })
            except Exception:
                continue
    if not elements:
        raise RuntimeError("Both Overpass and Photon OSM endpoints unavailable")
    return elements, "openstreetmap_photon", "https://photon.komoot.io/api/"


async def _fetch_overpass(dest_id: str, lat: float, lon: float, radius_m: int) -> tuple[List[Dict[str, Any]], str, str]:
    now = time.time()
    cache_key = f"{dest_id}:{radius_m}"
    if cache_key in _OVERPASS_CACHE:
        ts, cached_els, ep = _OVERPASS_CACHE[cache_key]
        if now - ts < CACHE_TTL_SEC:
            return cached_els, "openstreetmap_overpass_cached", ep

    ql = f"""
[out:json][timeout:12];
(
  node["amenity"~"restaurant|cafe|fast_food"]["name"](around:{radius_m},{lat},{lon});
  way["amenity"~"restaurant|cafe"]["name"](around:{radius_m},{lat},{lon});
  node["tourism"~"hotel|guest_house|hostel|resort"]["name"](around:{radius_m},{lat},{lon});
  way["tourism"~"hotel|guest_house|hostel|resort"]["name"](around:{radius_m},{lat},{lon});
);
out center 70;
"""

    last_err = None
    async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "PrayanaAIPlanner/1.0"}) as client:
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                resp = await client.post(endpoint, data={"data": ql})
                resp.raise_for_status()
                payload = resp.json()
                elements = payload.get("elements", [])
                if elements:
                    _OVERPASS_CACHE[cache_key] = (now, elements, endpoint)
                    return elements, "openstreetmap_overpass", endpoint
            except Exception as exc:
                last_err = str(exc)
                continue

    # Live OpenStreetMap Photon fallback when Overpass mirrors return 502/timeout
    elements, src, ep = await _fetch_photon_fallback(dest_id, lat, lon)
    _OVERPASS_CACHE[cache_key] = (now, elements, ep)
    return elements, src, ep


@router.get(
    "/{destination_id}",
    response_model=PlacesResponse,
    summary="Fetch real restaurants & stays from OpenStreetMap Overpass API",
)
async def get_destination_places(
    destination_id: str,
    dietary_tags: str = Query(default="", description="Comma-separated active group dietary tags"),
    max_cost: Optional[int] = Query(default=None, description="Max INR budget ceiling filter"),
    radius_m: int = Query(default=4500, ge=500, le=15000),
) -> PlacesResponse:
    dest_key = destination_id.lower().strip()
    center = PLACES_CENTERS.get(dest_key, PLACES_CENTERS["hampi"])
    requested_tags = [t.strip() for t in dietary_tags.split(",") if t.strip()]

    try:
        elements, source_label, used_endpoint = await _fetch_overpass(
            dest_key, center["lat"], center["lon"], radius_m
        )
    except Exception as exc:
        return PlacesResponse(
            destination_id=dest_key,
            destination_name=center["name"],
            dining=[],
            stays=[],
            total_count=0,
            source=f"overpass_unavailable ({type(exc).__name__})",
            overpass_endpoint=None,
            disclaimer=(
                "Live OpenStreetMap Overpass query failed or timed out. "
                "No placeholder venues were substituted — click Refresh to retry."
            ),
        )

    dining: List[PlaceItem] = []
    stays: List[PlaceItem] = []
    seen_names: set[str] = set()

    for el in elements:
        tags = el.get("tags") or {}
        name = (tags.get("name") or "").strip()
        if not name or name.lower() in seen_names:
            continue

        el_lat = el.get("lat") if el.get("lat") is not None else el.get("center", {}).get("lat")
        el_lon = el.get("lon") if el.get("lon") is not None else el.get("center", {}).get("lon")
        if el_lat is None or el_lon is None:
            continue

        seen_names.add(name.lower())
        tourism_tag = tags.get("tourism", "")
        amenity_tag = tags.get("amenity", "")

        is_stay = tourism_tag in ("hotel", "guest_house", "hostel", "resort")
        kind = "stay" if is_stay else "dining"
        category_tag = tourism_tag if is_stay else (amenity_tag or "restaurant")
        dist_km = _haversine_km(center["lat"], center["lon"], float(el_lat), float(el_lon))

        # Strictly distinguish OSM verified dietary tags vs heuristics
        osm_verified: List[str] = []
        heuristics: List[str] = []
        allergen_warnings: List[str] = []

        if tags.get("diet:vegetarian") in ("yes", "only"):
            osm_verified.append("Pure Vegetarian")
        if tags.get("diet:vegan") in ("yes", "only"):
            osm_verified.append("Vegan")
        if tags.get("diet:halal") in ("yes", "only"):
            osm_verified.append("Halal")
        if tags.get("diet:gluten_free") in ("yes", "only"):
            osm_verified.append("Gluten-Free")

        raw_cuisine = (tags.get("cuisine") or "").replace(";", ", ").replace("_", " ").strip()
        cuisine_lower = raw_cuisine.lower()

        if kind == "dining":
            if not osm_verified:
                heuristics.append("OSM diet:* tags absent — verify menu at table")
            if "seafood" in cuisine_lower or "fish" in cuisine_lower:
                allergen_warnings.append("Shellfish Allergy")
                heuristics.append("Cuisine tag mentions seafood/fish")
            if "thai" in cuisine_lower or "asian" in cuisine_lower or "indian" in cuisine_lower or "north_indian" in cuisine_lower:
                heuristics.append("Kitchen commonly handles tree nuts/peanuts — verify Nut Allergy")
                if "Nut Allergy" in requested_tags:
                    allergen_warnings.append("Nut Allergy")

        diet_filters = [t for t in requested_tags if t in ("Pure Vegetarian", "Vegan", "Halal", "Gluten-Free")]
        matches_diet = True
        if kind == "dining" and diet_filters:
            # Matches if OSM explicitly confirms any requested dietary filter OR no conflicting tag exists (when tagged),
            # prioritize OSM-verified matches at the top.
            if osm_verified:
                matches_diet = all(df in osm_verified for df in diet_filters) or any(df in osm_verified for df in diet_filters)
            else:
                # Unknown in OSM unless meat/steak/seafood conflicts with Pure Vegetarian/Vegan
                if any(df in ("Pure Vegetarian", "Vegan") for df in diet_filters) and any(
                    bad in cuisine_lower for bad in ("steak", "burger", "seafood", "bbq")
                ):
                    matches_diet = False

        cost_est = _estimate_cost(kind, category_tag, tags, center["cost_mult"])
        within_budget = True if max_cost is None or kind == "stay" else cost_est <= max_cost

        item = PlaceItem(
            id=f"osm-{el.get('type', 'n')}-{el.get('id')}",
            name=name,
            kind=kind,
            category_tag=category_tag,
            cuisine=raw_cuisine.title() if raw_cuisine else (category_tag.replace("_", " ").title()),
            distance_km=dist_km,
            lat=float(el_lat),
            lon=float(el_lon),
            address=_format_address(tags, center["name"], float(el_lat), float(el_lon)),
            estimated_cost_for_two=cost_est,
            osm_verified_tags=osm_verified,
            heuristic_notes=heuristics,
            allergen_warnings=allergen_warnings,
            is_osm_diet_verified=len(osm_verified) > 0,
            matches_diet_filter=matches_diet,
            within_budget=within_budget,
            source=source_label,
        )

        if is_stay:
            stays.append(item)
        else:
            dining.append(item)

    # Sort dining: OSM diet verified & matches first, then budget match, then closest distance
    dining.sort(key=lambda x: (not x.matches_diet_filter, not x.is_osm_diet_verified, not x.within_budget, x.distance_km))
    stays.sort(key=lambda x: x.distance_km)

    return PlacesResponse(
        destination_id=dest_key,
        destination_name=center["name"],
        dining=dining[:24],
        stays=stays[:16],
        total_count=len(dining[:24]) + len(stays[:16]),
        source=source_label,
        overpass_endpoint=used_endpoint,
        disclaimer=(
            "Venue names, coordinates, addresses, and verified dietary badges come live from OpenStreetMap Overpass API. "
            "INR cost figures are category tier estimates; venues without OSM diet:* tags carry explicit verification warnings."
        ),
    )


class TransitPlaceItem(BaseModel):
    id: str
    name: str
    kind: str  # "fuel" | "ev_charger" | "bus_station" | "railway_station"
    distance_km: float
    lat: float
    lon: float
    address: str
    connector_hints: List[str] = Field(default_factory=list)
    compatible_2w_ev: bool = True
    compatible_4w_ev: bool = True
    source: str = "openstreetmap_overpass"


class TransitPlacesResponse(BaseModel):
    destination_id: str
    destination_name: str
    fuel_stations: List[TransitPlaceItem]
    ev_chargers: List[TransitPlaceItem]
    bus_stands: List[TransitPlaceItem]
    railway_stations: List[TransitPlaceItem]
    source: str
    disclaimer: str


@router.get(
    "/{destination_id}/transit",
    response_model=TransitPlacesResponse,
    summary="Live OpenStreetMap Fuel Stations, EV Chargers (2W/4W), Bus Stands & Railway Stations",
)
async def get_destination_transit(
    destination_id: str,
    radius_m: int = Query(default=12000, ge=1000, le=30000),
) -> TransitPlacesResponse:
    dest_key = destination_id.lower().strip()
    center = PLACES_CENTERS.get(dest_key, PLACES_CENTERS["hampi"])
    lat, lon = center["lat"], center["lon"]

    query = f"""
    [out:json][timeout:14];
    (
      node["amenity"~"^(fuel|charging_station|bus_station)$"](around:{radius_m},{lat},{lon});
      way["amenity"~"^(fuel|charging_station|bus_station)$"](around:{radius_m},{lat},{lon});
      node["railway"="station"](around:{radius_m},{lat},{lon});
      way["railway"="station"](around:{radius_m},{lat},{lon});
    );
    out center 60;
    """

    elements: List[Dict[str, Any]] = []
    source_label = "openstreetmap_overpass"
    async with httpx.AsyncClient(timeout=14.0, headers={"User-Agent": "PrayanaAIPlanner/1.0"}) as client:
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                res = await client.post(endpoint, data={"data": query})
                res.raise_for_status()
                elements = res.json().get("elements", [])
                if elements:
                    break
            except Exception:
                continue

        # Fallback to Photon if Overpass returned nothing
        if not elements:
            source_label = "openstreetmap_photon"
            for term, t_key, t_val in [
                ("petrol pump", "amenity", "fuel"),
                ("ev charging", "amenity", "charging_station"),
                ("bus stand", "amenity", "bus_station"),
                ("railway station", "railway", "station"),
            ]:
                try:
                    pr = await client.get(
                        "https://photon.komoot.io/api/",
                        params={"q": term, "lat": lat, "lon": lon, "limit": 6},
                    )
                    pr.raise_for_status()
                    for f in pr.json().get("features", []):
                        props = f.get("properties") or {}
                        coords = (f.get("geometry") or {}).get("coordinates") or []
                        name = (props.get("name") or "").strip()
                        if not name or len(coords) < 2:
                            continue
                        elements.append({
                            "type": props.get("osm_type", "node"),
                            "id": props.get("osm_id", len(elements) + 1),
                            "lat": float(coords[1]),
                            "lon": float(coords[0]),
                            "tags": {
                                "name": name,
                                t_key: t_val,
                                "addr:street": props.get("street") or "",
                                "addr:city": props.get("city") or "",
                            },
                        })
                except Exception:
                    continue

    fuel_stations: List[TransitPlaceItem] = []
    ev_chargers: List[TransitPlaceItem] = []
    bus_stands: List[TransitPlaceItem] = []
    railway_stations: List[TransitPlaceItem] = []
    seen: set[str] = set()

    for el in elements:
        tags = el.get("tags") or {}
        name = (tags.get("name") or tags.get("operator") or tags.get("brand") or "").strip()
        if not name:
            continue
        el_lat = el.get("lat") or (el.get("center") or {}).get("lat")
        el_lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if el_lat is None or el_lon is None:
            continue
        amenity = tags.get("amenity", "")
        railway = tags.get("railway", "")
        kind = (
            "fuel" if amenity == "fuel"
            else "ev_charger" if amenity == "charging_station"
            else "bus_station" if amenity == "bus_station"
            else "railway_station"
        )
        dedup_key = f"{kind}:{name.lower()}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        dist_km = _haversine_km(lat, lon, float(el_lat), float(el_lon))
        hints: List[str] = []
        compat_2w = True
        compat_4w = True
        if kind == "ev_charger":
            if tags.get("socket:type2") or "type 2" in name.lower():
                hints.append("Type-2 AC")
            if tags.get("socket:schuko") or tags.get("socket:indian_type_d") or "ather" in name.lower() or "ola" in name.lower():
                hints.append("16A 3-Pin / 2W Grid")
            if tags.get("socket:chademo") or tags.get("socket:ccs") or "ccs" in name.lower() or "fast" in name.lower():
                hints.append("CCS2 DC Fast (4W)")
                if not hints or len(hints) == 1:
                    compat_2w = False
            if not hints:
                hints = ["Type-2 AC", "16A 3-Pin"]

        item = TransitPlaceItem(
            id=f"osm-tr-{el.get('id')}",
            name=name,
            kind=kind,
            distance_km=dist_km,
            lat=float(el_lat),
            lon=float(el_lon),
            address=_format_address(tags, center["name"], float(el_lat), float(el_lon)),
            connector_hints=hints,
            compatible_2w_ev=compat_2w,
            compatible_4w_ev=compat_4w,
            source=source_label,
        )
        if kind == "fuel":
            fuel_stations.append(item)
        elif kind == "ev_charger":
            ev_chargers.append(item)
        elif kind == "bus_station":
            bus_stands.append(item)
        else:
            railway_stations.append(item)

    for lst in (fuel_stations, ev_chargers, bus_stands, railway_stations):
        lst.sort(key=lambda x: x.distance_km)

    return TransitPlacesResponse(
        destination_id=dest_key,
        destination_name=center["name"],
        fuel_stations=fuel_stations[:10],
        ev_chargers=ev_chargers[:10],
        bus_stands=bus_stands[:8],
        railway_stations=railway_stations[:8],
        source=source_label,
        disclaimer="Transit hubs, fuel pumps, and EV chargers sourced from OpenStreetMap Overpass/Photon with regional fallback.",
    )
