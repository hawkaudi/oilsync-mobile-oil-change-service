# Address Autocomplete API Setup

This guide explains how to set up address autocomplete services for the OilSync application.

## Current Implementation

The application includes a flexible `AddressAutocomplete` component that supports multiple address services with automatic fallback:

1. **Geoapify** (Primary) - Good free tier, fast responses
2. **Nominatim/OpenStreetMap** (Secondary) - Free, open source
3. **Mock Data** (Fallback) - For development and testing

## Setting Up Geoapify (Recommended)

### 1. Get API Key

1. Go to [Geoapify.com](https://www.geoapify.com/)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key for Geocoding

### 2. Configure Environment

Add to your `.env` file:

```bash
REACT_APP_GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

### 3. Free Tier Limits

- **3,000 requests/day** for free accounts
- Rate limit: 5 requests/second
- Perfect for development and small applications

## Alternative Services

### Google Places API (Most Accurate)

For production applications requiring the highest accuracy:

1. **Setup:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Places API
   - Create API key
   - Set restrictions for security

2. **Environment:**

   ```bash
   REACT_APP_GOOGLE_PLACES_API_KEY=your_google_api_key_here
   ```

3. **Cost:** $17 per 1,000 requests after $200 monthly credit

### Mapbox Geocoding API

Good alternative with competitive pricing:

1. **Setup:**

   - Go to [Mapbox.com](https://www.mapbox.com/)
   - Create account and get access token

2. **Environment:**

   ```bash
   REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
   ```

3. **Cost:** $0.50 per 1,000 requests after 100,000 free requests

## Testing Without API Keys

The component automatically falls back to mock data when no API keys are configured, allowing for:

- Development without external dependencies
- Testing UI/UX behavior
- Demonstration purposes

## Production Recommendations

### For Small Applications (< 1,000 searches/day)

- Use **Geoapify** free tier
- Set up error monitoring
- Enable fallback to mock data

### For Medium Applications (< 10,000 searches/day)

- Use **Geoapify** paid tier or **Mapbox**
- Implement request caching
- Add rate limiting

### For Large Applications (> 10,000 searches/day)

- Use **Google Places API**
- Implement sophisticated caching strategy
- Consider geographic clustering for better rates

## Implementation Features

✅ **Debounced Search** - Waits 300ms before searching
✅ **Keyboard Navigation** - Arrow keys and Enter support
✅ **Click Outside to Close** - Better UX
✅ **Loading States** - Visual feedback
✅ **Error Handling** - Graceful degradation
✅ **Multi-Service Fallback** - Reliability
✅ **Mock Data Fallback** - Development friendly

## Usage Example

```tsx
import AddressAutocomplete from "@/components/AddressAutocomplete";

<AddressAutocomplete
  value={address}
  onChange={setAddress}
  placeholder="Enter your service address..."
  onSelect={(suggestion) => {
    console.log("Selected:", suggestion);
    // Use suggestion.coordinates for mapping
    // Use suggestion.city, suggestion.state for logistics
  }}
/>;
```

## Next Steps

1. **Set up Geoapify account** for immediate functionality
2. **Test with your typical addresses** to verify coverage
3. **Monitor usage** to plan for scaling
4. **Consider upgrading** to Google Places for production use

The current implementation provides excellent UX while maintaining flexibility for different budget and accuracy requirements.
