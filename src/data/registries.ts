export interface Registry {
  id: string;
  name: string;
  textPattern?: RegExp;
  dropzone?: true;
  redemption: number;
  pendingDelete: number;
  tlds: string[];
}

const list = (tlds: string): string[] => tlds.trim().split(/\s+/);

export const registries: Registry[] = [
  {
    id: "icb.co.uk",
    name: "Internet Computer Bureau",
    dropzone: true,
    redemption: 45,
    pendingDelete: 15,
    tlds: list(`
      ac io sh
    `),
  },
  {
    id: "pir.org",
    name: "Public Interest Registry",
    dropzone: true,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      org
    `),
  },
  {
    id: "verisign",
    name: "Verisign Global Registry Services",
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      cc com edu name net web
    `),
  },
  {
    id: "registry.google",
    name: "Charleston Road Registry Inc",
    textPattern: /registry\.google/,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      ads android app boo cal channel chrome dad day dclk dev docs drive eat esq fly foo gbiz gle gmail
      goog google guge hangout here how ing map meet meme mov new nexus page phd play prod prof rsvp
      search soy xn--flw351e xn--q9jyb4c xn--qcka1pmc youtube zip
    `),
  },
  {
    id: "identity.digital",
    name: "Identity Digital",
    textPattern: /identity\.digital/,
    dropzone: true,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      academy accountants actor agency airforce apartments archi army associates attorney auction band
      bargains bet bike bingo bio black blue boutique broker builders business cab cafe camera camp
      capital cards care careers cash casino catering center chat cheap church city claims cleaning clinic
      clothing coach codes coffee community company computer condos construction consulting contact
      contractors cool coupons credit creditcard cruises dance dating deals degree delivery democrat
      dental dentist diamonds digital direct directory discount doctor dog domains education email energy
      engineer engineering enterprises equipment estate events exchange expert exposed express fail family
      fan farm finance financial fish fitness flights florist football forex forsale fund furniture futbol
      fyi gallery games gifts glass global gmbh gold golf graphics gratis green gripe group guide guru
      haus healthcare hockey holdings holiday hospital house immo immobilien industries info institute
      insure international investments irish jetzt jewelry juegos kaufen kim kitchen land lawyer lease
      legal lgbt life lighting limited limo live llc loans lotto ltd maison management market marketing
      markets mba media memorial mobi moda money mortgage movie navy network news ninja organic partners
      parts pet photography photos pictures pink pizza place plumbing plus poker pro productions promo
      properties pub recipes red rehab reise reisen rentals repair report republican restaurant reviews
      rip rocks run sale salon sarl school schule services shiksha shoes shopping show singles ski soccer
      social software solar solutions studio style supplies supply support surgery systems tax taxi team
      technology tennis theater tienda tips tires today tools tours town toys trading training travel
      university vacations ventures vet viajes video villas vin vision vote voto voyage watch watches wine
      works world wtf zone
    `),
  },
  {
    id: "godaddy-registry",
    name: "GoDaddy Registry",
    textPattern: /represent administrative and technical management of the TLD/,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      aaa aarp able abogado accountant adult aetna afl aig ally americanexpress americanfamily amex amfam
      amica analytics anz aramco athleta auspost axa banamex bank baseball basketball beer bible bid
      blackfriday booking boston buzz calvinklein caravan casa catholic cba cbn cbre chase chintai cisco
      citi club commbank compare cooking courses cpa cricket date dds dell design download dupont earth
      faith farmers fashion ferrero film fishing fit flickr flir ford fox frontier ftr gap garden gay
      george godaddy grainger grocery hbo health homegoods homesense horse hotels hsbc hyatt ibm ink
      insurance intuit ipiranga itau jmp jpmorgan kpmg krd lanxess latrobe law lifeinsurance lilly lincoln
      loan luxe marshalls mattel melbourne men menu merckmsd miami mint mlb moe monash moto msd nba
      netbank netflix neustar nfl nike nyc olayan olayangroup one open osaka party pfizer philips photo
      physio ping porn praxi pru prudential racing review rodeo rugby safety samsclub sandvik
      sandvikcoromant sas science seek select seven sex staples statefarm stream study sucks surf sydney
      tab taipei target tattoo tdk teva tjmaxx tjx tkmaxx trade vip vivo vodka voting walmart walter
      weather weatherchannel webcam wedding wiki williamhill win winners woodside work wtc xerox yoga
    `),
  },
  {
    id: "centralnic",
    name: "CentralNic",
    textPattern: /All data is \(c\) CentralNic Ltd/,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      allfinanz aquarelle art audio auto autos baby beauty best bmw boats bond box build cam car cars case
      ceo cfd christmas college cyou dealer deloitte dhl diet dvag fans flowers fresenius frl fun game
      gent guitars hair help homes host hosting icu inc jnj kfh kpn kred lat lidl llp lol london lpl
      lplfinancial luxury makeup mini mom monster motorcycles nokia online ooo pics pohl press protection
      qpon quest reit rent ruhr saarland sbs schwarz security sfr site skin smart space stc stcgroup
      storage store tech theatre tickets tui uno viva website wme xyz yachts zuerich
    `),
  },
  {
    id: "zdns",
    name: "ZDNS",
    textPattern: /Jiangsu bangning science & technology Co/,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      baidu citic icbc redstone ren sohu top unicom wang
    `),
  },
  {
    id: "gmo-registry",
    name: "GMO Registry Inc",
    textPattern: /All data is \(c\) GMO Registry/,
    redemption: 35,
    pendingDelete: 5,
    tlds: list(`
      bridgestone brother canon datsun dnp epson firestone fujitsu ggee gmo goldpoint goo hisamitsu
      hitachi honda hyundai infiniti jcb kddi kia komatsu kyoto lexus lotte mitsubishi nagoya nec nhk nico
      nissan okinawa otsuka panasonic playstation ricoh ryukyu sharp shop softbank sony suzuki tokyo toray
      toshiba toyota yodobashi yokohama
    `),
  },
  {
    id: "tucows",
    name: "Tucows Registry Services",
    textPattern: /Tucows Registry/,
    redemption: 34,
    pendingDelete: 5,
    tlds: list(`
      bar click cloud country creditunion diy feedback food forum gift hiphop hiv lifestyle link living
      locker love music observer pid property realty rest sexy trust vana yandex
    `),
  },
  {
    id: "nominet",
    name: "Nominet",
    textPattern: /nominet/,
    redemption: 35,
    pendingDelete: 35,
    tlds: list(`
      abbvie amazon audible author aws azure bbc bbva bing book bot broadway buy call career circle cymru
      deal desi fairwinds fast fire free gop got gucci hot hotmail ieee imdb jot joy kindle like locus med
      microsoft moi mtn now nowruz office omega pars pay pharmacy pin pioneer prime read realestate
      realtor room safe save secure shell shia silk sky skype smile spot swatch talk tci tunes tushu
      virgin wales wanggou wed windows wow xbox yamaxun you zappos uk
    `),
  },
  {
    id: "MinTIC",
    name: "MinTIC",
    redemption: 30,
    pendingDelete: 5,
    tlds: list(`
      co
    `),
  },
];
