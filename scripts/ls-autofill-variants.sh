#!/usr/bin/env bash
# After creating products in LemonSqueezy dashboard, run this script to auto-fill .env
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"
source "$ENV_FILE"
LS_KEY="${LEMONSQUEEZY_API_KEY}"
STORE_ID="${LEMONSQUEEZY_STORE_ID}"

echo "Fetching products from store $STORE_ID..."

# Fetch all products with their variants
PRODUCTS=$(curl -s "https://api.lemonsqueezy.com/v1/products?filter[store_id]=$STORE_ID&include=variants&page[size]=50" \
  -H "Authorization: Bearer $LS_KEY" \
  -H "Accept: application/vnd.api+json")

TOTAL=$(echo "$PRODUCTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['meta']['page']['total'])")
echo "Found $TOTAL products."

if [ "$TOTAL" = "0" ]; then
  echo ""
  echo "ERROR: No products found. Please create them in the LemonSqueezy dashboard first:"
  echo "  https://app.lemonsqueezy.com/products"
  echo ""
  echo "Products to create:"
  echo "  1. 'Basic Plan'  - variants: 'Monthly' (\$9/mo) and 'Yearly' (\$86.40/yr)"
  echo "  2. 'Pro Plan'    - variants: 'Monthly' (\$19/mo) and 'Yearly' (\$182.40/yr)"
  echo "  3. 'Ultra Plan'  - variants: 'Monthly' (\$39/mo) and 'Yearly' (\$374.40/yr)"
  echo "  4. 'Word Pack'   - variants: 'Starter' (\$4.99), 'Popular' (\$14.99), 'Power' (\$34.99)"
  exit 1
fi

# Extract variant IDs by matching product name + variant name
extract_variant() {
  local product_keyword="$1"
  local variant_keyword="$2"
  echo "$PRODUCTS" | python3 - "$product_keyword" "$variant_keyword" <<'PYEOF'
import sys, json

data = json.load(sys.stdin)
product_kw = sys.argv[1].lower()
variant_kw = sys.argv[2].lower()

# Get variant details from included
included = data.get('included', [])
variant_map = {}
for item in included:
    if item['type'] == 'variants':
        variant_map[item['id']] = item['attributes']['name'].lower()

# Match product
for product in data.get('data', []):
    p_name = product['attributes']['name'].lower()
    if product_kw in p_name:
        # Match variant
        for vrel in product.get('relationships', {}).get('variants', {}).get('data', []):
            vid = vrel['id']
            if vid in variant_map and variant_kw in variant_map[vid]:
                print(vid)
                sys.exit(0)

print("NOT_FOUND")
PYEOF
}

echo ""
echo "Matching variant IDs..."

BASIC_MONTHLY=$(extract_variant "basic" "monthly")
BASIC_YEARLY=$(extract_variant "basic" "yearly")
PRO_MONTHLY=$(extract_variant "pro" "monthly")
PRO_YEARLY=$(extract_variant "pro" "yearly")
ULTRA_MONTHLY=$(extract_variant "ultra" "monthly")
ULTRA_YEARLY=$(extract_variant "ultra" "yearly")
WORD_SMALL=$(extract_variant "word" "starter")
WORD_MEDIUM=$(extract_variant "word" "popular")
WORD_LARGE=$(extract_variant "word" "power")

echo "  Basic Monthly:   $BASIC_MONTHLY"
echo "  Basic Yearly:    $BASIC_YEARLY"
echo "  Pro Monthly:     $PRO_MONTHLY"
echo "  Pro Yearly:      $PRO_YEARLY"
echo "  Ultra Monthly:   $ULTRA_MONTHLY"
echo "  Ultra Yearly:    $ULTRA_YEARLY"
echo "  Word Pack Small: $WORD_SMALL"
echo "  Word Pack Med:   $WORD_MEDIUM"
echo "  Word Pack Large: $WORD_LARGE"

NOT_FOUND=""
[ "$BASIC_MONTHLY" = "NOT_FOUND" ] && NOT_FOUND="$NOT_FOUND BASIC_MONTHLY"
[ "$BASIC_YEARLY" = "NOT_FOUND" ]  && NOT_FOUND="$NOT_FOUND BASIC_YEARLY"
[ "$PRO_MONTHLY" = "NOT_FOUND" ]   && NOT_FOUND="$NOT_FOUND PRO_MONTHLY"
[ "$PRO_YEARLY" = "NOT_FOUND" ]    && NOT_FOUND="$NOT_FOUND PRO_YEARLY"
[ "$ULTRA_MONTHLY" = "NOT_FOUND" ] && NOT_FOUND="$NOT_FOUND ULTRA_MONTHLY"
[ "$ULTRA_YEARLY" = "NOT_FOUND" ]  && NOT_FOUND="$NOT_FOUND ULTRA_YEARLY"
[ "$WORD_SMALL" = "NOT_FOUND" ]    && NOT_FOUND="$NOT_FOUND WORD_PACK_SMALL"
[ "$WORD_MEDIUM" = "NOT_FOUND" ]   && NOT_FOUND="$NOT_FOUND WORD_PACK_MEDIUM"
[ "$WORD_LARGE" = "NOT_FOUND" ]    && NOT_FOUND="$NOT_FOUND WORD_PACK_LARGE"

if [ -n "$NOT_FOUND" ]; then
  echo ""
  echo "WARNING: Could not match:$NOT_FOUND"
  echo "Check that product/variant names match the expected patterns above."
  exit 1
fi

# Update .env
update_env() {
  local key="$1"
  local val="$2"
  # Replace the line in .env
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  fi
}

update_env "LEMONSQUEEZY_BASIC_MONTHLY_VARIANT_ID"   "$BASIC_MONTHLY"
update_env "LEMONSQUEEZY_BASIC_YEARLY_VARIANT_ID"    "$BASIC_YEARLY"
update_env "LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID"     "$PRO_MONTHLY"
update_env "LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID"      "$PRO_YEARLY"
update_env "LEMONSQUEEZY_ULTRA_MONTHLY_VARIANT_ID"   "$ULTRA_MONTHLY"
update_env "LEMONSQUEEZY_ULTRA_YEARLY_VARIANT_ID"    "$ULTRA_YEARLY"
update_env "LEMONSQUEEZY_WORD_PACK_SMALL_VARIANT_ID" "$WORD_SMALL"
update_env "LEMONSQUEEZY_WORD_PACK_MEDIUM_VARIANT_ID" "$WORD_MEDIUM"
update_env "LEMONSQUEEZY_WORD_PACK_LARGE_VARIANT_ID" "$WORD_LARGE"

echo ""
echo "Done! .env has been updated with all 9 variant IDs."
