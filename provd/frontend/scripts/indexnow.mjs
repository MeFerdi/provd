// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver and others) about every URL in the sitemaps of
// provd.tech and docs.provd.tech, so new and changed pages are crawled within minutes. Google doesn't use
// IndexNow; it reads the sitemaps submitted in Search Console. The key is public by design: it only proves
// the site owner sent the ping, and the matching file is served at /<key>.txt on both sites.
//   node scripts/indexnow.mjs
const KEY = "5d7e849e075e1845b0294f4369997639";
const SITES = ["https://provd.tech", "https://docs.provd.tech"];

async function urlsFrom(site) {
  const xml = await (await fetch(`${site}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

for (const site of SITES) {
  const urlList = await urlsFrom(site);
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList }),
  });
  console.log(`${site}: ${urlList.length} URLs submitted, IndexNow answered ${response.status}`);
}
