<?php
/**
 * Buyer Intelligence Bot - Nutraceuticals / Supplements / Herbal Products
 *
 * 100% free. No paid APIs. No API keys required for default run.
 * Outputs leads.csv with company, country, email (MX-verified), phone, source, score.
 *
 * Run:
 *   C:\xampp\php\php.exe E:\CRM+ERP\scripts\buyer-intel\find-buyers.php
 *
 * Output:
 *   E:\CRM+ERP\scripts\buyer-intel\output\leads_YYYYMMDD_HHMMSS.csv
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const TIMEOUT       = 25;
const USER_AGENT    = 'Mozilla/5.0 (compatible; CRM-ERP-BuyerIntel/1.0)';
const MAX_PER_KW    = 100;     // results per keyword from OpenFDA
const MAX_WIKIDATA  = 200;     // max companies from Wikidata
const MAX_ENRICH    = 50;      // max websites to scrape for emails (kept low to be polite)
const SLEEP_MS      = 800;     // delay between scrapes (politeness)
const OUTDIR        = __DIR__ . '/output';

// Product category keywords (the user's product list)
$PRODUCT_KEYWORDS = [
    'nutraceutical',
    'dietary supplement',
    'vitamin supplement',
    'mineral supplement',
    'herbal supplement',
    'herbal extract',
    'herbal powder',
    'gummy vitamin',
    'protein supplement',
    'ayurvedic',
    'botanical extract',
];

// HS codes that cover nutraceuticals/supplements/herbal products
$HS_CODES = [
    '210690' => 'Food preparations n.e.s. (most supplements)',
    '130219' => 'Vegetable saps and extracts (herbal extracts)',
    '121190' => 'Plants and parts (herbal raw / powder)',
    '300490' => 'Medicaments (other)',
    '293690' => 'Vitamins, intermixtures',
    '210610' => 'Protein concentrates',
];

// ---------------------------------------------------------------------------
// LIBS
// ---------------------------------------------------------------------------
function http_get(string $url, array $headers = [], int $timeout = TIMEOUT): ?string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_USERAGENT      => USER_AGENT,
        CURLOPT_HTTPHEADER     => array_merge(['Accept: application/json'], $headers),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false || $code < 200 || $code >= 400) return null;
    return (string)$resp;
}

function log_step(string $msg): void {
    echo '[' . date('H:i:s') . "] $msg\n";
}

function clean(string $s): string {
    return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($s), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
}

// ---------------------------------------------------------------------------
// SOURCE 1: OpenFDA  (dietary supplement labels & food event reports)
//   - No API key required (under 1000 req/day)
//   - Returns US companies that manufacture/distribute supplements
// ---------------------------------------------------------------------------
function source_openfda_labels(array $keywords): array {
    $leads = [];
    log_step("OpenFDA: searching dietary supplement labels...");

    // Endpoint: drug/label.json with product_type filter
    // Search by openfda.product_type = "DIETARY SUPPLEMENT" plus brand keyword
    foreach ($keywords as $kw) {
        $kw_clean = preg_replace('/[^a-z0-9 ]/i', '', $kw);
        $search   = 'openfda.product_type:"dietary+supplement"+AND+(brand_name:"' . urlencode($kw_clean) . '"+OR+description:"' . urlencode($kw_clean) . '")';
        $url      = "https://api.fda.gov/drug/label.json?search=$search&limit=" . MAX_PER_KW;

        $json = http_get($url);
        if (!$json) continue;
        $data = json_decode($json, true);
        if (empty($data['results'])) continue;

        foreach ($data['results'] as $r) {
            $brand = $r['openfda']['brand_name'][0]    ?? '';
            $mfr   = $r['openfda']['manufacturer_name'][0] ?? '';
            $name  = $mfr ?: $brand;
            if (!$name) continue;
            $leads[] = [
                'company'       => clean($name),
                'brand'         => clean($brand),
                'country'       => 'US',
                'source'        => 'OpenFDA Label DB',
                'source_url'    => $url,
                'category'      => 'supplement_manufacturer_or_distributor',
                'matched_kw'    => $kw,
                'product_type'  => 'dietary supplement',
                'discovered'    => date('Y-m-d'),
            ];
        }
        usleep(SLEEP_MS * 1000);
    }
    log_step("OpenFDA: found " . count($leads) . " raw entries");
    return $leads;
}

// ---------------------------------------------------------------------------
// SOURCE 2: OpenFDA enforcement  (recalls, warning letters)
//   - Companies appearing in enforcement = real players in the supplement market
// ---------------------------------------------------------------------------
function source_openfda_enforcement(array $keywords): array {
    $leads = [];
    log_step("OpenFDA: searching food enforcement reports...");

    foreach ($keywords as $kw) {
        $kw_clean = preg_replace('/[^a-z0-9 ]/i', '', $kw);
        $url      = "https://api.fda.gov/food/enforcement.json?search=product_description:%22" . urlencode($kw_clean) . "%22&limit=" . MAX_PER_KW;
        $json     = http_get($url);
        if (!$json) continue;
        $data = json_decode($json, true);
        if (empty($data['results'])) continue;

        foreach ($data['results'] as $r) {
            $name    = $r['recalling_firm']    ?? '';
            if (!$name) continue;
            $addr    = trim(($r['address_1'] ?? '') . ' ' . ($r['address_2'] ?? ''));
            $city    = $r['city']    ?? '';
            $state   = $r['state']   ?? '';
            $country = $r['country'] ?? 'US';
            $leads[] = [
                'company'      => clean($name),
                'brand'        => '',
                'country'      => $country,
                'state'        => $state,
                'city'         => $city,
                'address'      => clean($addr),
                'source'       => 'OpenFDA Enforcement',
                'source_url'   => $url,
                'category'     => 'supplement_company_known_to_fda',
                'matched_kw'   => $kw,
                'product_type' => 'dietary supplement / food',
                'discovered'   => date('Y-m-d'),
            ];
        }
        usleep(SLEEP_MS * 1000);
    }
    log_step("OpenFDA enforcement: found " . count($leads) . " raw entries");
    return $leads;
}

// ---------------------------------------------------------------------------
// SOURCE 3: UN Comtrade  (which countries are the biggest importers per HS code)
//   - Useful for country-targeting; gives import volumes not specific companies
// ---------------------------------------------------------------------------
function source_un_comtrade(array $hs_codes): array {
    $rows = [];
    log_step("UN Comtrade: pulling top importing countries per HS code...");

    foreach ($hs_codes as $hs => $desc) {
        // wits / comtrade lightweight endpoint (no key, lower rate). Year = previous full year.
        $year = (int)date('Y') - 1;
        // Public endpoint - returns top reporters importing this HS code
        $url  = "https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=842,826,124,036,392,156,784,276&period=$year&cmdCode=$hs&flowCode=M&maxRecords=20";
        $json = http_get($url);
        if (!$json) continue;
        $data = json_decode($json, true);
        $list = $data['data'] ?? [];
        if (!$list) continue;
        foreach ($list as $r) {
            $reporter = $r['reporterDesc']  ?? '';
            $value    = (float)($r['primaryValue'] ?? 0);
            if (!$reporter || $value <= 0) continue;
            $rows[] = [
                'country'     => $reporter,
                'hs_code'     => $hs,
                'hs_desc'     => $desc,
                'year'        => $year,
                'import_usd'  => $value,
                'source'      => 'UN Comtrade',
                'source_url'  => $url,
            ];
        }
        usleep(SLEEP_MS * 1000);
    }

    // Sort by volume desc
    usort($rows, fn($a, $b) => $b['import_usd'] <=> $a['import_usd']);
    log_step("UN Comtrade: pulled " . count($rows) . " country-volume rows");
    return $rows;
}

// ---------------------------------------------------------------------------
// SOURCE 4: Wikidata SPARQL  (publicly known supplement / nutraceutical companies)
//   - No API key, returns JSON
// ---------------------------------------------------------------------------
function source_wikidata_companies(): array {
    $leads = [];
    log_step("Wikidata: querying known supplement / nutraceutical companies...");

    // Companies whose industry is dietary supplement / nutraceutical / herbal medicine
    $sparql = '
        SELECT DISTINCT ?company ?companyLabel ?countryLabel ?website ?inception WHERE {
          VALUES ?industry { wd:Q188724 wd:Q12136 wd:Q1142960 wd:Q3329133 }
          ?company wdt:P31/wdt:P279* wd:Q4830453 .
          ?company wdt:P452 ?industry .
          OPTIONAL { ?company wdt:P17 ?country . }
          OPTIONAL { ?company wdt:P856 ?website . }
          OPTIONAL { ?company wdt:P571 ?inception . }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT ' . MAX_WIKIDATA;

    $url  = 'https://query.wikidata.org/sparql?format=json&query=' . urlencode($sparql);
    $json = http_get($url, ['Accept: application/sparql-results+json', 'User-Agent: ' . USER_AGENT]);
    if (!$json) {
        log_step("Wikidata: query failed");
        return [];
    }
    $data = json_decode($json, true);
    $bindings = $data['results']['bindings'] ?? [];

    foreach ($bindings as $b) {
        $name    = $b['companyLabel']['value'] ?? '';
        $country = $b['countryLabel']['value'] ?? '';
        $website = $b['website']['value']      ?? '';
        if (!$name || str_starts_with($name, 'Q')) continue;
        $leads[] = [
            'company'      => clean($name),
            'brand'        => '',
            'country'      => clean($country),
            'website'      => $website,
            'source'       => 'Wikidata',
            'source_url'   => $b['company']['value'] ?? '',
            'category'     => 'supplement_company_listed',
            'matched_kw'   => 'wikidata.industry=nutraceutical',
            'product_type' => 'nutraceutical / supplement / herbal',
            'discovered'   => date('Y-m-d'),
        ];
    }
    log_step("Wikidata: pulled " . count($leads) . " companies");
    return $leads;
}

// ---------------------------------------------------------------------------
// SOURCE 5: openFoodFacts companies  (open data, brand owners worldwide)
//   - REST API, no key. Lets us pull brand owners from product label data.
// ---------------------------------------------------------------------------
function source_open_food_facts(array $keywords): array {
    $leads = [];
    log_step("Open Food Facts: pulling brand/manufacturer data...");

    foreach ($keywords as $kw) {
        $url  = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" . urlencode($kw) . "&action=process&json=1&page_size=50";
        $json = http_get($url);
        if (!$json) continue;
        $data = json_decode($json, true);
        $prods = $data['products'] ?? [];
        foreach ($prods as $p) {
            $brand = $p['brands']        ?? '';
            $mfr   = $p['manufacturing_places'] ?? '';
            $country = $p['countries']   ?? '';
            if (!$brand) continue;
            // brands may be comma separated
            foreach (explode(',', $brand) as $b) {
                $b = trim($b);
                if (!$b) continue;
                $leads[] = [
                    'company'      => clean($b),
                    'brand'        => clean($b),
                    'country'      => clean(explode(',', $country)[0] ?? ''),
                    'source'       => 'Open Food Facts',
                    'source_url'   => "https://world.openfoodfacts.org/brand/" . urlencode($b),
                    'category'     => 'brand_owner',
                    'matched_kw'   => $kw,
                    'product_type' => 'supplement / nutraceutical',
                    'discovered'   => date('Y-m-d'),
                ];
            }
        }
        usleep(SLEEP_MS * 1000);
    }
    log_step("Open Food Facts: extracted " . count($leads) . " brand entries");
    return $leads;
}

// ---------------------------------------------------------------------------
// ENRICHMENT: try to find the company's website + scrape /contact for email/phone
// ---------------------------------------------------------------------------
function guess_website_from_name(string $name): ?string {
    // Skip enrichment for very generic names
    if (strlen($name) < 3) return null;
    // Try DuckDuckGo HTML search (no API key) as a fallback to find website
    $url = "https://duckduckgo.com/html/?q=" . urlencode('"' . $name . '" official site contact');
    $html = http_get($url, ['Accept: text/html']);
    if (!$html) return null;
    if (preg_match_all('#<a[^>]+class="result__a"[^>]+href="([^"]+)"#i', $html, $m)) {
        foreach ($m[1] as $href) {
            // DuckDuckGo wraps real URLs in /l/?uddg=... — decode
            if (preg_match('#uddg=([^&]+)#', $href, $u)) {
                $real = urldecode($u[1]);
                if (preg_match('#^https?://([^/]+)#', $real, $d)) {
                    $host = strtolower($d[1]);
                    // Skip mega-aggregator domains
                    if (preg_match('#(facebook|linkedin|twitter|instagram|wikipedia|amazon|youtube|crunchbase|bloomberg)\.com$#', $host)) continue;
                    return 'https://' . $host;
                }
            }
        }
    }
    return null;
}

function scrape_contact(string $website): array {
    $out = ['email' => '', 'phone' => '', 'contact_url' => ''];
    if (!$website) return $out;

    $candidates = [
        $website,
        rtrim($website, '/') . '/contact',
        rtrim($website, '/') . '/contact-us',
        rtrim($website, '/') . '/about',
        rtrim($website, '/') . '/about-us',
    ];
    foreach ($candidates as $url) {
        $html = http_get($url, ['Accept: text/html'], 15);
        if (!$html) continue;
        // Email regex
        if (preg_match('/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i', $html, $m)) {
            $email = strtolower($m[0]);
            if (!str_contains($email, 'example.com') && !str_contains($email, 'yourdomain')) {
                $out['email'] = $email;
            }
        }
        // Phone regex - international friendly
        if (preg_match('/\+?\d[\d \-().]{7,18}\d/', $html, $m)) {
            $phone = preg_replace('/[^\d+]/', '', $m[0]);
            if (strlen($phone) >= 8 && strlen($phone) <= 16) {
                $out['phone'] = $phone;
            }
        }
        if ($out['email']) {
            $out['contact_url'] = $url;
            break;
        }
        usleep(SLEEP_MS * 1000);
    }
    return $out;
}

// ---------------------------------------------------------------------------
// EMAIL VERIFICATION: DNS MX lookup (zero cost, deterministic)
// ---------------------------------------------------------------------------
function verify_email_mx(string $email): bool {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return false;
    [, $domain] = explode('@', $email, 2);
    return checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A');
}

// ---------------------------------------------------------------------------
// DEDUP: normalize company name + country
// ---------------------------------------------------------------------------
function dedup_key(array $lead): string {
    $name = strtolower($lead['company'] ?? '');
    $name = preg_replace('/\b(inc|llc|ltd|limited|corp|corporation|co|company|gmbh|pvt|private|sa|sl|nv|bv|plc)\b\.?/i', '', $name);
    $name = preg_replace('/[^a-z0-9]/', '', $name);
    return $name . '|' . strtolower($lead['country'] ?? '');
}

function dedup(array $leads): array {
    $seen = [];
    $out  = [];
    foreach ($leads as $l) {
        if (empty($l['company'])) continue;
        $k = dedup_key($l);
        if (strlen($k) < 4) continue; // skip if normalized name is too short
        if (isset($seen[$k])) {
            // merge: keep first, accumulate sources
            $idx = $seen[$k];
            $out[$idx]['sources_all'] = ($out[$idx]['sources_all'] ?? $out[$idx]['source']) . ' | ' . $l['source'];
            // Inherit fields if blank
            foreach (['country','website','email','phone','address','city','state'] as $f) {
                if (empty($out[$idx][$f]) && !empty($l[$f])) $out[$idx][$f] = $l[$f];
            }
            continue;
        }
        $seen[$k] = count($out);
        $out[] = $l;
    }
    return $out;
}

// ---------------------------------------------------------------------------
// SCORING: pure rules, 0-100 scale
// ---------------------------------------------------------------------------
function score(array $lead): int {
    $s = 0;

    // Source quality
    $src = strtolower(($lead['sources_all'] ?? $lead['source']) ?? '');
    if (str_contains($src, 'openfda enforcement'))  $s += 25;  // proven real company
    if (str_contains($src, 'openfda label'))        $s += 20;  // registered with FDA
    if (str_contains($src, 'wikidata'))             $s += 15;  // notable enough to be on Wikidata
    if (str_contains($src, 'open food facts'))      $s += 10;  // brand actively sold
    if (substr_count($src, '|') >= 1)               $s += 15;  // multi-source = high confidence

    // Contact completeness
    if (!empty($lead['email']))          $s += 15;
    if (!empty($lead['email_verified'])) $s += 10;
    if (!empty($lead['phone']))          $s += 5;
    if (!empty($lead['website']))        $s += 5;
    if (!empty($lead['address']))        $s += 5;

    // Country in major supplement-importing markets
    $country = strtolower($lead['country'] ?? '');
    if (preg_match('/(united states|usa|us|united kingdom|uk|germany|canada|australia|japan|france|netherlands|uae|emirates)/', $country)) {
        $s += 10;
    }

    return min(100, $s);
}

// ---------------------------------------------------------------------------
// MAIN PIPELINE
// ---------------------------------------------------------------------------
@mkdir(OUTDIR, 0777, true);

$START = microtime(true);
log_step("================================================");
log_step("Buyer Intel Bot - Nutraceuticals/Supplements/Herbal");
log_step("================================================");
log_step("Keywords: " . implode(', ', $PRODUCT_KEYWORDS));
log_step("HS codes: " . implode(', ', array_keys($HS_CODES)));
log_step("");

// 1. Source: OpenFDA labels
$leads_openfda1 = source_openfda_labels($PRODUCT_KEYWORDS);

// 2. Source: OpenFDA enforcement
$leads_openfda2 = source_openfda_enforcement($PRODUCT_KEYWORDS);

// 3. Source: UN Comtrade (country demand stats - written to a separate CSV)
$country_demand = source_un_comtrade($HS_CODES);

// 4. Source: Wikidata
$leads_wd = source_wikidata_companies();

// 5. Source: Open Food Facts
$leads_off = source_open_food_facts($PRODUCT_KEYWORDS);

// MERGE + DEDUP
$all  = array_merge($leads_openfda1, $leads_openfda2, $leads_wd, $leads_off);
log_step("");
log_step("Total raw leads before dedup: " . count($all));
$all  = dedup($all);
log_step("After dedup: " . count($all));

// ENRICHMENT (limited to MAX_ENRICH leads to stay polite)
log_step("");
log_step("Enriching top " . MAX_ENRICH . " leads with website + emails...");
$enriched_count = 0;
foreach ($all as &$lead) {
    if ($enriched_count >= MAX_ENRICH) break;
    if (empty($lead['website'])) {
        $website = guess_website_from_name($lead['company']);
        if ($website) $lead['website'] = $website;
        usleep(SLEEP_MS * 1000);
    }
    if (!empty($lead['website']) && empty($lead['email'])) {
        $contact = scrape_contact($lead['website']);
        if ($contact['email'])       $lead['email']        = $contact['email'];
        if ($contact['phone'])       $lead['phone']        = $contact['phone'];
        if ($contact['contact_url']) $lead['contact_url']  = $contact['contact_url'];
        usleep(SLEEP_MS * 1000);
        $enriched_count++;
    }
}
unset($lead);

// VERIFY EMAILS
log_step("Verifying emails via DNS MX...");
foreach ($all as &$lead) {
    if (!empty($lead['email'])) {
        $lead['email_verified'] = verify_email_mx($lead['email']) ? 1 : 0;
    }
}
unset($lead);

// SCORE
foreach ($all as &$lead) {
    $lead['score'] = score($lead);
}
unset($lead);

// SORT by score desc
usort($all, fn($a, $b) => $b['score'] <=> $a['score']);

// WRITE CSV
$timestamp = date('Ymd_His');
$csv_path  = OUTDIR . "/leads_$timestamp.csv";
$fp = fopen($csv_path, 'w');
fputcsv($fp, [
    'score','company','brand','country','state','city','address','website','contact_url',
    'email','email_verified','phone','category','product_type','matched_kw',
    'source','sources_all','source_url','discovered',
]);
foreach ($all as $l) {
    fputcsv($fp, [
        $l['score']           ?? 0,
        $l['company']         ?? '',
        $l['brand']           ?? '',
        $l['country']         ?? '',
        $l['state']           ?? '',
        $l['city']            ?? '',
        $l['address']         ?? '',
        $l['website']         ?? '',
        $l['contact_url']     ?? '',
        $l['email']           ?? '',
        $l['email_verified']  ?? '',
        $l['phone']           ?? '',
        $l['category']        ?? '',
        $l['product_type']    ?? '',
        $l['matched_kw']      ?? '',
        $l['source']          ?? '',
        $l['sources_all']     ?? '',
        $l['source_url']      ?? '',
        $l['discovered']      ?? '',
    ]);
}
fclose($fp);

// COUNTRY DEMAND CSV (separate)
$demand_path = OUTDIR . "/country_demand_$timestamp.csv";
$fp = fopen($demand_path, 'w');
fputcsv($fp, ['country','hs_code','hs_desc','year','import_usd','source','source_url']);
foreach ($country_demand as $r) {
    fputcsv($fp, [$r['country'], $r['hs_code'], $r['hs_desc'], $r['year'], $r['import_usd'], $r['source'], $r['source_url']]);
}
fclose($fp);

// SUMMARY
$elapsed = round(microtime(true) - $START, 1);
log_step("");
log_step("================================================");
log_step("DONE in {$elapsed}s");
log_step("Leads written: " . count($all) . " -> $csv_path");
log_step("Country demand rows: " . count($country_demand) . " -> $demand_path");
log_step("");
log_step("Top 10 leads by score:");
foreach (array_slice($all, 0, 10) as $i => $l) {
    echo sprintf("  #%-2d  score=%-3d  %-40s  %-15s  %s\n",
        $i + 1,
        $l['score'] ?? 0,
        substr($l['company'] ?? '', 0, 40),
        substr($l['country'] ?? '', 0, 15),
        $l['email'] ?? '(no email)'
    );
}
log_step("");
log_step("Open the CSV in Excel: $csv_path");
