# whoray

> WHOIS and RDAP lookups for every TLD, with one normalized result and drop-date estimates

- Asks RDAP first and falls back to WHOIS, so ccTLDs without RDAP work too
- Same result shape for every registry: UTC dates, EPP status codes, redacted fields left out
- Knows where a domain is in its lifecycle, and estimates when an expiring domain drops
- Zero dependencies. Runs on Node.js 20.19+, Bun, Deno and Cloudflare Workers. Browsers get RDAP only.

## Install

```sh
npm install whoray
```

## Usage

```js
import { lookup } from "whoray";

const domain = await lookup("namecheap.co");

domain.state;           //=> "registered"
domain.registrar?.name; //=> "NameCheap, Inc."
domain.dates.expires;   //=> 2027-07-19T23:59:59.000Z
```

## API

### lookup(domain, options?)

`domain` can be in Unicode or punycode.

| Option | Default | |
| --- | --- | --- |
| `follow` | `"registry"` | Set to `"registrar"` to also query the registrar's server for fuller registrar details |
| `rdap` | `"prefer"` | `"only"` never uses WHOIS (needed in browsers); `"never"` never uses RDAP |
| `timeout` | `10000` | Milliseconds for the whole lookup |
| `signal` | | `AbortSignal` to cancel the lookup |
| `servers` | | Your own servers for a TLD, e.g. `{ io: { whois: "whois.nic.io" } }` |
| `connect` | | Your own port 43 connection, e.g. through a [proxy](#using-a-proxy) |
| `fetch` | `globalThis.fetch` | Your own fetch for RDAP |
| `concurrency` | `4` | Max requests at once to one server |

It throws only if `domain` isn't a domain name or your `signal` aborts. Any other failure comes back as `state: "unknown"` with an `error`.

### Result

`npx whoray namecheap.co --json`:

<details>
<summary>Output</summary>

```json
{
  "domain": "namecheap.co",
  "unicode": "namecheap.co",
  "tld": "co",
  "state": "registered",
  "registrar": {
    "name": "NameCheap, Inc.",
    "ianaId": 1068,
    "url": "http://www.namecheap.com",
    "abuseEmail": "abuse@namecheap.com",
    "abusePhone": "+1.9854014545"
  },
  "registrant": {
    "country": "US"
  },
  "registry": {
    "id": "MinTIC",
    "name": "MinTIC"
  },
  "handle": "D249131-CNIC",
  "dates": {
    "created": "2010-07-20T17:59:53.000Z",
    "updated": "2026-07-02T18:07:41.000Z",
    "expires": "2027-07-19T23:59:59.000Z",
    "database": "2026-10-16T21:05:49.000Z"
  },
  "statuses": [
    "clientTransferProhibited"
  ],
  "nameservers": [
    "dns1.registrar-servers.com",
    "dns2.registrar-servers.com"
  ],
  "dnssec": true,
  "source": "rdap",
  "hops": [
    {
      "protocol": "rdap",
      "server": "rdap.registry.co",
      "raw": "{\"rdapConformance\":[\"icann_rdap_response_profile_1\",\"icann_rdap_technical_implementation_guide_1\",\"rdap_level_0\",\"redacted\"],\"lang\":\"en\",\"objectClassName\":\"domain\",\"handle\":\"D249131-CNIC\",\"ldhName\":\"namecheap.co\",\"nameservers\":[{\"objectClassName\":\"nameserver\",\"ldhName\":\"dns1.registrar-servers.com\",\"handle\":\"H3701-CNIC\",\"links\":[{\"title\":\"Authoritative URL for this resource\",\"rel\":\"self\",\"type\":\"application\\/rdap+json\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/rdap.registry.co\\/co\\/nameserver\\/dns1.registrar-servers.com\"}]},{\"objectClassName\":\"nameserver\",\"ldhName\":\"dns2.registrar-servers.com\",\"handle\":\"H3710-CNIC\",\"links\":[{\"title\":\"Authoritative URL for this resource\",\"rel\":\"self\",\"type\":\"application\\/rdap+json\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/rdap.registry.co\\/co\\/nameserver\\/dns2.registrar-servers.com\"}]}],\"secureDNS\":{\"delegationSigned\":true,\"maxSigLife\":0,\"dsData\":[{\"keyTag\":25194,\"algorithm\":13,\"digest\":\"B07387ACDF5D13AD2667521D07FF84B61C65C9F36F63AC96895A087928EAB4D0\",\"digestType\":2}]},\"entities\":[{\"objectClassName\":\"entity\",\"roles\":[\"registrant\"],\"handle\":\"C636140-CNIC\",\"vcardArray\":[\"vcard\",[[\"version\",{},\"text\",\"4.0\"],[\"fn\",{},\"text\",\"\"],[\"adr\",{\"cc\":\"US\"},\"text\",[\"\",\"\",\"\",\"\",\"Delaware\",\"\",\"\"]]]],\"remarks\":[{\"title\":\"Data Policy\",\"type\":\"object truncated due to authorization\",\"description\":[\"Some of the data in this object has been removed.\"]},{\"title\":\"REDACTED FOR PRIVACY\",\"type\":\"object redacted due to authorization\",\"description\":[\"Some of the data in this object has been removed.\"]},{\"title\":\"EMAIL REDACTED FOR PRIVACY\",\"type\":\"object truncated due to authorization\",\"description\":[\"Please query the RDDS service of the Registrar of Record identified in this output for information on how to contact the Registrant of the queried domain name.\"]}]},{\"objectClassName\":\"entity\",\"roles\":[\"technical\"],\"handle\":\"C636149-CNIC\",\"vcardArray\":[\"vcard\",[[\"version\",{},\"text\",\"4.0\"],[\"fn\",{},\"text\",\"\"]]],\"remarks\":[{\"title\":\"Data Policy\",\"type\":\"object truncated due to authorization\",\"description\":[\"Some of the data in this object has been removed.\"]},{\"title\":\"REDACTED FOR PRIVACY\",\"type\":\"object redacted due to authorization\",\"description\":[\"Some of the data in this object has been removed.\"]},{\"title\":\"EMAIL REDACTED FOR PRIVACY\",\"type\":\"object truncated due to authorization\",\"description\":[\"Please query the RDDS service of the Registrar of Record identified in this output for information on how to contact the Registrant of the queried domain name.\"]}]},{\"objectClassName\":\"entity\",\"handle\":\"H539\",\"roles\":[\"registrar\"],\"vcardArray\":[\"vcard\",[[\"version\",{},\"text\",\"4.0\"],[\"fn\",{},\"text\",\"NameCheap, Inc.\"]]],\"links\":[{\"title\":\"Authoritative URL for this resource\",\"rel\":\"self\",\"type\":\"application\\/rdap+json\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/rdap.registry.co\\/co\\/entity\\/H539\"},{\"title\":\"Registrar's Website\",\"rel\":\"about\",\"value\":null,\"href\":\"http:\\/\\/www.namecheap.com\"}],\"entities\":[{\"objectClassName\":\"entity\",\"handle\":\"not applicable\",\"roles\":[\"abuse\"],\"vcardArray\":[\"vcard\",[[\"version\",{},\"text\",\"4.0\"],[\"fn\",{},\"text\",\"Abuse Contact\"],[\"org\",{},\"text\",\"NameCheap, Inc.\"],[\"email\",{},\"text\",\"abuse@namecheap.com\"],[\"tel\",{\"type\":\"voice\"},\"uri\",\"tel:+1.9854014545\"]]]}],\"publicIds\":[{\"type\":\"IANA Registrar ID\",\"identifier\":\"1068\"}]}],\"redacted\":[{\"name\":{\"type\":\"Registrant Name\"},\"postPath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[0]=='fn')][3]\",\"pathLang\":\"jsonpath\",\"method\":\"emptyValue\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant Organization\"},\"postPath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[0]=='org')]\",\"pathLang\":\"jsonpath\",\"method\":\"removal\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant Street\"},\"postPath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[0]=='adr')][3][:3]\",\"pathLang\":\"jsonpath\",\"method\":\"emptyValue\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant City\"},\"postPath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[0]=='adr')][3][3]\",\"pathLang\":\"jsonpath\",\"method\":\"emptyValue\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant Postal Code\"},\"postPath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[0]=='adr')][3][5]\",\"pathLang\":\"jsonpath\",\"method\":\"emptyValue\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant Email\"},\"prePath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[0]=='email')]\",\"pathLang\":\"jsonpath\",\"method\":\"removal\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant Phone\"},\"prePath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[1].type=='voice')]\",\"pathLang\":\"jsonpath\",\"method\":\"removal\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Registrant Fax\"},\"prePath\":\"$.entities[?(@.roles[0]=='registrant')].vcardArray[1][?(@[1].type=='fax')]\",\"pathLang\":\"jsonpath\",\"method\":\"removal\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Tech Name\"},\"postPath\":\"$.entities[?(@.roles[0]=='technical')].vcardArray[1][?(@[0]=='fn')][3]\",\"pathLang\":\"jsonpath\",\"method\":\"emptyValue\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Tech Email\"},\"prePath\":\"$.entities[?(@.roles[0]=='technical')].vcardArray[1][?(@[0]=='email')]\",\"pathLang\":\"jsonpath\",\"method\":\"removal\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"type\":\"Tech Phone\"},\"prePath\":\"$.entities[?(@.roles[0]=='technical')].vcardArray[1][?(@[1].type=='voice')]\",\"pathLang\":\"jsonpath\",\"method\":\"removal\",\"reason\":{\"description\":\"Server policy\"}},{\"name\":{\"description\":\"Administrative Contact\"},\"prePath\":\"$.entities[?(@.roles[0]=='administrative')]\",\"method\":\"removal\",\"reason\":{\"description\":\"Refer to the technical contact\"}},{\"name\":{\"description\":\"Billing Contact\"},\"prePath\":\"$.entities[?(@.roles[0]=='billing')]\",\"method\":\"removal\",\"reason\":{\"description\":\"Refer to the registrant contact\"}}],\"status\":[\"client transfer prohibited\"],\"port43\":\"whois.nic.co\",\"events\":[{\"eventAction\":\"registration\",\"eventDate\":\"2010-07-20T17:59:53.0Z\"},{\"eventAction\":\"expiration\",\"eventDate\":\"2027-07-19T23:59:59.0Z\"},{\"eventAction\":\"last update of RDAP database\",\"eventDate\":\"2026-10-16T21:05:49.0Z\"},{\"eventAction\":\"last changed\",\"eventDate\":\"2026-07-02T18:07:41.0Z\"},{\"eventAction\":\"transfer\",\"eventDate\":\"2021-04-21T08:00:26.0Z\"}],\"notices\":[{\"title\":\"Status Codes\",\"description\":[\"For more information on domain status codes, please visit https:\\/\\/icann.org\\/epp\"],\"links\":[{\"title\":\"More information on domain status codes\",\"rel\":\"glossary\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/icann.org\\/epp\"}]},{\"title\":\"Terms of Use\",\"description\":[\"For more information on Whois status codes, please visit https:\\/\\/icann.org\\/epp\",\"\",\"The registration data available in this service is limited. Additional\",\"data may be available at https:\\/\\/lookup.icann.org\",\"\",\"The Whois and RDAP services are provided by CentralNic, and contain\",\"information pertaining to Internet domain names registered by our\",\"our customers. By using this service you are agreeing (1) not to use any\",\"information presented here for any purpose other than determining\",\"ownership of domain names, (2) not to store or reproduce this data in\",\"any way, (3) not to use any high-volume, automated, electronic processes\",\"to obtain data from this service. Abuse of this service is monitored and\",\"actions in contravention of these terms will result in being permanently\",\"blacklisted. All data is (c) CentralNic Ltd (https:\\/\\/www.centralnicregistry.com)\",\"\",\"Access to the Whois and RDAP services is rate limited.\"],\"links\":[{\"title\":\"Terms of Use\",\"rel\":\"terms-of-service\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/www.registry.co\\/\"}]},{\"title\":\"Data Policy\",\"type\":\"object truncated due to authorization\",\"description\":[\"The contact information for one or more entities associated with this domain has been redacted in accordance with the entity's disclosure preferences.\"]}],\"links\":[{\"title\":\"Authoritative URL for this resource\",\"rel\":\"self\",\"type\":\"application\\/rdap+json\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\"},{\"title\":\"RDAP Service Help\",\"rel\":\"help\",\"type\":\"text\\/html\",\"value\":\"https:\\/\\/rdap.registry.co\\/co\\/domain\\/namecheap.co\",\"href\":\"https:\\/\\/whois.nic.co\\/rdap\"}]}"
    }
  ]
}
```

</details>

Anything the registry doesn't publish is left out. Three fields appear only when they apply:

- `drop`: when an expired, redemption or pending-delete domain is expected to become available, e.g. `{ "at": "2026-10-23T08:08:05.000Z", "confidence": "high", "basis": "tld schedule" }` for teachi.xyz
- `premium: true`: an available name the registry sells at a premium price
- `error`: why the lookup failed: `code`, `message`, `server`, and `retryAfter` when the server sends one

#### state

| | |
| --- | --- |
| `registered` | Registered and not expired |
| `expired` | Past its expiry date, in the registrar's grace period |
| `redemption` | Deleted, but the owner can still restore it |
| `pendingDelete` | Can't be restored anymore; drops soon |
| `dropzone` | Deleted and held by the registry before release |
| `available` | Not registered |
| `reserved` | Reserved or blocked by the registry |
| `unknown` | The lookup failed; see `error.code`: `timeout`, `rate_limited`, `blocked`, `no_server`, `unparseable` or `network` |

## Using a proxy

```js
import { Duplex } from "node:stream";
import { SocksClient } from "socks";
import { lookup } from "whoray";

const connect = async (host, port) => {
  const { socket } = await SocksClient.createConnection({
    proxy: { host: "127.0.0.1", port: 1080, type: 5 },
    command: "connect",
    destination: { host, port },
  });
  return Duplex.toWeb(socket);
};

await lookup("example.de", { connect });
```

## CLI

```sh
npx whoray namecheap.co
npx whoray namecheap.co --json
```

## Issues

If a TLD comes back wrong, open an issue with the domain name.

## License

MIT
