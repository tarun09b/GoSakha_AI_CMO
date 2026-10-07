def discover_hospitals(city: str, state: str, limit: int) -> list[dict]:
    """Query Google Places API (New) for hospitals in a city.
    Returns a list of dicts with the same shape as the Overpass output,
    so the rest of the pipeline doesn't need changes."""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("[discover] GOOGLE_PLACES_API_KEY not set")
        return []

    try:
        from google.maps import places_v1
    except ImportError:
        print("[discover] google-maps-places not installed")
        return []

    client = places_v1.PlacesClient(client_options={"api_key": api_key})

    # Fields we want back — keeps response small and cost predictable
    field_mask = ",".join([
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.types",
        "places.addressComponents",
    ])

    all_places = []
    page_token = None
    pages_to_fetch = max(1, (limit + 19) // 20)  # 20 results per page
    pages_to_fetch = min(pages_to_fetch, 3)       # API max is 3 pages (60 results)

    query_text = f"multi-specialty hospital in {city}, {state}, India"
    print(f"[discover] Google Places query: {query_text}")

    for page in range(pages_to_fetch):
        try:
            request = places_v1.SearchTextRequest(
                text_query=query_text,
                language_code="en",
                region_code="IN",
                page_size=20,
                page_token=page_token,
            )
            response = client.search_text(
                request=request,
                metadata=[("x-goog-fieldmask", field_mask)],
            )
            places = list(response.places or [])
            all_places.extend(places)
            print(f"[discover] page {page + 1}: {len(places)} results")

            page_token = response.next_page_token
            if not page_token:
                break
        except Exception as e:
            print(f"[discover] Google Places error: {e}")
            break

    # Convert to the same shape the Overpass path used (OSM-style elements)
    elements = []
    for p in all_places:
        tags = {}

        if hasattr(p, "display_name") and p.display_name:
            tags["name"] = p.display_name.text

        if hasattr(p, "formatted_address") and p.formatted_address:
            tags["addr:full"] = p.formatted_address

        if hasattr(p, "international_phone_number") and p.international_phone_number:
            tags["phone"] = p.international_phone_number

        if hasattr(p, "website_uri") and p.website_uri:
            tags["website"] = p.website_uri

        # Extract city/state from address_components
        if hasattr(p, "address_components") and p.address_components:
            for comp in p.address_components:
                types = list(comp.types) if comp.types else []
                if "locality" in types:
                    tags["addr:city"] = comp.long_text
                elif "administrative_area_level_1" in types:
                    tags["addr:state"] = comp.long_text
                elif "postal_code" in types:
                    tags["addr:postcode"] = comp.long_text

        if hasattr(p, "rating") and p.rating:
            tags["rating"] = str(p.rating)
        if hasattr(p, "user_rating_count") and p.user_rating_count:
            tags["review_count"] = str(p.user_rating_count)

        elements.append({"tags": tags})

    print(f"[discover] total: {len(elements)} hospitals")
    return elements