import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const query = searchParams.get("query");
  const id = searchParams.get("id");
  const page = searchParams.get("page") || "1";

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    if (action === "search" && query) {
      // Scrape HentaiFox search (Bypasses CF)
      const res = await fetch(`https://hentaifox.com/search/?q=${encodeURIComponent(query)}&page=${page}`, { headers });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const html = await res.text();
      
      const results = [];
      // Regex to extract gallery items
      const regex = /<div class="lc_galleries">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;
      const match = html.match(regex);
      
      if (match) {
        // HentaiFox uses data-src for lazy loaded images
        const itemRegex = /<div class="thumb"[^>]*>[\s\S]*?<a href="\/gallery\/(\d+)\/"><img.*?data-src="([^"]+)".*?<\/a>[\s\S]*?<h2 class="g_title"><a[^>]*>([^<]+)<\/a>/g;
        let m;
        while ((m = itemRegex.exec(match[1])) !== null) {
          results.push({
            id: m[1],
            title: { english: m[3] },
            cover_url: m[2],
            num_pages: 0
          });
        }
      }
      return NextResponse.json({ result: results });
    } 
    
    if (action === "get" && id) {
      // Scrape specific HentaiFox gallery
      const res = await fetch(`https://hentaifox.com/gallery/${encodeURIComponent(id)}/`, { headers });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const html = await res.text();

      // Extract load_id, load_dir, and pages
      const loadIdMatch = html.match(/id="load_id" value="([^"]+)"/);
      const loadDirMatch = html.match(/id="load_dir" value="([^"]+)"/);
      const pagesMatch = html.match(/Pages:\s*(\d+)<\/span>/);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const thumbMatch = html.match(/data-src="([^"]+)1t\.(jpg|png|gif|webp)"/);
      const gthMatch = html.match(/var g_th = \$\.parseJSON\('([^']+)'\)/);

      if (!loadIdMatch || !loadDirMatch || !pagesMatch) {
        throw new Error("Could not parse gallery details");
      }

      const mediaId = loadIdMatch[1];
      const loadDir = loadDirMatch[1];
      const numPages = parseInt(pagesMatch[1]);
      const title = titleMatch ? titleMatch[1].replace(" - HentaiFox", "") : "Manga";

      let baseUrl = `https://i3.hentaifox.com/${loadDir}/${mediaId}/`;
      if (thumbMatch) {
        baseUrl = thumbMatch[1];
      }

      let g_th: any = {};
      if (gthMatch) {
        try {
          g_th = JSON.parse(gthMatch[1]);
        } catch (e) {}
      }

      // Reconstruct image URLs based on exact JSON data
      const pages = [];
      for (let i = 1; i <= numPages; i++) {
        let ext = "jpg";
        if (g_th[i]) {
          const t = g_th[i].split(",")[0];
          if (t === "p") ext = "png";
          if (t === "g") ext = "gif";
          if (t === "w") ext = "webp";
        }
        
        pages.push({
          url: `${baseUrl}${i}.${ext}`
        });
      }

      return NextResponse.json({
        id: id,
        title: { english: title },
        images: { pages },
        num_pages: numPages
      });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error: any) {
    console.error("Manga API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}
