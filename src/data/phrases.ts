export const firstLine: Record<"dropzone" | "premium" | "dpml", RegExp> = {
  dropzone: /Dropzone/,
  premium: /platinums@identity\.digital/,
  dpml: /DPML/,
};

export const revoked: RegExp = /Domain not renewed\. Being revoked/;

export const notFound: RegExp[] = [
  /\bno match\b/i,
  /\bnot found\b/i,
  /\bno data found\b/i,
  /\bno entries found\b/i,
  /\bno matching record\b/i,
  /\bno object found\b/i,
  /\bobject_not_found\b/i,
  /\bdoes not exist\b/i,
  /\bhas not been registered\b/i,
  /\bno information available about domain name\b/i,
  /\bno found\b/i,
  /\bnothing found\b/i,
  /\bno data was found\b/i,
  /\bis not registered\b/i,
  /\bstatus:\s*(available|free)\b/i,
  /\bis available for registration\b/i,
  /\bnincs talalat\b/i,
  /등록되어 있지 않습니다/,
];

export const reserved: RegExp[] = [
  /\bstatus:\s*reserved\b/i,
  /\bdomain is reserved\b/i,
  /\breserved by the registry\b/i,
  /^reserved domain name$/im,
  /\bnot available for registration\b/i,
];

export const notices: Record<"rateLimited" | "blocked" | "retired", RegExp[]> = {
  rateLimited: [
    /\brate ?limit exceeded\b/i,
    /\blimit exceeded\b/i,
    /\bexceeded the maximum\b/i,
    /\btoo many (queries|requests)\b/i,
    /\bquery rate\b/i,
    /\btry again later\b/i,
  ],
  blocked: [/\bnot permitted\b/i, /\baccess denied\b/i, /\bblacklisted\b/i],
  retired: [/\bwhois service has been retired\b/i, /\btld is not supported\b/i],
};
